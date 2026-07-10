import { describe, expect, it } from "vitest";
import type { Vacation } from "@/types/models";
import { parseDateKey } from "./dates";
import { getMonthRange, getQuarterRange, getWeekRange, getYearRange } from "./periods";
import {
  getDefaultTargetForPeriod,
  getGoalPointsForPeriod,
  getTargetForPeriod,
  getVacationOverlapDays,
  normalizeCustomTargetList,
  overrideKey,
  overridesFromFlatMap,
  type TargetGoalLike,
} from "./targets";

const baseGoal = (extra: Partial<TargetGoalLike> = {}): TargetGoalLike => ({
  id: "g1",
  weeklyGoal: 5,
  monthlyGoal: 20,
  yearlyGoal: 240,
  ...extra,
});

const weekRange = () => getWeekRange(parseDateKey("2026-07-10"), "monday");
const monthRange = () => getMonthRange(parseDateKey("2026-07-10"));

describe("normalizeCustomTargetList", () => {
  it("fills missing slots with the fallback", () => {
    expect(normalizeCustomTargetList([7, 3], 4, 5)).toEqual([7, 3, 5, 5]);
  });

  it("floors values and rejects negatives", () => {
    expect(normalizeCustomTargetList([2.9, -1], 2, 4)).toEqual([2, 4]);
  });
});

describe("getDefaultTargetForPeriod", () => {
  it("returns flat goals per period", () => {
    const goal = baseGoal();
    expect(getDefaultTargetForPeriod(goal, "week", weekRange(), "monday")).toBe(5);
    expect(getDefaultTargetForPeriod(goal, "month", monthRange(), "monday")).toBe(20);
    expect(getDefaultTargetForPeriod(goal, "year", getYearRange(parseDateKey("2026-07-10")), "monday")).toBe(240);
  });

  it("uses the custom weekly grid slot for the week's template index", () => {
    const customWeeklyTargets = Array.from({ length: 52 }, (_, i) => i + 1);
    const goal = baseGoal({ customWeeklyEnabled: true, customWeeklyTargets });
    // Week of 2026-07-06 is slot 27 (Jan 1 week = slot 0), so target = 28.
    expect(getDefaultTargetForPeriod(goal, "week", weekRange(), "monday")).toBe(28);
  });

  it("uses the custom monthly grid for month, and sums it for quarter and year", () => {
    const customMonthlyTargets = [10, 10, 10, 20, 20, 20, 30, 30, 30, 40, 40, 40];
    const goal = baseGoal({ customMonthlyEnabled: true, customMonthlyTargets });
    expect(getDefaultTargetForPeriod(goal, "month", monthRange(), "monday")).toBe(30); // July
    expect(
      getDefaultTargetForPeriod(goal, "quarter", getQuarterRange(parseDateKey("2026-07-10")), "monday"),
    ).toBe(90); // Jul+Aug+Sep
    expect(getDefaultTargetForPeriod(goal, "year", getYearRange(parseDateKey("2026-07-10")), "monday")).toBe(300);
  });

  it("derives quarter from monthly ×3, then ceil(yearly/4)", () => {
    const quarter = getQuarterRange(parseDateKey("2026-07-10"));
    expect(getDefaultTargetForPeriod(baseGoal(), "quarter", quarter, "monday")).toBe(60);
    expect(
      getDefaultTargetForPeriod(baseGoal({ monthlyGoal: 0, yearlyGoal: 10 }), "quarter", quarter, "monday"),
    ).toBe(3); // ceil(10/4)
    expect(
      getDefaultTargetForPeriod(baseGoal({ monthlyGoal: 0, yearlyGoal: 0 }), "quarter", quarter, "monday"),
    ).toBe(0);
  });

  it("year sums the custom weekly grid when only weekly is custom", () => {
    const customWeeklyTargets = Array.from({ length: 52 }, () => 2);
    const goal = baseGoal({ customWeeklyEnabled: true, customWeeklyTargets, yearlyGoal: 999 });
    expect(getDefaultTargetForPeriod(goal, "year", getYearRange(parseDateKey("2026-07-10")), "monday")).toBe(104);
  });
});

describe("getVacationOverlapDays", () => {
  const range = weekRange(); // 2026-07-06 .. 2026-07-12

  it("counts inclusive overlap", () => {
    expect(getVacationOverlapDays({ startDate: "2026-07-10", endDate: "2026-07-20" }, range)).toBe(3);
    expect(getVacationOverlapDays({ startDate: "2026-07-01", endDate: "2026-07-31" }, range)).toBe(7);
  });

  it("returns 0 when disjoint", () => {
    expect(getVacationOverlapDays({ startDate: "2026-08-01", endDate: "2026-08-05" }, range)).toBe(0);
  });
});

