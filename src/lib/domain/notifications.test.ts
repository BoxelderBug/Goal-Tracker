import { describe, expect, it } from "vitest";
import type { Entry, Goal } from "@/types/models";
import { newGoal } from "./newGoal";
import { parseDateKey } from "./dates";
import { deriveNotifications } from "./notifications";

const goal = (over: Partial<Goal>): Goal => ({ ...newGoal(), ...over });
const entry = (trackerId: string, date: string, amount: number): Entry => ({
  id: `${trackerId}-${date}`, trackerId, date, amount,
  notApplicable: false, goalsPlus: null, metricValues: {}, notes: "",
  createdAt: "2026-07-01T00:00:00.000Z",
});

// Wed 2026-07-08, monday weeks → Mon 07-06 .. Sun 07-12 (not the last day).
const now = parseDateKey("2026-07-08");

describe("deriveNotifications", () => {
  it("emits a goal-hit when the weekly target is met", () => {
    const notes = deriveNotifications(
      [goal({ id: "g1", name: "Run", weeklyGoal: 5 })],
      [entry("g1", "2026-07-06", 6)],
      "monday", 3, now,
    );
    expect(notes).toHaveLength(1);
    expect(notes[0].kind).toBe("goal-hit");
  });

  it("emits needs-attention for a goal with no recent entries", () => {
    const notes = deriveNotifications(
      [goal({ id: "g1", name: "Read", weeklyGoal: 5 })],
      [],
      "monday", 3, now,
    );
    expect(notes).toHaveLength(1);
    expect(notes[0].kind).toBe("needs-attention");
    expect(notes[0].detail).toMatch(/60 days/);
  });

  it("does not warn when an entry is within the missed threshold and not yet hit", () => {
    const notes = deriveNotifications(
      [goal({ id: "g1", weeklyGoal: 100 })],
      [entry("g1", "2026-07-07", 1)], // 1 day ago, below threshold, not hit
      "monday", 3, now,
    );
    expect(notes).toHaveLength(0);
  });

  it("flags period-close-ready on the last day of the week", () => {
    const sunday = parseDateKey("2026-07-12");
    const notes = deriveNotifications(
      [goal({ id: "g1", weeklyGoal: 100 })],
      [entry("g1", "2026-07-12", 1)],
      "monday", 3, sunday,
    );
    expect(notes.some((n) => n.kind === "period-close-ready")).toBe(true);
  });
});
