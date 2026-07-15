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
