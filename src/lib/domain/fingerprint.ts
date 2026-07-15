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
// Hit signals: P(week hit | logged a given goal on a given weekday)
// ---------------------------------------------------------------------------

/** minimum full weeks with a target before signals are computed at all */
const MIN_SIGNAL_WEEKS = 6;
/** minimum weeks a goal×day combo was logged before its rate is claimed */
const MIN_SIGNAL_COMBO_WEEKS = 4;
/** minimum weeks WITHOUT the combo, so the lift has a real comparison group */
const MIN_SIGNAL_CONTRAST_WEEKS = 2;
/** only combos at least this many points off the baseline are reported */
const MIN_SIGNAL_LIFT = 10;
const MAX_SIGNALS = 6;

export interface HitSignal {
  /** the predictor goal that was logged (>0) on this weekday */
  goalId: string;
  /** JS getDay() index 0–6 (Sun=0) */
  dow: number;
  /** weeks where the combo happened */
  loggedWeeks: number;
  /** % of those weeks that hit the target goal's weekly target */
  hitRatePct: number;
  /** hitRatePct − overall hit rate, in percentage points */
  liftPct: number;
}

export interface HitSignals {
  /** full weeks considered (had a weekly target) */
  weeks: number;
  /** hit rate across all considered weeks, for the baseline */
  overallHitRatePct: number;
  /** gated goal×weekday combos, strongest |lift| first */
  signals: HitSignal[];
}

/**
 * For each (predictor goal, weekday) combo: of the trailing full weeks where
 * that goal was logged (>0) on that weekday, how often did the TARGET goal's
 * week end in a hit — versus its overall hit rate. The predictor set usually
 * includes the target itself, so same-goal show-up effects surface alongside
 * cross-goal ones. Same lookback guards as
 * {@link computeWinningWeekFingerprint}; N/A entries carry amount 0 so they
 * don't count as showing up. Combos are only claimed with
 * ≥ MIN_SIGNAL_COMBO_WEEKS logged weeks, ≥ MIN_SIGNAL_CONTRAST_WEEKS weeks
 * without the combo, and a lift of at least MIN_SIGNAL_LIFT points.
 */
export function computeHitSignals(
  target: TargetGoalLike & { createdAt?: string },
  predictorGoalIds: string[],
  entries: Entry[],
  weekStart: WeekStart,
  now: Date,
  /** first dateKey of the loaded entries window; weeks before it read falsely as zero */
  windowStartKey?: string,
): HitSignals | null {
  const totals = buildDailyTotals(entries);
  const currentWeek = getWeekRange(now, weekStart);
  const createdKey = target.createdAt ? getDateKey(normalizeDate(new Date(target.createdAt))) : null;

  const weeks: { hit: boolean; logged: Set<string> }[] = [];
  for (let i = 1; i <= MAX_LOOKBACK_WEEKS; i += 1) {
    const week = getWeekRange(addDays(currentWeek.start, -7 * i), weekStart);
    if (windowStartKey && getDateKey(week.start) < windowStartKey) break;
    if (createdKey && createdKey > getDateKey(week.end)) break;
    const weekTarget = getTargetForPeriod(target, "week", week, { weekStart });
    if (weekTarget <= 0) continue;
    const logged = new Set<string>();
    let total = 0;
    for (let d = 0; d < 7; d += 1) {
      const day = addDays(week.start, d);
      const dayKey = getDateKey(day);
      total = addAmount(total, totals.get(`${target.id}|${dayKey}`) ?? 0);
      for (const goalId of predictorGoalIds) {
        if ((totals.get(`${goalId}|${dayKey}`) ?? 0) > 0) logged.add(`${goalId}|${day.getDay()}`);
      }
    }
    weeks.push({ hit: total >= weekTarget, logged });
  }
  if (weeks.length < MIN_SIGNAL_WEEKS) return null;

  const overallHitRatePct = Math.round((weeks.filter((w) => w.hit).length / weeks.length) * 100);

  const counts = new Map<string, { logged: number; hits: number }>();
  for (const week of weeks) {
    for (const combo of week.logged) {
      const c = counts.get(combo) ?? { logged: 0, hits: 0 };
      c.logged += 1;
      if (week.hit) c.hits += 1;
      counts.set(combo, c);
    }
  }

  const signals: HitSignal[] = [];
  for (const [combo, c] of counts) {
    if (c.logged < MIN_SIGNAL_COMBO_WEEKS) continue;
    if (weeks.length - c.logged < MIN_SIGNAL_CONTRAST_WEEKS) continue;
    const hitRatePct = Math.round((c.hits / c.logged) * 100);
    const liftPct = hitRatePct - overallHitRatePct;
    if (Math.abs(liftPct) < MIN_SIGNAL_LIFT) continue;
    const sep = combo.lastIndexOf("|");
    signals.push({
      goalId: combo.slice(0, sep),
      dow: Number(combo.slice(sep + 1)),
      loggedWeeks: c.logged,
      hitRatePct,
      liftPct,
    });
  }
  signals.sort((a, b) => Math.abs(b.liftPct) - Math.abs(a.liftPct) || b.loggedWeeks - a.loggedWeeks);

  return { weeks: weeks.length, overallHitRatePct, signals: signals.slice(0, MAX_SIGNALS) };
}
