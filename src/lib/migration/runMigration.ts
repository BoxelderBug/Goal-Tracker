import { doc, getDoc, serverTimestamp, writeBatch } from "firebase/firestore";
import {
  getDb,
  LEGACY_BLOB_COLLECTION,
  PROFILE_COLLECTION,
  USERS_COLLECTION,
} from "@/lib/firebase/client";
import { userDocRef } from "@/lib/firebase/repos/userDoc";
import {
  PERIOD_GOAL_OVERRIDES,
  STRETCH_GOALS,
  getMetaMap,
  mergeMetaMap,
} from "@/lib/firebase/repos/meta";
import { tempPeriodGoalsRepo, vacationsRepo } from "@/lib/firebase/repos";
import { normalizeTempPeriodGoal, normalizeVacation } from "./normalize";
import { planMigration } from "./fromBlob";

export type MigrationStatus =
  | { state: "checking" }
  | { state: "migrating"; done: number; total: number }
  | { state: "ready" }
  | { state: "error"; message: string };

const BATCH_LIMIT = 450;

interface LegacyProfile {
  firstName?: string;
  lastName?: string;
  email?: string;
  username?: string;
  usernameKey?: string;
  createdAt?: string;
}

/**
 * One-time blob → subcollection migration, idempotent and safe to re-run.
 * The legacy blob is never modified; it stays as the rollback path. The
 * users/{uid}.migration.blobMigratedAt marker is written in the final batch,
 * so a crash mid-migration simply re-runs (deterministic ids overwrite).
 */
export async function runMigration(
  uid: string,
  onProgress?: (status: MigrationStatus) => void,
): Promise<void> {
  const userSnap = await getDoc(userDocRef(uid));
  const alreadyMigrated = Boolean(userSnap.data()?.migration?.blobMigratedAt);

  if (!alreadyMigrated) {
    const profileSnap = await getDoc(doc(getDb(), PROFILE_COLLECTION, uid));
    const profile = (profileSnap.data() ?? {}) as LegacyProfile;

    const blobSnap = await getDoc(doc(getDb(), LEGACY_BLOB_COLLECTION, uid));
    const blob = blobSnap.exists() ? blobSnap.data() : {};
    const sourceUpdatedAt = typeof blob.updatedAt === "string" ? blob.updatedAt : null;

    const plan = planMigration(blob);
    const total = plan.writes.length;
    onProgress?.({ state: "migrating", done: 0, total });

    // Chunk all entity writes; the final batch also carries the user doc +
    // migration marker so the marker only lands if the last writes succeed.
    const db = getDb();
    let done = 0;
    for (let i = 0; i < plan.writes.length; i += BATCH_LIMIT) {
      const slice = plan.writes.slice(i, i + BATCH_LIMIT);
      const isLast = i + BATCH_LIMIT >= plan.writes.length;
      const batch = writeBatch(db);
      for (const write of slice) {
        batch.set(doc(db, USERS_COLLECTION, uid, write.collection, write.id), write.data);
      }
      if (isLast) {
        batch.set(
          userDocRef(uid),
          {
            profile: {
              firstName: profile.firstName ?? "",
              lastName: profile.lastName ?? "",
              email: profile.email ?? "",
              username: profile.username ?? "",
              usernameKey: profile.usernameKey ?? "",
              createdAt: profile.createdAt ?? new Date().toISOString(),
            },
            settings: plan.settings,
            migration: {
              blobVersion: 1,
              blobMigratedAt: serverTimestamp(),
              sourceUpdatedAt,
            },
            createdAt: profile.createdAt ?? new Date().toISOString(),
          },
          { merge: true },
        );
      }
      await batch.commit();
      done += slice.length;
      onProgress?.({ state: "migrating", done, total });
    }

    // Edge case: an empty blob produces zero writes, so the marker batch above
    // never runs. Write the user doc + marker directly.
    if (plan.writes.length === 0) {
      const batch = writeBatch(db);
      batch.set(
        userDocRef(uid),
        {
          profile: {
            firstName: profile.firstName ?? "",
            lastName: profile.lastName ?? "",
            email: profile.email ?? "",
            username: profile.username ?? "",
            usernameKey: profile.usernameKey ?? "",
            createdAt: profile.createdAt ?? new Date().toISOString(),
          },
          settings: plan.settings,
          migration: { blobVersion: 1, blobMigratedAt: serverTimestamp(), sourceUpdatedAt },
          createdAt: profile.createdAt ?? new Date().toISOString(),
        },
        { merge: true },
      );
      await batch.commit();
    }
  }

  await migrateDeviceLocalData(uid);
  onProgress?.({ state: "ready" });
}

