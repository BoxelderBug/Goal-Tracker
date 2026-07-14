/**
 * Weekday fingerprint: where a goal's volume actually lands across the week.
 * Computed over the trailing N *completed* weeks (the current partial week is
 * excluded so future weekdays don't read artificially low). Pure.
 */
import type { Entry, WeekStart } from "@/types/models";
import { addDays, getDateKey, normalizeDate, parseDateKey } from "./dates";
import { getWeekRange } from "./periods";

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
