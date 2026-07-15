import { describe, expect, it } from "vitest";
import type { Entry, Goal } from "@/types/models";
import { newGoal } from "./newGoal";
import { getPeriodRange, getWeekRange } from "./periods";
import { parseDateKey } from "./dates";
import { buildDailyTotals } from "./progress";
import { computeSnapshot, computeTargetReality } from "./snapshot";
import type { PeriodSnapshot } from "@/types/models";

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

describe("computeTargetReality", () => {
  const mkSnap = (rangeStart: string, rows: Array<{ id: string; progress: number; target: number }>, closedAt = "2026-07-01T00:00:00.000Z"): PeriodSnapshot => ({
    id: `week_${rangeStart}_${closedAt}`,
    period: "week",
    rangeStart,
    rangeEnd: rangeStart, // unused here
    closedAt,
    filters: { friendGroup: "", scope: "all" } as PeriodSnapshot["filters"],
    summary: {} as PeriodSnapshot["summary"],
    goals: rows.map((r) => ({
      trackerId: r.id, name: r.id, unit: "u",
      progress: r.progress, target: r.target, hit: r.progress >= r.target, pointsEarned: 0,
    })),
    checkIns: [],
  });
  const weekKeys = Array.from({ length: 10 }, (_, i) => `2026-0${i < 5 ? 5 : 6}-${String((i % 5) * 7 + 1).padStart(2, "0")}`);

  it("recommends lowering a sub-30% target to the 30th-percentile week", () => {
    // progress 1..10 vs target 20 → 0 hits; p30 of [1..10] = 3rd value = 3
    const snaps = weekKeys.map((k, i) => mkSnap(k, [{ id: "g1", progress: i + 1, target: 20 }]));
    const out = computeTargetReality([goal({ id: "g1", name: "Run", unit: "mi" })], snaps);
    expect(out).toHaveLength(1);
    expect(out[0]).toMatchObject({
      goalId: "g1", verdict: "lower", weeks: 10, hits: 0, hitPct: 0,
      currentTarget: 20, recommendedTarget: 3,
    });
  });

  it("recommends raising a >90% target to the median week", () => {
    // progress 11..20 vs target 5 → 10/10 hits; median = sorted[5] = 16
    const snaps = weekKeys.map((k, i) => mkSnap(k, [{ id: "g1", progress: i + 11, target: 5 }]));
    const out = computeTargetReality([goal({ id: "g1" })], snaps);
    expect(out[0]).toMatchObject({ verdict: "raise", hitPct: 100, currentTarget: 5, recommendedTarget: 16 });
  });

  it("stays silent in the calibrated 30-90% band, under 8 weeks, and for archived goals", () => {
    // 6 of 10 hit → 60%
    const snaps = weekKeys.map((k, i) => mkSnap(k, [{ id: "g1", progress: i < 6 ? 10 : 2, target: 10 }]));
    expect(computeTargetReality([goal({ id: "g1" })], snaps)).toHaveLength(0);
    const few = snaps.slice(0, 7).map((s) => mkSnap(s.rangeStart, [{ id: "g1", progress: 1, target: 20 }]));
    expect(computeTargetReality([goal({ id: "g1" })], few)).toHaveLength(0);
    expect(computeTargetReality([goal({ id: "g1", archived: true })], snaps)).toHaveLength(0);
  });

  it("counts a re-closed week once, latest close-out wins", () => {
    const snaps = [
      ...weekKeys.map((k) => mkSnap(k, [{ id: "g1", progress: 1, target: 20 }])),
      // re-close the first week later with a different progress
      mkSnap(weekKeys[0], [{ id: "g1", progress: 9, target: 20 }], "2026-07-02T00:00:00.000Z"),
    ];
    const out = computeTargetReality([goal({ id: "g1" })], snaps);
    expect(out[0].weeks).toBe(10);
    // progresses: nine 1s + one 9 → p30 = ceil(3)-1 = idx 2 → 1
    expect(out[0].recommendedTarget).toBe(1);
  });
});
