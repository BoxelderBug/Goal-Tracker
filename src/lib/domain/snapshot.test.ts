import { describe, expect, it } from "vitest";
import type { Entry, Goal } from "@/types/models";
import { newGoal } from "./newGoal";
import { getPeriodRange, getWeekRange } from "./periods";
import { parseDateKey } from "./dates";
import { buildDailyTotals } from "./progress";
import { computeSnapshot } from "./snapshot";

const goal = (over: Partial<Goal>): Goal => ({ ...newGoal(), ...over });

const entry = (trackerId: string, date: string, amount: number): Entry => ({
  id: `${trackerId}-${date}`,
  trackerId,
  date,
  amount,
  notApplicable: false,
  goalsPlus: null,
  metricValues: {},
  notes: "",
  createdAt: "2026-07-01T00:00:00.000Z",
});

const week = getWeekRange(parseDateKey("2026-07-08"), "monday"); // Mon 07-06 .. Sun 07-12
const now = parseDateKey("2026-07-08");

const hitGoal = goal({ id: "g1", name: "Run", unit: "mi", weeklyGoal: 10, goalPointsWeekly: 5 });
const missGoal = goal({ id: "g2", name: "Read", unit: "pg", weeklyGoal: 10, goalPointsWeekly: 4 });
const totals = buildDailyTotals([
  entry("g1", "2026-07-06", 6),
  entry("g1", "2026-07-07", 4), // g1 -> 10, hit
  entry("g2", "2026-07-08", 4), // g2 -> 4, missed
]);

describe("computeSnapshot", () => {
  it("rolls up progress, hits, and points for a week close-out", () => {
    const { summary, goals } = computeSnapshot({
      goals: [hitGoal, missGoal],
      totals,
      period: "week",
      range: week,
      now,
      weekStart: "monday",
      rewardPointsEnabled: true,
    });

    expect(summary.totalProgress).toBe(14);
    expect(summary.totalTarget).toBe(20);
    expect(summary.completion).toBe(70);
    expect(summary.completedGoalsCount).toBe(1);
    expect(summary.goalsCount).toBe(2);
    expect(summary.goalPointsEarned).toBe(5); // only the hit goal
    expect(summary.onPaceLabel).toBe("1/2 goals hit");

    const g1 = goals.find((g) => g.trackerId === "g1")!;
    expect(g1).toMatchObject({ progress: 10, target: 10, hit: true, pointsEarned: 5 });
    const g2 = goals.find((g) => g.trackerId === "g2")!;
    expect(g2).toMatchObject({ progress: 4, hit: false, pointsEarned: 0 });
  });

  it("awards no points when reward points are disabled", () => {
    const { summary } = computeSnapshot({
      goals: [hitGoal],
      totals,
      period: "week",
      range: week,
      now,
      weekStart: "monday",
      rewardPointsEnabled: false,
    });
    expect(summary.goalPointsEarned).toBe(0);
  });

  it("never awards points for quarter close-outs (no per-quarter point field)", () => {
    const quarter = getPeriodRange("quarter", now, "monday");
    const big = buildDailyTotals([entry("g1", "2026-07-06", 100000)]);
    const { summary, goals } = computeSnapshot({
      goals: [goal({ id: "g1", monthlyGoal: 1, goalPointsWeekly: 5, goalPointsMonthly: 3 })],
      totals: big,
      period: "quarter",
      range: quarter,
      now,
      weekStart: "monday",
      rewardPointsEnabled: true,
    });
    expect(goals[0].hit).toBe(true);
    expect(summary.goalPointsEarned).toBe(0);
  });
});
