import { describe, expect, it } from "vitest";
import type { Entry, Goal } from "@/types/models";
import { newGoal } from "./newGoal";
import { parseDateKey } from "./dates";
import { computeMomentumGrid } from "./momentum";

const goal = (over: Partial<Goal>): Goal => ({ ...newGoal(), ...over });
const entry = (trackerId: string, date: string, amount: number): Entry => ({
  id: `${trackerId}-${date}`, trackerId, date, amount,
  notApplicable: false, goalsPlus: null, metricValues: {}, notes: "",
  createdAt: "2026-07-01T00:00:00.000Z",
});

// Wed 2026-07-08, monday weeks. 2-week window → [06-30..07-05], [07-06..07-12].
const now = parseDateKey("2026-07-08");

describe("computeMomentumGrid", () => {
  it("lays out weeks oldest→newest and one row per active goal", () => {
    const grid = computeMomentumGrid(
      [goal({ id: "g1", name: "Run", weeklyGoal: 10 }), goal({ id: "g2", name: "Read", weeklyGoal: 5 })],
      [],
      2, "monday", now,
    );
    expect(grid.weekKeys).toEqual(["2026-06-29", "2026-07-06"]);
    expect(grid.goals.map((g) => g.name)).toEqual(["Run", "Read"]);
    expect(grid.cells).toEqual([]); // no entries → no cells
  });

  it("emits completion-percent cells and tracks the max", () => {
    const grid = computeMomentumGrid(
      [goal({ id: "g1", name: "Run", weeklyGoal: 10 })],
      [entry("g1", "2026-07-07", 8)], // current week: 8/10 = 80%
      2, "monday", now,
    );
    // one cell: [weekIndex 1 (current), goalIndex 0, 80]
    expect(grid.cells).toEqual([[1, 0, 80]]);
    expect(grid.maxValue).toBe(80);
  });

  it("skips goals with no weekly target", () => {
    const grid = computeMomentumGrid(
      [goal({ id: "g1", weeklyGoal: 0 })],
      [entry("g1", "2026-07-07", 8)],
      2, "monday", now,
    );
    expect(grid.cells).toEqual([]);
  });

  it("excludes archived goals from the rows", () => {
    const grid = computeMomentumGrid(
      [goal({ id: "g1", name: "Run", weeklyGoal: 10 }), goal({ id: "g2", name: "Old", archived: true })],
      [],
      2, "monday", now,
    );
    expect(grid.goals.map((g) => g.name)).toEqual(["Run"]);
  });
});
