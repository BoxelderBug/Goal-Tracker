/**
 * Weekday fingerprint: where a goal's volume actually lands across the week.
 * Computed over the trailing N *completed* weeks (the current partial week is
 * excluded so future weekdays don't read artificially low). Pure.
 */
import type { Entry, WeekStart } from "@/types/models";
import { addDays, getDateKey, normalizeDate, parseDateKey } from "./dates";
import { getWeekRange } from "./periods";
import { addAmount } from "./numbers";
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

// ---------------------------------------------------------------------------
// Comeback odds: P(week ended hit | behind pace at end of day 4)
// ---------------------------------------------------------------------------

/** minimum behind-at-day-4 weeks before the rescue rate is claimed */
const MIN_BEHIND_WEEKS = 6;

export interface ComebackOdds {
  /** trailing full weeks that were behind pace at the end of day 4 */
  behindWeeks: number;
  /** …of which ended with the weekly target hit */
  rescuedWeeks: number;
  /** rescuedWeeks / behindWeeks, 0–100 */
  rescuePct: number;
}

/**
 * When this goal is behind pace midweek, how often does the week still end in
 * a hit? "Behind at day 4" uses the same straight-line projection as the
 * Thursday midweek check: (day-4 total / 4) × 7 < target. A low rescue rate
 * means a midweek warning is really a deadline. Same lookback guards as the
 * other week stats; hidden under MIN_BEHIND_WEEKS behind-weeks.
 */
export function computeComebackOdds(
  goal: TargetGoalLike & { createdAt?: string },
  entries: Entry[],
  weekStart: WeekStart,
  now: Date,
  /** first dateKey of the loaded entries window; weeks before it read falsely as zero */
  windowStartKey?: string,
): ComebackOdds | null {
  const totals = buildDailyTotals(entries);
  const currentWeek = getWeekRange(now, weekStart);
  const createdKey = goal.createdAt ? getDateKey(normalizeDate(new Date(goal.createdAt))) : null;

  let behindWeeks = 0;
  let rescuedWeeks = 0;
  for (let i = 1; i <= MAX_LOOKBACK_WEEKS; i += 1) {
    const week = getWeekRange(addDays(currentWeek.start, -7 * i), weekStart);
    if (windowStartKey && getDateKey(week.start) < windowStartKey) break;
    if (createdKey && createdKey > getDateKey(week.end)) break;
    const target = getTargetForPeriod(goal, "week", week, { weekStart });
    if (target <= 0) continue;
    const day4 = sumRange(totals, goal.id, { start: week.start, end: addDays(week.start, 3) });
    if ((day4 / 4) * 7 >= target) continue;
    behindWeeks += 1;
    if (sumRange(totals, goal.id, week) >= target) rescuedWeeks += 1;
  }
  if (behindWeeks < MIN_BEHIND_WEEKS) return null;

  return {
    behindWeeks,
    rescuedWeeks,
    rescuePct: Math.round((rescuedWeeks / behindWeeks) * 100),
  };
}

// ---------------------------------------------------------------------------
// Percent complete by day: the average shape of a week
// ---------------------------------------------------------------------------

/** minimum full weeks with a target before the curve is claimed */
const MIN_CURVE_WEEKS = 4;

export interface DayCompletion {
  /** JS getDay() index 0–6 (Sun=0) */
  dow: number;
  /** average cumulative % of the weekly target banked by the END of this day */
  avgPct: number;
  /** the even-split benchmark for this position in the week (14, 29, … 100) */
  pacePct: number;
}

export interface WeekCompletionCurve {
  /** ordered from the user's week start */
  days: DayCompletion[];
  weeks: number;
}

/**
 * The average shape of a week: cumulative % of the weekly target reached by
 * the end of each weekday, averaged over the trailing full weeks (current
 * partial week excluded; same lookback guards as the other week stats).
 * Read it against the even-split pace to see where weeks stall.
 */
