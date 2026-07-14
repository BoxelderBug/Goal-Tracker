/**
 * Progress + pace math ported from legacy/app.js (buildEntryIndex ~12133,
 * sumTrackerRange ~12294, getDailySeries ~12146, pace calc ~4909-4919).
 *
 * A "daily total" is the summed entry amount for one goal on one date. The
 * legacy index sums every dated entry's amount regardless of the N/A flag
 * (N/A entries carry amount 0), so we do the same for parity.
 */
import type { Entry, WeekStart } from "@/types/models";
import { getMonthRange, getWeekRange } from "./periods";
import {
  addDays,
  getDateKey,
  getElapsedDays,
  getRangeDays,
  normalizeDate,
  parseDateKey,
  type DateRange,
} from "./dates";
import { addAmount, percent, safeDivide } from "./numbers";

/** Map of `${trackerId}|${date}` -> summed amount. */
export type DailyTotals = Map<string, number>;

export function buildDailyTotals(entries: Entry[]): DailyTotals {
  const totals: DailyTotals = new Map();
  for (const entry of entries) {
    if (!entry || !entry.trackerId || !entry.date) continue;
    const key = `${entry.trackerId}|${entry.date}`;
    totals.set(key, addAmount(totals.get(key) ?? 0, Number(entry.amount || 0)));
  }
  return totals;
}

export function sumRange(totals: DailyTotals, trackerId: string, range: DateRange): number {
  let total = 0;
  let current = range.start;
  while (current <= range.end) {
    total = addAmount(total, totals.get(`${trackerId}|${getDateKey(current)}`) ?? 0);
    current = addDays(current, 1);
  }
  return total;
}

export interface DailyPoint {
  date: string;
  amount: number;
}

export function getDailySeries(
  totals: DailyTotals,
  trackerId: string,
  range: DateRange,
): DailyPoint[] {
  const series: DailyPoint[] = [];
  let current = range.start;
  while (current <= range.end) {
    const date = getDateKey(current);
    series.push({ date, amount: totals.get(`${trackerId}|${date}`) ?? 0 });
    current = addDays(current, 1);
  }
  return series;
}

export interface CumulativePoint {
  date: string;
  /** running total of actual entries up to and including this date */
  cumulative: number;
  /** true once the date is past `now` (projection region) */
  projected: boolean;
  /** straight-line projected running total (only set when projected) */
  projectedCumulative: number | null;
}

/**
 * Cumulative series for the scrub chart: actual running total up to `now`,
 * then a straight-line projection (avg/day × elapsed) continuing to range end.
 * The point at `now` carries both the actual value and the projection start so
 * the scrub readout transitions seamlessly into the projection segment.
 */
export function getCumulativeSeries(
  totals: DailyTotals,
  trackerId: string,
  range: DateRange,
  now: Date,
): CumulativePoint[] {
  const daily = getDailySeries(totals, trackerId, range);
  const elapsedDays = getElapsedDays(range, now);
  const nowKey = getDateKey(now);

  let running = 0;
  let elapsedRunning = 0;
  const points: CumulativePoint[] = [];
  for (const point of daily) {
    const isProjected = point.date > nowKey;
    if (!isProjected) {
      running = addAmount(running, point.amount);
      elapsedRunning = running;
    }
    points.push({
      date: point.date,
      // actual running total; stays flat through the projection region
      cumulative: running,
      projected: isProjected,
      projectedCumulative: null,
    });
  }

  // Fill the projection segment: from the last actual value, extend by the
  // average daily rate over elapsed days.
  const avgPerDay = safeDivide(elapsedRunning, elapsedDays);
  let dayOffset = 0;
  const startProjectionFrom = elapsedRunning;
  for (let i = 0; i < points.length; i += 1) {
    if (!points[i].projected) continue;
    dayOffset += 1;
    points[i].projectedCumulative = addAmount(startProjectionFrom, avgPerDay * dayOffset);
  }
  return points;
}

export interface PaceResult {
  progress: number;
  target: number;
  completion: number;
  avgPerDay: number;
  projected: number;
  onPace: boolean;
  goalHit: boolean;
}

