/**
 * Effective-target resolution ported from legacy/app.js (~10269–10486).
 * Composition order (must match legacy exactly):
 *   1. default target — custom weekly/monthly grids when enabled, else the
 *      period's flat goal (quarter derives from monthly ×3 or ceil(yearly/4))
 *   2. per-period override (week/month/year only, keyed by getPeriodKey)
 *   3. vacation proration when the goal is paused with adjustTargets
 */
import type { PeriodKind, Vacation, WeekStart } from "@/types/models";
import { getRangeDays, normalizeDate, parseDateKey, DAY_MS, type DateRange } from "./dates";
import { addAmount, normalizeGoalPoints, normalizeGoalTargetInt } from "./numbers";
import {
  MONTH_TEMPLATE_COUNT,
  WEEK_TEMPLATE_COUNT,
  getPeriodKey,
  getQuarterRange,
  getWeekTemplateIndexForDate,
} from "./periods";

/** The subset of Goal that target math needs (tests can pass minimal objects). */
export interface TargetGoalLike {
  id: string;
  weeklyGoal?: number;
  monthlyGoal?: number;
  yearlyGoal?: number;
  customWeeklyEnabled?: boolean;
  customWeeklyTargets?: number[];
  customMonthlyEnabled?: boolean;
  customMonthlyTargets?: number[];
  goalPointsWeekly?: number;
  goalPointsMonthly?: number;
  goalPointsYearly?: number;
  /** pre-split legacy single points value, still honored as a fallback */
  goalPoints?: number | string | null;
}

/** periodKey -> goalId -> overridden target */
export type PeriodGoalOverrides = Record<string, Record<string, number>>;

/** Flat storage key for one override in the meta/periodGoalOverrides map. */
export function overrideKey(periodKey: string, goalId: string): string {
  return `${periodKey}::${goalId}`;
}

/** Expand the flat meta override map into the nested PeriodGoalOverrides shape. */
export function overridesFromFlatMap(values: Record<string, number>): PeriodGoalOverrides {
  const nested: PeriodGoalOverrides = {};
  for (const [key, value] of Object.entries(values ?? {})) {
    const sep = key.indexOf("::");
    if (sep < 0) continue;
    const periodKey = key.slice(0, sep);
    const goalId = key.slice(sep + 2);
    (nested[periodKey] ??= {})[goalId] = value;
  }
  return nested;
}

export function normalizeCustomTargetList(
  value: unknown,
  count: number,
  fallbackValue = 0,
): number[] {
  const safeCount = Math.max(Math.floor(Number(count) || 0), 0);
  const safeFallback = normalizeGoalTargetInt(fallbackValue, 0);
  const source = Array.isArray(value) ? value : [];
  return Array.from({ length: safeCount }, (_, index) =>
    normalizeGoalTargetInt(source[index], safeFallback),
  );
}

export function getCustomWeekTargetForRange(
  goal: TargetGoalLike,
  range: DateRange | null,
  weekStart: WeekStart,
): number {
  const weeklyTargets = normalizeCustomTargetList(
    goal.customWeeklyTargets,
    WEEK_TEMPLATE_COUNT,
    normalizeGoalTargetInt(goal.weeklyGoal, 0),
  );
  const rangeDate = range?.start ?? new Date();
  return weeklyTargets[getWeekTemplateIndexForDate(rangeDate, weekStart)] || 0;
}

export function getCustomMonthTargetForRange(
  goal: TargetGoalLike,
  range: DateRange | null,
): number {
  const monthlyTargets = normalizeCustomTargetList(
    goal.customMonthlyTargets,
    MONTH_TEMPLATE_COUNT,
    normalizeGoalTargetInt(goal.monthlyGoal, 0),
  );
  const rangeDate = range?.start ?? new Date();
  const monthIndex = Math.max(
    Math.min(new Date(rangeDate).getMonth(), MONTH_TEMPLATE_COUNT - 1),
    0,
  );
  return monthlyTargets[monthIndex] || 0;
}

/** Inclusive overlap in days between a vacation and a range, 0 when disjoint. */
export function getVacationOverlapDays(
  vacation: Pick<Vacation, "startDate" | "endDate">,
  range: DateRange,
): number {
  const vStart = normalizeDate(parseDateKey(vacation.startDate));
  const vEnd = normalizeDate(parseDateKey(vacation.endDate));
  const overlapStart = vStart > range.start ? vStart : range.start;
  const overlapEnd = vEnd < range.end ? vEnd : range.end;
  if (overlapStart > overlapEnd) return 0;
  return Math.round((overlapEnd.getTime() - overlapStart.getTime()) / DAY_MS) + 1;
}

