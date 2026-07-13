/**
 * Per-goal personal records (best day / best week) for the Trends page.
 * Values stay in the goal's own unit — cross-goal sums of mixed units aren't
 * meaningful. Pure: no Firebase/React imports.
 */
import type { Entry, Goal, WeekStart } from "@/types/models";
import { getDateKey, parseDateKey } from "./dates";
import { getWeekRange } from "./periods";

export interface GoalRecords {
  goalId: string;
  bestDay: { date: string; amount: number } | null;
  bestWeek: { weekStartKey: string; amount: number } | null;
}

const round2 = (n: number) => Math.round(n * 100) / 100;

export function computeGoalRecords(goals: Goal[], entries: Entry[], weekStart: WeekStart): GoalRecords[] {
  const active = goals.filter((g) => !g.archived);
  const activeIds = new Set(active.map((g) => g.id));

  // Single pass: per-goal per-day and per-goal per-week totals.
  const byDay = new Map<string, number>(); // `${goalId}|${date}`
  const byWeek = new Map<string, number>(); // `${goalId}|${weekStartKey}`
  for (const e of entries) {
    if (!e.trackerId || !e.date || e.notApplicable || !activeIds.has(e.trackerId)) continue;
    const amt = Number(e.amount) || 0;
    if (amt <= 0) continue;
    const dayKey = `${e.trackerId}|${e.date}`;
    byDay.set(dayKey, (byDay.get(dayKey) ?? 0) + amt);
    const wk = getDateKey(getWeekRange(parseDateKey(e.date), weekStart).start);
    const weekKey = `${e.trackerId}|${wk}`;
    byWeek.set(weekKey, (byWeek.get(weekKey) ?? 0) + amt);
  }

  const best = (map: Map<string, number>, goalId: string): { key: string; amount: number } | null => {
    let out: { key: string; amount: number } | null = null;
    for (const [k, v] of map) {
      const [gid, key] = [k.slice(0, k.indexOf("|")), k.slice(k.indexOf("|") + 1)];
      if (gid !== goalId) continue;
      // ties go to the more recent date — feels right for "records"
      if (!out || v > out.amount || (v === out.amount && key > out.key)) out = { key, amount: v };
    }
    return out;
  };

  return active.map((g) => {
    const day = best(byDay, g.id);
    const week = best(byWeek, g.id);
    return {
      goalId: g.id,
      bestDay: day ? { date: day.key, amount: round2(day.amount) } : null,
      bestWeek: week ? { weekStartKey: week.key, amount: round2(week.amount) } : null,
    };
  });
}
