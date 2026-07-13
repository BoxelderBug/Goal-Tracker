import { describe, expect, it } from "vitest";
import type { Entry, Goal } from "@/types/models";
import { newGoal } from "./newGoal";
import { computeGoalRecords } from "./records";

const goal = (over: Partial<Goal>): Goal => ({ ...newGoal(), ...over });
const entry = (trackerId: string, date: string, amount: number, over: Partial<Entry> = {}): Entry => ({
  id: `${trackerId}-${date}-${amount}`, trackerId, date, amount,
  notApplicable: false, goalsPlus: null, metricValues: {}, notes: "",
  createdAt: "2026-07-01T00:00:00.000Z", ...over,
});

describe("computeGoalRecords", () => {
  const goals = [goal({ id: "g1", name: "Run" })];

  it("returns nulls for a goal with no entries", () => {
    expect(computeGoalRecords(goals, [], "monday")).toEqual([
      { goalId: "g1", bestDay: null, bestWeek: null },
    ]);
  });

  it("sums same-day entries and picks the best day and week", () => {
    const entries = [
      entry("g1", "2026-07-06", 3),
      entry("g1", "2026-07-06", 4), // day total 7 (Mon, week of 07-06)
      entry("g1", "2026-07-01", 6), // week of 06-29, total 6
    ];
    const [r] = computeGoalRecords(goals, entries, "monday");
    expect(r.bestDay).toEqual({ date: "2026-07-06", amount: 7 });
    expect(r.bestWeek).toEqual({ weekStartKey: "2026-07-06", amount: 7 });
  });

  it("ignores N/A entries and archived goals", () => {
    const gs = [goal({ id: "g1" }), goal({ id: "g2", archived: true })];
    const entries = [
      entry("g1", "2026-07-06", 5, { notApplicable: true }),
      entry("g2", "2026-07-06", 99),
    ];
    const rs = computeGoalRecords(gs, entries, "monday");
    expect(rs).toHaveLength(1);
    expect(rs[0].bestDay).toBeNull();
  });

  it("breaks ties toward the more recent date", () => {
    const entries = [entry("g1", "2026-07-01", 5), entry("g1", "2026-07-08", 5)];
    const [r] = computeGoalRecords(goals, entries, "monday");
    expect(r.bestDay?.date).toBe("2026-07-08");
  });
});
