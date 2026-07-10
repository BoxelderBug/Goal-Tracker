/* eslint-disable @typescript-eslint/no-explicit-any */
/**
 * Differential tests: the ORACLE section below is copied verbatim from
 * legacy/app.js (getWeekRange ~12364, getWeekTemplateIndexForDate ~10269,
 * getTrackerDefaultTargetForPeriod ~10376, getTrackerTargetForPeriod ~10425),
 * with module globals (settings, periodGoalOverrides, vacations) turned into
 * parameters. The port must agree with it on randomized inputs.
 */
import { describe, expect, it } from "vitest";
import { getDateKey } from "./dates";
import { getMonthRange, getQuarterRange, getWeekRange, getWeekTemplateIndexForDate, getYearRange } from "./periods";
import { getTargetForPeriod, type PeriodGoalOverrides, type TargetGoalLike } from "./targets";
import type { PeriodKind, Vacation, WeekStart } from "@/types/models";

// --------------------------- ORACLE (legacy code) ---------------------------

const DAY_MS = 24 * 60 * 60 * 1000;
const GOAL_TEMPLATE_WEEK_COUNT = 52;
const GOAL_TEMPLATE_MONTH_COUNT = 12;

function legacyNormalizeDate(date: Date) {
  return new Date(date.getFullYear(), date.getMonth(), date.getDate());
}
function legacyAddDays(date: Date, days: number) {
  const copy = new Date(date);
  copy.setDate(copy.getDate() + days);
  return copy;
}
function legacyNormalizeGoalTargetInt(value: any, fallback = 0) {
  const numeric = Number(value);
  if (!Number.isFinite(numeric) || numeric < 0) return fallback;
  return Math.max(Math.floor(numeric), 0);
}
function legacyAddAmount(a: any, b: any) {
  return Math.round((Number(a) + Number(b)) * 100) / 100;
}
function legacyNormalizeCustomTargetList(value: any, count: number, fallbackValue = 0) {
  const safeCount = Math.max(Math.floor(Number(count) || 0), 0);
  const safeFallback = legacyNormalizeGoalTargetInt(fallbackValue, 0);
  const source = Array.isArray(value) ? value : [];
  return Array.from({ length: safeCount }, (_, index) =>
    legacyNormalizeGoalTargetInt(source[index], safeFallback),
  );
}
function legacyGetWeekRange(date: Date, weekStart: WeekStart) {
  const start = legacyNormalizeDate(date);
  if (weekStart === "sunday") {
    start.setDate(start.getDate() - start.getDay());
  } else {
    start.setDate(start.getDate() - ((start.getDay() + 6) % 7));
  }
  const end = legacyAddDays(start, 6);
  return { start, end };
}
function legacyGetMonthRange(date: Date) {
  return {
    start: new Date(date.getFullYear(), date.getMonth(), 1),
    end: new Date(date.getFullYear(), date.getMonth() + 1, 0),
  };
}
function legacyGetYearRange(date: Date) {
  return {
    start: new Date(date.getFullYear(), 0, 1),
    end: new Date(date.getFullYear(), 11, 31),
  };
}
function legacyGetQuarterRange(date: Date) {
  const normalizedDate = legacyNormalizeDate(date || new Date());
  const quarterStartMonth = Math.floor(normalizedDate.getMonth() / 3) * 3;
  return {
    start: new Date(normalizedDate.getFullYear(), quarterStartMonth, 1),
    end: new Date(normalizedDate.getFullYear(), quarterStartMonth + 3, 0),
  };
}
function legacyGetWeekTemplateIndexForDate(date: Date, weekStart: WeekStart) {
  const normalizedDate = legacyNormalizeDate(date || new Date());
  const yearStart = new Date(normalizedDate.getFullYear(), 0, 1);
  const yearWeekStart = legacyGetWeekRange(yearStart, weekStart).start;
  const targetWeekStart = legacyGetWeekRange(normalizedDate, weekStart).start;
  const diffDays = Math.round(
    (legacyNormalizeDate(targetWeekStart).getTime() - legacyNormalizeDate(yearWeekStart).getTime()) / DAY_MS,
  );
  const weekIndex = Math.floor(diffDays / 7);
  return Math.max(Math.min(weekIndex, GOAL_TEMPLATE_WEEK_COUNT - 1), 0);
}
function legacyGetTrackerCustomWeekTargetForRange(tracker: any, range: any, weekStart: WeekStart) {
  const weeklyTargets = legacyNormalizeCustomTargetList(
    tracker && tracker.customWeeklyTargets,
    GOAL_TEMPLATE_WEEK_COUNT,
    legacyNormalizeGoalTargetInt(tracker && tracker.weeklyGoal, 0),
  );
  const rangeDate = range && range.start ? range.start : new Date();
  return weeklyTargets[legacyGetWeekTemplateIndexForDate(rangeDate, weekStart)] || 0;
}
function legacyGetTrackerCustomMonthTargetForRange(tracker: any, range: any) {
  const monthlyTargets = legacyNormalizeCustomTargetList(
    tracker && tracker.customMonthlyTargets,
    GOAL_TEMPLATE_MONTH_COUNT,
    legacyNormalizeGoalTargetInt(tracker && tracker.monthlyGoal, 0),
  );
  const rangeDate = range && range.start ? range.start : new Date();
  const monthIndex = Math.max(Math.min(new Date(rangeDate).getMonth(), GOAL_TEMPLATE_MONTH_COUNT - 1), 0);
  return monthlyTargets[monthIndex] || 0;
}
function legacyGetPeriodKey(periodName: string, range: any) {
  if (periodName === "month") return `month:${getDateKey(range.start).slice(0, 7)}`;
  if (periodName === "year") return `year:${range.start.getFullYear()}`;
  return `week:${getDateKey(range.start)}`;
}
function legacyGetVacationOverlapDays(vacation: any, range: any) {
  const vStart = legacyNormalizeDate(new Date(vacation.startDate + "T00:00:00"));
  const vEnd = legacyNormalizeDate(new Date(vacation.endDate + "T00:00:00"));
  const overlapStart = vStart > range.start ? vStart : range.start;
  const overlapEnd = vEnd < range.end ? vEnd : range.end;
  if (overlapStart > overlapEnd) return 0;
  return Math.round((overlapEnd.getTime() - overlapStart.getTime()) / DAY_MS) + 1;
}
function legacyGetRangeDays(range: any) {
  return Math.max(Math.floor((range.end - range.start) / DAY_MS) + 1, 1);
}
function legacyGetTrackerDefaultTargetForPeriod(
  tracker: any,
  periodName: string,
  range: any,
  weekStart: WeekStart,
) {
  const weeklyGoal = legacyNormalizeGoalTargetInt(tracker && tracker.weeklyGoal, 0);
  const monthlyGoal = legacyNormalizeGoalTargetInt(tracker && tracker.monthlyGoal, 0);
  const yearlyGoal = legacyNormalizeGoalTargetInt(tracker && tracker.yearlyGoal, 0);
  const customWeeklyEnabled = Boolean(tracker && tracker.customWeeklyEnabled);
  const customMonthlyEnabled = Boolean(tracker && tracker.customMonthlyEnabled);
  if (periodName === "month") {
    if (customMonthlyEnabled) return legacyGetTrackerCustomMonthTargetForRange(tracker, range);
    return monthlyGoal;
  }
  if (periodName === "quarter") {
    const quarterRange = range || legacyGetQuarterRange(new Date());
    if (customMonthlyEnabled) {
      const monthlyTargets = legacyNormalizeCustomTargetList(
        tracker && tracker.customMonthlyTargets,
        GOAL_TEMPLATE_MONTH_COUNT,
        monthlyGoal,
      );
      const startMonth = quarterRange.start.getMonth();
      const endMonth = quarterRange.end.getMonth();
      let total = 0;
      for (let month = startMonth; month <= endMonth; month += 1) {
        total = legacyAddAmount(total, monthlyTargets[month] || 0);
      }
      return total;
    }
    if (monthlyGoal > 0) return monthlyGoal * 3;
    if (yearlyGoal > 0) return Math.ceil(yearlyGoal / 4);
    return 0;
  }
  if (periodName === "year") {
    if (customMonthlyEnabled) {
      const monthlyTargets = legacyNormalizeCustomTargetList(
        tracker && tracker.customMonthlyTargets,
        GOAL_TEMPLATE_MONTH_COUNT,
        monthlyGoal,
      );
      return monthlyTargets.reduce((total, value) => legacyAddAmount(total, value), 0);
    }
    if (customWeeklyEnabled) {
      const weeklyTargets = legacyNormalizeCustomTargetList(
        tracker && tracker.customWeeklyTargets,
        GOAL_TEMPLATE_WEEK_COUNT,
        weeklyGoal,
      );
      return weeklyTargets.reduce((total, value) => legacyAddAmount(total, value), 0);
    }
    return yearlyGoal;
  }
  if (customWeeklyEnabled) {
    return legacyGetTrackerCustomWeekTargetForRange(tracker, range, weekStart);
  }
  return weeklyGoal;
}
function legacyGetTrackerTargetForPeriod(
  tracker: any,
  periodName: string,
  range: any,
  weekStart: WeekStart,
  periodGoalOverrides: Record<string, Record<string, number>>,
  vacations: any[],
) {
  let target = legacyGetTrackerDefaultTargetForPeriod(tracker, periodName, range, weekStart);
  if (periodName !== "quarter" && range) {
    const periodKey = legacyGetPeriodKey(periodName, range);
    const overrideMap = periodGoalOverrides[periodKey];
    if (overrideMap && typeof overrideMap[tracker.id] === "number") {
      target = overrideMap[tracker.id];
    }
    const periodDays = legacyGetRangeDays(range);
    if (periodDays > 0) {
      let vacationDays = 0;
      vacations.forEach((v) => {
        if (v.adjustTargets && v.pausedGoalIds.includes(tracker.id)) {
          vacationDays += legacyGetVacationOverlapDays(v, range);
        }
      });
      if (vacationDays > 0) {
        const effectiveDays = Math.max(0, periodDays - vacationDays);
        target = Math.max(0, parseFloat(((target * effectiveDays) / periodDays).toFixed(2)));
      }
    }
  }
  return target;
}

