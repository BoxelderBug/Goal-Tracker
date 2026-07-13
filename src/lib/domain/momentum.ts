/**
 * Per-goal, per-week completion grid for the 3D momentum view. Pure: reuses the
 * same trailing-week windowing as computeWeeklyTrends, but keeps each goal
 * separate so the chart can plot a goal × week × completion landscape.
 */
import type { Entry, Goal, WeekStart } from "@/types/models";
import { addDays, getDateKey, normalizeDate, parseDateKey } from "./dates";
import { getWeekRange } from "./periods";
import { getTargetForPeriod } from "./targets";

export interface MomentumGrid {
  /** week-start keys, oldest → newest */
  weekKeys: string[];
  /** active goals in row order */
  goals: { id: string; name: string }[];
  /** [weekIndex, goalIndex, completionPercent] tuples for present cells */
  cells: [number, number, number][];
  /** largest completion value in the grid (for axis scaling) */
  maxValue: number;
}

export function computeMomentumGrid(
  goals: Goal[],
  entries: Entry[],
  weeks: number,
  weekStart: WeekStart,
  now: Date,
): MomentumGrid {
  const active = goals.filter((g) => !g.archived);

  const thisWeek = getWeekRange(now, weekStart);
  const ranges = Array.from({ length: weeks }, (_, i) => {
    const start = addDays(normalizeDate(thisWeek.start), -7 * (weeks - 1 - i));
    return getWeekRange(start, weekStart);
  });
  const keyOf = (r: { start: Date }) => getDateKey(r.start);
  const weekKeys = ranges.map(keyOf);
  const weekIndex = new Map(weekKeys.map((k, i) => [k, i]));

  const activeIds = new Set(active.map((g) => g.id));
  const perGoal = new Map<string, number>(); // `${weekKey}|${goalId}` -> sum
  for (const e of entries) {
    if (!e.trackerId || !e.date || !activeIds.has(e.trackerId)) continue;
    const wk = keyOf(getWeekRange(parseDateKey(e.date), weekStart));
    if (!weekIndex.has(wk)) continue;
    const gk = `${wk}|${e.trackerId}`;
    perGoal.set(gk, (perGoal.get(gk) ?? 0) + (Number(e.amount) || 0));
  }

  const cells: [number, number, number][] = [];
  let maxValue = 0;
  active.forEach((goal, gi) => {
    ranges.forEach((range, wi) => {
      const target = getTargetForPeriod(goal, "week", range, { weekStart });
      if (target <= 0) return;
      const progress = perGoal.get(`${weekKeys[wi]}|${goal.id}`) ?? 0;
      const completion = Math.round((progress / target) * 100);
      if (completion <= 0) return;
      maxValue = Math.max(maxValue, completion);
      cells.push([wi, gi, completion]);
    });
  });

  return {
    weekKeys,
    goals: active.map((g) => ({ id: g.id, name: g.name })),
    cells,
    maxValue,
  };
}
