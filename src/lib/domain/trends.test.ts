import { describe, expect, it } from "vitest";
import type { Entry, Goal } from "@/types/models";
import { newGoal } from "./newGoal";
import { parseDateKey } from "./dates";
import { computeWeeklyTrends } from "./trends";

const goal = (over: Partial<Goal>): Goal => ({ ...newGoal(), ...over });
const entry = (trackerId: string, date: string, amount: number): Entry => ({
  id: `${trackerId}-${date}`,
  trackerId, date, amount,
  notApplicable: false, goalsPlus: null, metricValues: {}, notes: "",
  createdAt: "2026-07-01T00:00:00.000Z",
});

// Monday week start. now = Wed 2026-07-08 → this week Mon 07-06..Sun 07-12.
const now = parseDateKey("2026-07-08");

describe("computeWeeklyTrends", () => {
  it("produces one point per week, newest last", () => {
    const points = computeWeeklyTrends([goal({ id: "g1", weeklyGoal: 5 })], [], 3, "monday", now);
    expect(points).toHaveLength(3);
    expect(points[2].weekStartKey).toBe("2026-07-06");
    expect(points[0].weekStartKey).toBe("2026-06-22");
  });

  it("computes hit-rate, volume, and consistency for the current week", () => {
    const goals = [
      goal({ id: "g1", weeklyGoal: 5 }),
      goal({ id: "g2", weeklyGoal: 10 }),
    ];
    const entries = [
      entry("g1", "2026-07-06", 3),
      entry("g1", "2026-07-07", 3), // g1 -> 6 >= 5 hit
      entry("g2", "2026-07-08", 4), // g2 -> 4 < 10 miss, but present
    ];
    const points = computeWeeklyTrends(goals, entries, 1, "monday", now);
    expect(points).toHaveLength(1);
    const wk = points[0];
    expect(wk.goalsHit).toBe(1);
    expect(wk.goalsTotal).toBe(2);
    expect(wk.hitRate).toBe(50);
    expect(wk.volume).toBe(10);
    expect(wk.consistency).toBe(100); // both goals had an entry
  });

  it("ignores archived goals and out-of-window entries", () => {
    const goals = [goal({ id: "g1", weeklyGoal: 5 }), goal({ id: "gArch", archived: true, weeklyGoal: 1 })];
    const entries = [
      entry("g1", "2026-07-06", 9),
      entry("g1", "2026-01-01", 100), // out of a 2-week window
      entry("gArch", "2026-07-06", 50), // archived
    ];
    const points = computeWeeklyTrends(goals, entries, 2, "monday", now);
    expect(points[1].volume).toBe(9);
    expect(points[1].goalsTotal).toBe(1);
  });
});
