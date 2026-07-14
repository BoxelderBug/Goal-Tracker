/**
 * Schedule-vs-reality stats for the Insights tab. Pure: no Firebase/React.
 *
 * "Scheduled" looks at a trailing 28-day + upcoming 7-day window so both
 * habits and plans count. Follow-through joins past blocks against entries
 * (same goal, same date) — the question schedule data exists to answer.
 */
import type { Entry, Goal, ScheduleBlock } from "@/types/models";
import { addDays, getDateKey, normalizeDate } from "./dates";

export interface ScheduleInsights {
  activeGoalCount: number;
  /** active goals with ≥1 block in the window */
  scheduledGoalCount: number;
  /** 0–100; 0 when there are no active goals */
  scheduledPct: number;
  /** active goals with no blocks in the window (schedule these next) */
  unscheduledGoals: { id: string; name: string }[];
  /** past blocks in the window */
  pastBlockCount: number;
  /** past blocks with a matching entry (same goal, same date) */
  keptBlockCount: number;
  /** 0–100, or null when there are no past blocks to judge */
  keptPct: number | null;
}

export function computeScheduleInsights(
  goals: Goal[],
  blocks: ScheduleBlock[],
  entries: Entry[],
  now: Date,
): ScheduleInsights {
  const active = goals.filter((g) => !g.archived);
  const activeIds = new Set(active.map((g) => g.id));
  const today = getDateKey(normalizeDate(now));
  const windowStart = getDateKey(addDays(normalizeDate(now), -28));
  const windowEnd = getDateKey(addDays(normalizeDate(now), 7));

  const inWindow = blocks.filter(
    (b) => b.trackerId && activeIds.has(b.trackerId) && b.date >= windowStart && b.date <= windowEnd,
  );

  const scheduledIds = new Set(inWindow.map((b) => b.trackerId));
  const unscheduledGoals = active
    .filter((g) => !scheduledIds.has(g.id))
    .map((g) => ({ id: g.id, name: g.name }));

  // Follow-through: past blocks joined against entries on goal+date.
  const entryDays = new Set(entries.map((e) => `${e.trackerId}|${e.date}`));
  const past = inWindow.filter((b) => b.date < today);
  const kept = past.filter((b) => entryDays.has(`${b.trackerId}|${b.date}`));

  return {
    activeGoalCount: active.length,
    scheduledGoalCount: scheduledIds.size,
    scheduledPct: active.length > 0 ? Math.round((scheduledIds.size / active.length) * 100) : 0,
    unscheduledGoals,
    pastBlockCount: past.length,
    keptBlockCount: kept.length,
    keptPct: past.length > 0 ? Math.round((kept.length / past.length) * 100) : null,
  };
}

// ---------------------------------------------------------------------------
// Proven logging window
// ---------------------------------------------------------------------------

const LOGGING_WINDOW_DAYS = 56;
/** minimum recent entries before the modal band means anything */
const MIN_WINDOW_ENTRIES = 10;
/** minimum past blocks on EACH side before the keep-rate split is claimed */
const MIN_SPLIT_BLOCKS = 5;

export interface LoggingWindowInsight {
  /** local start hour of the modal 2-hour band (0, 2, … 22) */
  bandStartHour: number;
  /** recent own entries with a usable createdAt */
  entryCount: number;
  bandEntryCount: number;
  /** share of recent logging that lands in the band, 0–100 */
  bandSharePct: number;
  /** keep-rate split for past blocks overlapping the band vs not; null until
   *  both sides clear MIN_SPLIT_BLOCKS */
  split: {
    inWindowBlocks: number;
    inWindowKeptPct: number;
    outWindowBlocks: number;
    outWindowKeptPct: number;
  } | null;
}

const parseHhMm = (value: string): number | null => {
  const m = /^(\d{1,2}):(\d{2})$/.exec(value ?? "");
  if (!m) return null;
  const hours = Number(m[1]) + Number(m[2]) / 60;
  return hours >= 0 && hours < 24 ? hours : null;
};

/**
 * The 2-hour local-time band where the user actually logs (modal createdAt
 * band over the trailing 8 weeks), crossed with schedule follow-through:
 * keep-rate of past blocks that overlap the band vs those that don't. The
 * actionable move: put blocks where the logging habit already lives.
 * Partner-authored entries are excluded — they're someone else's clock.
 */
export function computeLoggingWindow(
  entries: Entry[],
  blocks: ScheduleBlock[],
  now: Date,
): LoggingWindowInsight | null {
  const windowStartMs = now.getTime() - LOGGING_WINDOW_DAYS * 24 * 60 * 60 * 1000;

  const bandCounts = new Array<number>(12).fill(0);
  let entryCount = 0;
  for (const e of entries) {
    if (e.shareId) continue;
    const created = new Date(e.createdAt).getTime();
    if (!Number.isFinite(created) || created < windowStartMs || created > now.getTime()) continue;
    bandCounts[Math.floor(new Date(created).getHours() / 2)] += 1;
    entryCount += 1;
  }
  if (entryCount < MIN_WINDOW_ENTRIES) return null;

  let band = 0;
  for (let i = 1; i < bandCounts.length; i += 1) {
    if (bandCounts[i] > bandCounts[band]) band = i;
  }
  const bandStartHour = band * 2;

  // Past blocks in the same trailing window, kept = an entry for that
  // goal+date exists (same join as computeScheduleInsights).
  const today = getDateKey(normalizeDate(now));
  const windowStartKey = getDateKey(addDays(normalizeDate(now), -LOGGING_WINDOW_DAYS));
  const entryDays = new Set(entries.map((e) => `${e.trackerId}|${e.date}`));
  let inBlocks = 0, inKept = 0, outBlocks = 0, outKept = 0;
  for (const b of blocks) {
    if (b.date < windowStartKey || b.date >= today) continue;
    const start = parseHhMm(b.startTime);
    if (start === null) continue;
    let end = parseHhMm(b.endTime) ?? start + 1;
    if (end <= start) end = start + 1;
    const overlaps = start < bandStartHour + 2 && end > bandStartHour;
    const kept = entryDays.has(`${b.trackerId}|${b.date}`);
    if (overlaps) {
      inBlocks += 1;
      if (kept) inKept += 1;
    } else {
      outBlocks += 1;
      if (kept) outKept += 1;
    }
  }

  return {
    bandStartHour,
    entryCount,
    bandEntryCount: bandCounts[band],
    bandSharePct: Math.round((bandCounts[band] / entryCount) * 100),
    split:
      inBlocks >= MIN_SPLIT_BLOCKS && outBlocks >= MIN_SPLIT_BLOCKS
        ? {
            inWindowBlocks: inBlocks,
            inWindowKeptPct: Math.round((inKept / inBlocks) * 100),
            outWindowBlocks: outBlocks,
            outWindowKeptPct: Math.round((outKept / outBlocks) * 100),
          }
        : null,
  };
}