// ------------------------------ fuzz harness -------------------------------

/** Deterministic PRNG so failures are reproducible. */
function mulberry32(seed: number) {
  return function () {
    seed |= 0;
    seed = (seed + 0x6d2b79f5) | 0;
    let t = Math.imul(seed ^ (seed >>> 15), 1 | seed);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

const rand = mulberry32(20260710);
const pick = <T,>(items: readonly T[]): T => items[Math.floor(rand() * items.length)];
const randInt = (max: number) => Math.floor(rand() * max);

function randomDate(): Date {
  const year = 2023 + randInt(5);
  const month = randInt(12);
  const day = 1 + randInt(28 + randInt(4)); // may overflow the month; Date rolls over, fine for both sides
  return new Date(year, month, day);
}

function randomGoal(): TargetGoalLike {
  const maybeGrid = (count: number) =>
    rand() < 0.5 ? Array.from({ length: randInt(count + 10) }, () => randInt(30) - 2) : undefined;
  return {
    id: pick(["g1", "g2"]),
    weeklyGoal: randInt(20),
    monthlyGoal: randInt(80),
    yearlyGoal: randInt(1000),
    customWeeklyEnabled: rand() < 0.4,
    customWeeklyTargets: maybeGrid(52),
    customMonthlyEnabled: rand() < 0.4,
    customMonthlyTargets: maybeGrid(12),
  };
}

function randomVacations(): Vacation[] {
  return Array.from({ length: randInt(3) }, (_, i) => {
    const start = randomDate();
    const end = legacyAddDays(start, randInt(20));
    return {
      id: `v${i}`,
      name: "vac",
      startDate: getDateKey(start),
      endDate: getDateKey(end),
      pausedGoalIds: rand() < 0.6 ? ["g1"] : ["g2"],
      adjustTargets: rand() < 0.7,
    };
  });
}

const PERIODS: PeriodKind[] = ["week", "month", "quarter", "year"];
const WEEK_STARTS: WeekStart[] = ["monday", "sunday"];

describe("legacy parity (differential fuzz)", () => {
  it("week ranges and template indexes match on 1000 random dates", () => {
    for (let i = 0; i < 1000; i += 1) {
      const date = randomDate();
      const weekStart = pick(WEEK_STARTS);
      const ours = getWeekRange(date, weekStart);
      const theirs = legacyGetWeekRange(date, weekStart);
      expect(getDateKey(ours.start)).toBe(getDateKey(theirs.start));
      expect(getDateKey(ours.end)).toBe(getDateKey(theirs.end));
      expect(getWeekTemplateIndexForDate(date, weekStart)).toBe(
        legacyGetWeekTemplateIndexForDate(date, weekStart),
      );
    }
  });

  it("effective targets match on 1500 random goal/period/override/vacation combos", () => {
    for (let i = 0; i < 1500; i += 1) {
      const goal = randomGoal();
      const period = pick(PERIODS);
      const weekStart = pick(WEEK_STARTS);
      const anchor = randomDate();
      const range =
        period === "week"
          ? getWeekRange(anchor, weekStart)
          : period === "month"
            ? getMonthRange(anchor)
            : period === "quarter"
              ? getQuarterRange(anchor)
              : getYearRange(anchor);
      const overrides: PeriodGoalOverrides =
        rand() < 0.5
          ? { [legacyGetPeriodKey(period, range)]: { [pick(["g1", "g2"])]: randInt(50) } }
          : {};
      const vacations = randomVacations();

      const ours = getTargetForPeriod(goal, period, range, { weekStart, overrides, vacations });
      const theirs = legacyGetTrackerTargetForPeriod(
        goal,
        period,
        range,
        weekStart,
        overrides,
        vacations,
      );
      expect(ours, `case ${i}: ${JSON.stringify({ goal, period, weekStart })}`).toBe(theirs);
    }
  });
});
