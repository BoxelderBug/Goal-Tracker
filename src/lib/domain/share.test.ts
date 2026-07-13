import { describe, expect, it } from "vitest";
import type { Entry, Goal } from "@/types/models";
import { newGoal } from "./newGoal";
import { parseDateKey } from "./dates";
import { buildGoalSummary } from "./share";

const goal = (over: Partial<Goal>): Goal => ({ ...newGoal(), ...over });
const entry = (trackerId: string, date: string, amount: number): Entry => ({
  id: `${trackerId}-${date}`, trackerId, date, amount,
  notApplicable: false, goalsPlus: null, metricValues: {}, notes: "",
  createdAt: "2026-07-01T00:00:00.000Z",
});

// Wed 2026-07-08, monday weeks → Mon 07-06 .. Sun 07-12.
const now = parseDateKey("2026-07-08");

describe("buildGoalSummary", () => {
  it("summarizes the current week's progress and target", () => {
    const summary = buildGoalSummary(
      goal({ id: "g1", weeklyGoal: 10, unit: "miles" }),
      [entry("g1", "2026-07-06", 3), entry("g1", "2026-07-07", 4), entry("g1", "2026-06-30", 99)],
      "monday",
      now,
    );
    expect(summary.period).toBe("week");
    expect(summary.rangeStart).toBe("2026-07-06");
    expect(summary.rangeEnd).toBe("2026-07-12");
    expect(summary.progress).toBe(7); // last-week entry excluded
    expect(summary.target).toBe(10);
    expect(summary.updatedAt).toBe(now.toISOString());
  });
});
