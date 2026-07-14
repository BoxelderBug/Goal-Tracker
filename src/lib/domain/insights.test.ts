import { describe, expect, it } from "vitest";
import type { Entry, Goal, ScheduleBlock } from "@/types/models";
import { newGoal } from "./newGoal";
import { parseDateKey } from "./dates";
import { computeScheduleInsights } from "./insights";

const goal = (over: Partial<Goal>): Goal => ({ ...newGoal(), ...over });
const entry = (trackerId: string, date: string): Entry => ({
  id: `${trackerId}-${date}`, trackerId, date, amount: 1,
  notApplicable: false, goalsPlus: null, metricValues: {}, notes: "",
  createdAt: "2026-07-01T00:00:00.000Z",
});
const block = (trackerId: string, date: string): ScheduleBlock => ({
  id: `${trackerId}-${date}-b`, trackerId, date, startTime: "09:00", endTime: "10:00",
  notes: "", createdAt: "2026-07-01T00:00:00.000Z",
});

const now = parseDateKey("2026-07-14");

describe("computeScheduleInsights", () => {
  it("computes the scheduled-goal percentage over the window", () => {
    const goals = [goal({ id: "g1", name: "Run" }), goal({ id: "g2", name: "Read" })];
    const s = computeScheduleInsights(goals, [block("g1", "2026-07-15")], [], now);
    expect(s.scheduledPct).toBe(50);
    expect(s.scheduledGoalCount).toBe(1);
    expect(s.unscheduledGoals).toEqual([{ id: "g2", name: "Read" }]);
  });

  it("ignores archived goals, general blocks, and out-of-window blocks", () => {
    const goals = [goal({ id: "g1" }), goal({ id: "g2", archived: true })];
    const s = computeScheduleInsights(
      goals,
      [block("", "2026-07-15"), block("g2", "2026-07-15"), block("g1", "2026-05-01")],
      [],
      now,
    );
    expect(s.activeGoalCount).toBe(1);
    expect(s.scheduledGoalCount).toBe(0);
    expect(s.scheduledPct).toBe(0);
  });

  it("computes follow-through from past blocks joined on goal+date", () => {
    const goals = [goal({ id: "g1" })];
    const s = computeScheduleInsights(
      goals,
      [block("g1", "2026-07-10"), block("g1", "2026-07-12"), block("g1", "2026-07-20")],
      [entry("g1", "2026-07-10")],
      now,
    );
    expect(s.pastBlockCount).toBe(2); // the 07-20 block is upcoming
    expect(s.keptBlockCount).toBe(1);
    expect(s.keptPct).toBe(50);
  });

  it("returns null keptPct with no past blocks", () => {
    const s = computeScheduleInsights([goal({ id: "g1" })], [block("g1", "2026-07-20")], [], now);
    expect(s.keptPct).toBeNull();
  });
});