export function computePace(
  progress: number,
  target: number,
  range: DateRange,
  now: Date,
): PaceResult {
  const totalDays = getRangeDays(range);
  const elapsedDays = getElapsedDays(range, now);
  const avgPerDay = safeDivide(progress, elapsedDays);
  const projected = avgPerDay * totalDays;
  return {
    progress,
    target,
    completion: percent(progress, target),
    avgPerDay,
    projected,
    onPace: projected >= target,
    goalHit: target > 0 && progress >= target,
  };
}

export type SeriesGranularity = "day" | "week" | "month";

/**
 * Thin a daily cumulative series to bucket-end points (week or month) for
 * coarser chart views. Keeps the last point of each bucket plus the final
 * point, so the running total stays exact at every kept point.
 */
export function aggregateCumulativePoints(
  points: CumulativePoint[],
  granularity: SeriesGranularity,
  weekStart: WeekStart,
): CumulativePoint[] {
  if (granularity === "day" || points.length === 0) return points;
  const bucketOf = (dateKey: string): string => {
    if (granularity === "month") return dateKey.slice(0, 7);
    return getDateKey(getWeekRange(parseDateKey(dateKey), weekStart).start);
  };
  return points.filter((p, i) => i === points.length - 1 || bucketOf(p.date) !== bucketOf(points[i + 1].date));
}

export interface PeriodBucketTotal {
  /** bucket identity: week-start dateKey, or first-of-month dateKey */
  startKey: string;
  /** the bucket's FULL calendar week/month (may extend past the outer range),
   *  so callers can resolve the real per-period target for it */
  range: DateRange;
  /** summed amount over the bucket's days that fall inside the outer range */
  total: number;
}

/**
 * Per-week / per-month totals across a range, for the year view's bar charts.
 * Buckets after the one containing `now` are omitted — no empty future bars —
 * while a range entirely in the past keeps every bucket.
 */
export function bucketRangeTotals(
  totals: DailyTotals,
  trackerId: string,
  range: DateRange,
  granularity: Exclude<SeriesGranularity, "day">,
  weekStart: WeekStart,
  now: Date,
): PeriodBucketTotal[] {
  const today = normalizeDate(now);
  const end = range.end <= today ? range.end : today;
  const out: PeriodBucketTotal[] = [];
  let current = range.start;
  while (current <= end) {
    const bucketRange =
      granularity === "month" ? getMonthRange(current) : getWeekRange(current, weekStart);
    const startKey = getDateKey(bucketRange.start);
    const amount = totals.get(`${trackerId}|${getDateKey(current)}`) ?? 0;
    const last = out[out.length - 1];
    if (last && last.startKey === startKey) last.total = addAmount(last.total, amount);
    else out.push({ startKey, range: bucketRange, total: amount });
    current = addDays(current, 1);
  }
  return out;
}

/**
 * Average amount per remaining day (today included) needed to still hit the
 * target. 0 when already hit, no target, or the range is over.
 */
export function neededPerDay(progress: number, target: number, range: DateRange, now: Date): number {
  // normalize: a mid-day `now` on the last day must not read as past the end
  const today = normalizeDate(now);
  if (target <= 0 || progress >= target || today > range.end) return 0;
  const daysLeft = getRangeDays(range) - getElapsedDays(range, today) + 1;
  return Math.round(((target - progress) / daysLeft) * 100) / 100;
}

/** Tone token key for a goal's current status (drives Badge/progress color). */
export function paceTone(pace: PaceResult): "hit" | "onpace" | "behind" | "missed" {
  if (pace.goalHit) return "hit";
  if (pace.target <= 0) return "onpace";
  if (pace.onPace) return "onpace";
  if (pace.projected >= pace.target * 0.75) return "behind";
  return "missed";
}

/** Convenience: the latest actual entry date for a tracker within a range. */
export function latestEntryDateInRange(
  entries: Entry[],
  trackerId: string,
  range: DateRange,
): string | null {
  const startKey = getDateKey(range.start);
  const endKey = getDateKey(range.end);
  let latest: string | null = null;
  for (const entry of entries) {
    if (entry.trackerId !== trackerId) continue;
    if (entry.date < startKey || entry.date > endKey) continue;
    if (latest === null || entry.date > latest) latest = entry.date;
  }
  return latest;
}

export { parseDateKey };