export function computeWeekCompletionCurve(
  goal: TargetGoalLike & { createdAt?: string },
  entries: Entry[],
  weekStart: WeekStart,
  now: Date,
  /** first dateKey of the loaded entries window; weeks before it read falsely as zero */
  windowStartKey?: string,
): WeekCompletionCurve | null {
  const totals = buildDailyTotals(entries);
  const currentWeek = getWeekRange(now, weekStart);
  const createdKey = goal.createdAt ? getDateKey(normalizeDate(new Date(goal.createdAt))) : null;

  const sums = new Array<number>(7).fill(0);
  let weeks = 0;
  for (let i = 1; i <= MAX_LOOKBACK_WEEKS; i += 1) {
    const week = getWeekRange(addDays(currentWeek.start, -7 * i), weekStart);
    if (windowStartKey && getDateKey(week.start) < windowStartKey) break;
    if (createdKey && createdKey > getDateKey(week.end)) break;
    const target = getTargetForPeriod(goal, "week", week, { weekStart });
    if (target <= 0) continue;
    let cumulative = 0;
    for (let d = 0; d < 7; d += 1) {
      const day = addDays(week.start, d);
      cumulative = addAmount(cumulative, totals.get(`${goal.id}|${getDateKey(day)}`) ?? 0);
      sums[d] += (cumulative / target) * 100;
    }
    weeks += 1;
  }
  if (weeks < MIN_CURVE_WEEKS) return null;

  const firstDow = weekStart === "sunday" ? 0 : 1;
  return {
    days: Array.from({ length: 7 }, (_, d) => ({
      dow: (firstDow + d) % 7,
      avgPct: Math.round(sums[d] / weeks),
      pacePct: Math.round(((d + 1) / 7) * 100),
    })),
    weeks,
  };
}

// ---------------------------------------------------------------------------
// Show-up odds: P(week hit | logged anything on a given weekday)
// ---------------------------------------------------------------------------

/** minimum full weeks with a target before the card shows at all */
const MIN_ODDS_WEEKS = 6;
/** minimum weeks a weekday was logged before its conditional rate is claimed */
const MIN_ODDS_DAY_WEEKS = 4;

export interface ShowUpDayOdds {
  /** JS getDay() index 0–6 (Sun=0) */
  dow: number;
  /** weeks where this weekday had a >0 total for the goal */
  loggedWeeks: number;
  /** % of those weeks that hit the weekly target; null under the sample gate */
  hitRatePct: number | null;
}

export interface ShowUpOdds {
  /** ordered from the user's week start */
  days: ShowUpDayOdds[];
  /** full weeks considered (had a weekly target) */
  weeks: number;
  /** hit rate across all considered weeks, for the baseline */
  overallHitRatePct: number;
}

/**
 * For each weekday: of the trailing full weeks where the user logged anything
 * (>0) on that day, how many ended with the weekly target hit. Days that beat
 * the overall hit rate are the ones worth protecting. Same lookback guards as
 * {@link computeWinningWeekFingerprint}; N/A entries carry amount 0 so they
 * don't count as showing up.
 */
export function computeShowUpOdds(
  goal: TargetGoalLike & { createdAt?: string },
  entries: Entry[],
  weekStart: WeekStart,
  now: Date,
  /** first dateKey of the loaded entries window; weeks before it read falsely as zero */
  windowStartKey?: string,
): ShowUpOdds | null {
  const totals = buildDailyTotals(entries);
  const currentWeek = getWeekRange(now, weekStart);
  const createdKey = goal.createdAt ? getDateKey(normalizeDate(new Date(goal.createdAt))) : null;

  const weeks: { hit: boolean; loggedDows: Set<number> }[] = [];
  for (let i = 1; i <= MAX_LOOKBACK_WEEKS; i += 1) {
    const week = getWeekRange(addDays(currentWeek.start, -7 * i), weekStart);
    if (windowStartKey && getDateKey(week.start) < windowStartKey) break;
    if (createdKey && createdKey > getDateKey(week.end)) break;
    const target = getTargetForPeriod(goal, "week", week, { weekStart });
    if (target <= 0) continue;
    const loggedDows = new Set<number>();
    let total = 0;
    for (let d = 0; d < 7; d += 1) {
      const day = addDays(week.start, d);
      const amount = totals.get(`${goal.id}|${getDateKey(day)}`) ?? 0;
      total = addAmount(total, amount);
      if (amount > 0) loggedDows.add(day.getDay());
    }
    weeks.push({ hit: total >= target, loggedDows });
  }
  if (weeks.length < MIN_ODDS_WEEKS) return null;

  const firstDow = weekStart === "sunday" ? 0 : 1;
  const days: ShowUpDayOdds[] = Array.from({ length: 7 }, (_, i) => {
    const dow = (firstDow + i) % 7;
    const logged = weeks.filter((w) => w.loggedDows.has(dow));
    return {
      dow,
      loggedWeeks: logged.length,
      hitRatePct:
        logged.length >= MIN_ODDS_DAY_WEEKS
          ? Math.round((logged.filter((w) => w.hit).length / logged.length) * 100)
          : null,
    };
  });

  return {
    days,
    weeks: weeks.length,
    overallHitRatePct: Math.round((weeks.filter((w) => w.hit).length / weeks.length) * 100),
  };
}