describe("getTargetForPeriod", () => {
  const context = { weekStart: "monday" as const };

  it("applies a period override for the matching key only", () => {
    const overrides = { "week:2026-07-06": { g1: 9 }, "week:2026-06-29": { g1: 2 } };
    expect(getTargetForPeriod(baseGoal(), "week", weekRange(), { ...context, overrides })).toBe(9);
    expect(
      getTargetForPeriod(baseGoal(), "week", getWeekRange(parseDateKey("2026-07-15"), "monday"), {
        ...context,
        overrides,
      }),
    ).toBe(5);
  });

  it("ignores overrides for other goals", () => {
    const overrides = { "week:2026-07-06": { other: 9 } };
    expect(getTargetForPeriod(baseGoal(), "week", weekRange(), { ...context, overrides })).toBe(5);
  });

  it("prorates for vacations that pause this goal with adjustTargets", () => {
    const vacations: Vacation[] = [
      {
        id: "v1",
        name: "Trip",
        startDate: "2026-07-06",
        endDate: "2026-07-08",
        pausedGoalIds: ["g1"],
        adjustTargets: true,
      },
    ];
    // 3 of 7 days on vacation: 5 * 4/7 = 2.857… -> 2.86
    expect(getTargetForPeriod(baseGoal(), "week", weekRange(), { ...context, vacations })).toBe(2.86);
  });

  it("skips vacations without adjustTargets or for other goals", () => {
    const vacations: Vacation[] = [
      {
        id: "v1",
        name: "Trip",
        startDate: "2026-07-06",
        endDate: "2026-07-08",
        pausedGoalIds: ["g1"],
        adjustTargets: false,
      },
      {
        id: "v2",
        name: "Other trip",
        startDate: "2026-07-06",
        endDate: "2026-07-08",
        pausedGoalIds: ["someone-else"],
        adjustTargets: true,
      },
    ];
    expect(getTargetForPeriod(baseGoal(), "week", weekRange(), { ...context, vacations })).toBe(5);
  });

  it("applies proration on top of an override", () => {
    const overrides = { "week:2026-07-06": { g1: 14 } };
    const vacations: Vacation[] = [
      {
        id: "v1",
        name: "Trip",
        startDate: "2026-07-06",
        endDate: "2026-07-12",
        pausedGoalIds: ["g1"],
        adjustTargets: true,
      },
    ];
    // whole week on vacation -> 0
    expect(
      getTargetForPeriod(baseGoal(), "week", weekRange(), { ...context, overrides, vacations }),
    ).toBe(0);
  });

  it("never applies overrides/vacations to quarter", () => {
    const overrides = { "week:2026-07-06": { g1: 9 } };
    const quarter = getQuarterRange(parseDateKey("2026-07-10"));
    expect(getTargetForPeriod(baseGoal(), "quarter", quarter, { ...context, overrides })).toBe(60);
  });
});

describe("getGoalPointsForPeriod", () => {
  it("uses per-period points when set", () => {
    const goal = baseGoal({ goalPointsWeekly: 2, goalPointsMonthly: 5, goalPointsYearly: 20 });
    expect(getGoalPointsForPeriod(goal, "week")).toBe(2);
    expect(getGoalPointsForPeriod(goal, "month")).toBe(5);
    expect(getGoalPointsForPeriod(goal, "quarter")).toBe(5); // quarter uses monthly points
    expect(getGoalPointsForPeriod(goal, "year")).toBe(20);
  });

  it("falls back to defaults 1/3/3/10", () => {
    const goal = baseGoal();
    expect(getGoalPointsForPeriod(goal, "week")).toBe(1);
    expect(getGoalPointsForPeriod(goal, "month")).toBe(3);
    expect(getGoalPointsForPeriod(goal, "quarter")).toBe(3);
    expect(getGoalPointsForPeriod(goal, "year")).toBe(10);
  });

  it("honors the pre-split legacy goalPoints value", () => {
    const goal = baseGoal({ goalPoints: 7 });
    expect(getGoalPointsForPeriod(goal, "week")).toBe(7);
    expect(getGoalPointsForPeriod(goal, "year")).toBe(7);
  });
});

describe("overridesFromFlatMap", () => {
  it("expands flat keys into nested periodKey -> goalId -> value", () => {
    const flat = {
      [overrideKey("week:2026-07-06", "g1")]: 12,
      [overrideKey("week:2026-07-06", "g2")]: 5,
      [overrideKey("month:2026-07", "g1")]: 40,
      "malformed-no-separator": 9,
    };
    expect(overridesFromFlatMap(flat)).toEqual({
      "week:2026-07-06": { g1: 12, g2: 5 },
      "month:2026-07": { g1: 40 },
    });
  });

  it("returns an empty object for empty/undefined input", () => {
    expect(overridesFromFlatMap({})).toEqual({});
    expect(overridesFromFlatMap(undefined as unknown as Record<string, number>)).toEqual({});
  });

  it("feeds getTargetForPeriod so an override wins over the default", () => {
    const goal = baseGoal({ weeklyGoal: 10 });
    const week = getWeekRange(parseDateKey("2026-07-08"), "monday");
    const flat = { [overrideKey("week:2026-07-06", goal.id)]: 25 };
    const target = getTargetForPeriod(goal, "week", week, {
      weekStart: "monday",
      overrides: overridesFromFlatMap(flat),
    });
    expect(target).toBe(25);
  });
});
