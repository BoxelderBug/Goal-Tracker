/**
 * Pure blob → subcollection migration planner. Consumes either the legacy
 * cloud blob (goalTrackerData/{uid}, buildCloudPayload ~13755) or the app's
 * JSON backup export (exportAllDataToJson ~14555 — a subset of the blob).
 *
 * Every write reuses the entity's existing id as the document id, so running
 * the migration twice (crash, second device) is an idempotent overwrite.
 * The blob itself is never modified — it stays as the rollback path.
 */
import type { Settings } from "@/types/models";
import { getDateKey, normalizeDate } from "@/lib/domain/dates";
import {
  normalizeCheckIn,
  normalizeCheckInEntry,
  normalizeEntry,
  normalizeFriend,
  normalizeGoal,
  normalizeIdeaEntry,
  normalizeJournalEntry,
  normalizePointTransaction,
  normalizeReward,
  normalizeRewardPurchase,
  normalizeSchedule,
  normalizeSettings,
  normalizeSnapshot,
  normalizeSquad,
  normalizeTrashItem,
  type NormalizeCtx,
} from "./normalize";

export interface PlannedWrite {
  /** subcollection name under users/{uid} */
  collection: string;
  /** document id (reused from the source entity) */
  id: string;
  data: Record<string, unknown>;
}

export interface MigrationPlan {
  settings: Settings;
  writes: PlannedWrite[];
  /** per-collection counts of planned docs */
  counts: Record<string, number>;
  /** items that were dropped or repaired, for the dry-run report */
  warnings: string[];
}

const TRASH_CAP = 120;

interface CollectionSpec {
  collection: string;
  blobKey: string;
  normalize: (raw: unknown, ctx: NormalizeCtx) => { id: string } | null;
}

const SPECS: CollectionSpec[] = [
  { collection: "goals", blobKey: "trackers", normalize: normalizeGoal },
  { collection: "entries", blobKey: "entries", normalize: normalizeEntry },
  { collection: "checkIns", blobKey: "checkIns", normalize: (raw) => normalizeCheckIn(raw) },
  { collection: "checkInEntries", blobKey: "checkInEntries", normalize: normalizeCheckInEntry },
  { collection: "journal", blobKey: "goalJournalEntries", normalize: normalizeJournalEntry },
  { collection: "ideas", blobKey: "ideaEntries", normalize: normalizeIdeaEntry },
  { collection: "schedules", blobKey: "schedules", normalize: normalizeSchedule },
  { collection: "snapshots", blobKey: "periodSnapshots", normalize: normalizeSnapshot },
  { collection: "friends", blobKey: "friends", normalize: normalizeFriend },
  { collection: "squads", blobKey: "squads", normalize: normalizeSquad },
  { collection: "trash", blobKey: "deletedItems", normalize: normalizeTrashItem },
  { collection: "rewards", blobKey: "rewards", normalize: normalizeReward },
  { collection: "rewardPurchases", blobKey: "rewardPurchases", normalize: normalizeRewardPurchase },
  { collection: "pointTransactions", blobKey: "pointTransactions", normalize: normalizePointTransaction },
];

export function planMigration(blob: unknown, now: Date = new Date()): MigrationPlan {
  const source = blob && typeof blob === "object" ? (blob as Record<string, unknown>) : {};
  const ctx: NormalizeCtx = {
    todayKey: getDateKey(normalizeDate(now)),
    nowIso: now.toISOString(),
  };
  const writes: PlannedWrite[] = [];
  const counts: Record<string, number> = {};
  const warnings: string[] = [];

  for (const spec of SPECS) {
    const rawList = source[spec.blobKey];
    const list = Array.isArray(rawList) ? rawList : [];
    if (rawList !== undefined && !Array.isArray(rawList)) {
      warnings.push(`${spec.blobKey}: expected an array, got ${typeof rawList} — skipped`);
    }
    let kept = 0;
    const seenIds = new Set<string>();
    let items = list;
    if (spec.collection === "trash" && list.length > TRASH_CAP) {
      warnings.push(`trash: ${list.length} items exceeds cap ${TRASH_CAP} — keeping the newest ${TRASH_CAP}`);
      items = list.slice(0, TRASH_CAP);
    }
    for (const raw of items) {
      const normalized = spec.normalize(raw, ctx);
      if (!normalized) {
        warnings.push(`${spec.blobKey}: dropped an item that failed validation`);
        continue;
      }
      if (seenIds.has(normalized.id)) {
        warnings.push(`${spec.blobKey}: duplicate id ${normalized.id} — later item overwrites earlier`);
      }
      seenIds.add(normalized.id);
      writes.push({
        collection: spec.collection,
        id: normalized.id,
        data: normalized as unknown as Record<string, unknown>,
      });
      kept += 1;
    }
    counts[spec.collection] = kept;
  }

  return {
    settings: normalizeSettings(source.settings),
    writes,
    counts,
    warnings,
  };
}