export function getDefaultTargetForPeriod(
  goal: TargetGoalLike,
  period: PeriodKind,
  range: DateRange | null,
  weekStart: WeekStart,
): number {
  const weeklyGoal = normalizeGoalTargetInt(goal.weeklyGoal, 0);
  const monthlyGoal = normalizeGoalTargetInt(goal.monthlyGoal, 0);
  const yearlyGoal = normalizeGoalTargetInt(goal.yearlyGoal, 0);
  const customWeeklyEnabled = Boolean(goal.customWeeklyEnabled);
  const customMonthlyEnabled = Boolean(goal.customMonthlyEnabled);

  if (period === "month") {
    if (customMonthlyEnabled) {
      return getCustomMonthTargetForRange(goal, range);
    }
    return monthlyGoal;
  }

  if (period === "quarter") {
    const quarterRange = range ?? getQuarterRange(new Date());
    if (customMonthlyEnabled) {
      const monthlyTargets = normalizeCustomTargetList(
        goal.customMonthlyTargets,
        MONTH_TEMPLATE_COUNT,
        monthlyGoal,
      );
      const startMonth = quarterRange.start.getMonth();
      const endMonth = quarterRange.end.getMonth();
      let total = 0;
      for (let month = startMonth; month <= endMonth; month += 1) {
        total = addAmount(total, monthlyTargets[month] || 0);
      }
      return total;
    }
    if (monthlyGoal > 0) {
      return monthlyGoal * 3;
    }
    if (yearlyGoal > 0) {
      return Math.ceil(yearlyGoal / 4);
    }
    return 0;
  }

  if (period === "year") {
    if (customMonthlyEnabled) {
      const monthlyTargets = normalizeCustomTargetList(
        goal.customMonthlyTargets,
        MONTH_TEMPLATE_COUNT,
        monthlyGoal,
      );
      return monthlyTargets.reduce((total, value) => addAmount(total, value), 0);
    }
    if (customWeeklyEnabled) {
      const weeklyTargets = normalizeCustomTargetList(
        goal.customWeeklyTargets,
        WEEK_TEMPLATE_COUNT,
        weeklyGoal,
      );
      return weeklyTargets.reduce((total, value) => addAmount(total, value), 0);
    }
    return yearlyGoal;
  }

  // week
  if (customWeeklyEnabled) {
    return getCustomWeekTargetForRange(goal, range, weekStart);
  }
  return weeklyGoal;
}

export interface TargetContext {
  weekStart: WeekStart;
  overrides?: PeriodGoalOverrides;
  vacations?: Vacation[];
}

/**
 * The effective target for a goal in a period: default → override → vacation
 * proration. Overrides and vacations only apply when a concrete range is given
 * and the period is week/month/year (quarter has no period key in legacy).
 */
export function getTargetForPeriod(
  goal: TargetGoalLike,
  period: PeriodKind,
  range: DateRange | null,
  context: TargetContext,
): number {
  let target = getDefaultTargetForPeriod(goal, period, range, context.weekStart);

  if (period !== "quarter" && range) {
    const periodKey = getPeriodKey(period, range);
    const overrideMap = context.overrides?.[periodKey];
    if (overrideMap && typeof overrideMap[goal.id] === "number") {
      target = overrideMap[goal.id];
    }

    const periodDays = getRangeDays(range);
    if (periodDays > 0) {
      let vacationDays = 0;
      for (const vacation of context.vacations ?? []) {
        if (vacation.adjustTargets && vacation.pausedGoalIds.includes(goal.id)) {
          vacationDays += getVacationOverlapDays(vacation, range);
        }
      }
      if (vacationDays > 0) {
        const effectiveDays = Math.max(0, periodDays - vacationDays);
        target = Math.max(0, parseFloat(((target * effectiveDays) / periodDays).toFixed(2)));
      }
    }
  }

  return target;
}

/** Reward points a goal is worth for a period (legacy single-value fallback honored). */
export function getGoalPointsForPeriod(goal: TargetGoalLike, period: PeriodKind): number {
  const fallbackByPeriod = period === "month" || period === "quarter" ? 3 : period === "year" ? 10 : 1;
  const hasLegacyPoints =
    goal.goalPoints !== undefined && goal.goalPoints !== null && goal.goalPoints !== "";
  const legacyPoints = hasLegacyPoints
    ? normalizeGoalPoints(goal.goalPoints, fallbackByPeriod)
    : fallbackByPeriod;
  if (period === "month" || period === "quarter") {
    return normalizeGoalPoints(goal.goalPointsMonthly, legacyPoints);
  }
  if (period === "year") {
    return normalizeGoalPoints(goal.goalPointsYearly, legacyPoints);
  }
  return normalizeGoalPoints(goal.goalPointsWeekly, legacyPoints);
}