/**
 * Per-device pass for data the legacy app kept only in localStorage and never
 * synced (vacations, temp period goals, period-goal overrides, stretch goals).
 * Guarded by a per-uid local flag; maps are merge-written so a second device
 * contributes without clobbering the first.
 */
async function migrateDeviceLocalData(uid: string): Promise<void> {
  if (typeof window === "undefined") return;
  const flagKey = `gtMigratedLocal:${uid}`;
  if (localStorage.getItem(flagKey)) return;

  const readScoped = (base: string): unknown => {
    const raw = localStorage.getItem(`${base}:${uid}`);
    if (!raw) return null;
    try {
      return JSON.parse(raw);
    } catch {
      return null;
    }
  };

  try {
    const vacationsRaw = readScoped("goal-tracker-vacations-v1");
    if (Array.isArray(vacationsRaw)) {
      const vacations = vacationsRaw.map(normalizeVacation).filter((v) => v !== null);
      if (vacations.length) await vacationsRepo.setMany(uid, vacations);
    }

    const tempRaw = readScoped("goal-tracker-temp-period-goals-v1");
    if (Array.isArray(tempRaw)) {
      const temps = tempRaw.map(normalizeTempPeriodGoal).filter((t) => t !== null);
      if (temps.length) await tempPeriodGoalsRepo.setMany(uid, temps);
    }

    const overridesRaw = readScoped("goal-tracker-period-goal-overrides-v1");
    if (overridesRaw && typeof overridesRaw === "object" && !Array.isArray(overridesRaw)) {
      const existing = await getMetaMap(uid, PERIOD_GOAL_OVERRIDES);
      await mergeMetaMap(uid, PERIOD_GOAL_OVERRIDES, {
        ...existing,
        ...(overridesRaw as Record<string, number>),
      });
    }

    // Stretch goals were stored UNSCOPED in legacy (a cross-user leak). Only
    // migrate them when this device has exactly one known user, else skip.
    const stretchRaw = (() => {
      const raw = localStorage.getItem("goal-tracker-stretch-goals-v1");
      if (!raw) return null;
      try {
        return JSON.parse(raw);
      } catch {
        return null;
      }
    })();
    if (stretchRaw && typeof stretchRaw === "object" && !Array.isArray(stretchRaw)) {
      const knownUsers = readKnownUserIds();
      if (knownUsers.length === 1 && knownUsers[0] === uid) {
        const existing = await getMetaMap(uid, STRETCH_GOALS);
        await mergeMetaMap(uid, STRETCH_GOALS, {
          ...existing,
          ...(stretchRaw as Record<string, number>),
        });
      }
    }

    localStorage.setItem(flagKey, new Date().toISOString());
  } catch {
    // Device-local data is best-effort; failure here must not block app load.
  }
}

function readKnownUserIds(): string[] {
  try {
    const raw = localStorage.getItem("goal-tracker-users-v1");
    if (!raw) return [];
    const parsed = JSON.parse(raw);
    if (!Array.isArray(parsed)) return [];
    return parsed.map((u) => (u && typeof u.id === "string" ? u.id : "")).filter(Boolean);
  } catch {
    return [];
  }
}
