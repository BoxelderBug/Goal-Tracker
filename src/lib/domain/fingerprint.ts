/**
 * Weekday fingerprint: where a goal's volume actually lands across the week.
 * Computed over the trailing N *completed* weeks (the current partial week is
 * excluded so future weekdays don't read artificially low). Pure.
 */
import type { Entry, WeekStart } from "@/types/models";
import { addDays, getDateKey, normalizeDate, parseDateKey } from "./dates";
import { getWeekRange } from "./periods";
import { buildDailyTotals, sumRange } from "./progress";
import { getTargetForPeriod, type TargetGoalLike } from "./targets";

export interface WeekdayStat {
  /** JS getDay() index 0–6 (Sun=0) */
  dow: number;
  /** share of the window's total volume landing on this weekday, 0–100 */
  sharePct: number;
  /** average amount per occurrence of this weekday (zero days included) */
  avg: number;
}

export interface WeekdayFingerprint {
  /** ordered from the user's week start */
  days: WeekdayStat[];
  /** total volume in the window; 0 means nothing to show */
  total: number;
  weeks: number;
}

const round2 = (n: number) => Math.round(n * 100) / 100;

export function computeWeekdayFingerprint(
  goalId: string,
  entries: Entry[],
  weeks: number,
  weekStart: WeekStart,
  now: Date,
): WeekdayFingerprint {
  // Window = the N full weeks before the current week.
  const currentWeek = getWeekRange(now, weekStart);
  const start = addDays(normalizeDate(currentWeek.start), -7 * weeks);
  const startKey = getDateKey(start);
  const endKey = getDateKey(addDays(currentWeek.start, -1));

  const byDow = new Array<number>(7).fill(0);
  let total = 0;
  for (const e of entries) {
    if (e.trackerId !== goalId || e.notApplicable) continue;
    if (e.date < startKey || e.date > endKey) continue;
    const amt = Number(e.amount) || 0;
    if (amt <= 0) continue;
    byDow[parseDateKey(e.date).getDay()] += amt;
    total += amt;
  }

  const firstDow = weekStart === "sunday" ? 0 : 1;
  const days: WeekdayStat[] = Array.from({ length: 7 }, (_, i) => {
    const dow = (firstDow + i) % 7;
    return {
      dow,
      sharePct: total > 0 ? Math.round((byDow[dow] / total) * 100) : 0,
      avg: round2(byDow[dow] / weeks),
    };
  });

  return { days, total: round2(total), weeks };
}

// ---------------------------------------------------------------------------
// Winning-week fingerprint: hit weeks are won early
// ---------------------------------------------------------------------------

/** minimum weeks on EACH side (hit and miss) before the comparison is claimed */
const MIN_GROUP_WEEKS = 4;
const MAX_LOOKBACK_WEEKS = 26;

export interface WinningWeekFingerprint {
  hitWeeks: number;
  missWeeks: number;
  /** average % of the weekly target reached by end of day 3, in hit weeks */
  hitDay3Pct: number;
  /** …and in miss weeks */
  missDay3Pct: number;
}

/**
 * The front-load signal: in weeks where the target was hit, how much of it was
 * already banked by the end of day 3 — versus weeks that missed. Looks over
 * the trailing full weeks (current partial week excluded), only weeks fully
 * inside the loaded entries window and after the goal existed. Returns null
 * until there are ≥ MIN_GROUP_WEEKS hit AND miss weeks — no claim without a
 * real sample.
 */
export function computeWinningWeekFingerprint(
  goal: TargetGoalLike & { createdAt?: string },
  entries: Entry[],
  weekStart: WeekStart,
  now: Date,
  /** first dateKey of the loaded entries window; weeks before it read falsely as zero */
  windowStartKey?: string,
): WinningWeekFingerprint | null {
  const totals = buildDailyTotals(entries);
  const currentWeek = getWeekRange(now, weekStart);
  const createdKey = goal.createdAt ? getDateKey(normalizeDate(new Date(goal.createdAt))) : null;

  const hitPcts: number[] = [];
  const missPcts: number[] = [];
  for (let i = 1; i <= MAX_LOOKBACK_WEEKS; i += 1) {
    const week = getWeekRange(addDays(currentWeek.start, -7 * i), weekStart);
    const weekStartKey = getDateKey(week.start);
    if (windowStartKey && weekStartKey < windowStartKey) break;
    if (createdKey && createdKey > getDateKey(week.end)) break;
    const target = getTargetForPeriod(goal, "week", week, { weekStart });
    if (target <= 0) continue;
    const total = sumRange(totals, goal.id, week);
    const day3 = sumRange(totals, goal.id, { start: week.start, end: addDays(week.start, 2) });
    const day3Pct = (day3 / target) * 100;
    (total >= target ? hitPcts : missPcts).push(day3Pct);
  }

  if (hitPcts.length < MIN_GROUP_WEEKS || missPcts.length < MIN_GROUP_WEEKS) return null;
  const avg = (list: number[]) => Math.round(list.reduce((a, b) => a + b, 0) / list.length);
  return {
    hitWeeks: hitPcts.length,
    missWeeks: missPcts.length,
    hitDay3Pct: avg(hitPcts),
    missDay3Pct: avg(missPcts),
  };
}
