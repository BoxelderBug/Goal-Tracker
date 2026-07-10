/**
 * Weekly trend aggregation for /trends. Pure: given active goals + entries,
 * produce one point per week over the trailing window with hit-rate, volume,
 * and consistency. No Firebase/React imports.
 */
import type { Entry, Goal, WeekStart } from "@/types/models";
import { addDays, getDateKey, normalizeDate, parseDateKey } from "./dates";
import { getWeekRange } from "./periods";
import { getTargetForPeriod } from "./targets";

export interface WeekTrendPoint {
  weekStartKey: string;
  goalsHit: number;
  goalsTotal: number;
  /** % of goals that hit their weekly target (0–100) */
  hitRate: number;
  /** total amount logged across all goals that week */
  volume: number;
  /** % of goals with at least one entry that week (0–100) */
  consistency: number;
}

export function computeWeeklyTrends(
  goals: Goal[],
  entries: Entry[],
  weeks: number,
  weekStart: WeekStart,
  now: Date,
): WeekTrendPoint[] {
  const active = goals.filter((g) => !g.archived);
  const goalsTotal = active.length;

  // Trailing window of week ranges, oldest → newest.
  const thisWeek = getWeekRange(now, weekStart);
  const ranges = Array.from({ length: weeks }, (_, i) => {
    const start = addDays(normalizeDate(thisWeek.start), -7 * (weeks - 1 - i));
    return getWeekRange(start, weekStart);
  });
  const keyOf = (r: { start: Date }) => getDateKey(r.start);
  const windowKeys = new Set(ranges.map(keyOf));

  // Single pass over entries → per-week volume, per-week goal presence, and
  // per-week per-goal totals (for hit calc).
  const volume = new Map<string, number>();
  const present = new Map<string, Set<string>>();
  const perGoal = new Map<string, number>(); // `${weekKey}|${goalId}` -> sum
  const activeIds = new Set(active.map((g) => g.id));

  for (const e of entries) {
    if (!e.trackerId || !e.date || !activeIds.has(e.trackerId)) continue;
    const wk = keyOf(getWeekRange(parseDateKey(e.date), weekStart));
    if (!windowKeys.has(wk)) continue;
    const amt = Number(e.amount) || 0;
    volume.set(wk, (volume.get(wk) ?? 0) + amt);
    if (!present.has(wk)) present.set(wk, new Set());
    present.get(wk)!.add(e.trackerId);
    const gk = `${wk}|${e.trackerId}`;
    perGoal.set(gk, (perGoal.get(gk) ?? 0) + amt);
  }

  return ranges.map((range) => {
    const wk = keyOf(range);
    let goalsHit = 0;
    for (const goal of active) {
      const progress = perGoal.get(`${wk}|${goal.id}`) ?? 0;
      const target = getTargetForPeriod(goal, "week", range, { weekStart });
      if (target > 0 && progress >= target) goalsHit += 1;
    }
    const seen = present.get(wk)?.size ?? 0;
    return {
      weekStartKey: wk,
      goalsHit,
      goalsTotal,
      hitRate: goalsTotal > 0 ? Math.round((goalsHit / goalsTotal) * 100) : 0,
      volume: Math.round((volume.get(wk) ?? 0) * 100) / 100,
      consistency: goalsTotal > 0 ? Math.round((seen / goalsTotal) * 100) : 0,
    };
  });
}
