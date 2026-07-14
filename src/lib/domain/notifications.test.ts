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

  it("emits a milestone once past a step boundary but not yet hit", () => {
    const notes = deriveNotifications(
      [goal({ id: "g1", name: "Run", weeklyGoal: 10 })],
      [entry("g1", "2026-07-07", 6)], // 60% of 10, recent
      "monday", 3, now,
      { milestonesEnabled: true, milestoneStep: 25 },
    );
    const milestone = notes.find((n) => n.kind === "goal-milestone");
    expect(milestone?.title).toContain("50%"); // floor(60/25)*25 = 50
  });

  it("omits milestones when the toggle is off (default)", () => {
    const notes = deriveNotifications(
      [goal({ id: "g1", weeklyGoal: 10 })],
      [entry("g1", "2026-07-07", 6)],
      "monday", 3, now,
    );
    expect(notes.some((n) => n.kind === "goal-milestone")).toBe(false);
  });

  it("emits a smart reminder when off pace late in the week with recent activity", () => {
    // Sat 2026-07-11: 1 day left to Sun 07-12, only 3 of 20 logged, active yesterday.
    const sat = parseDateKey("2026-07-11");
    const notes = deriveNotifications(
      [goal({ id: "g1", name: "Read", weeklyGoal: 20 })],
      [entry("g1", "2026-07-10", 3)],
      "monday", 3, sat,
      { smartRemindersEnabled: true },
    );
    const reminder = notes.find((n) => n.kind === "smart-reminder");
    expect(reminder).toBeDefined();
    expect(reminder?.detail).toContain("17"); // 20 - 3 remaining
  });

  it("suppresses the milestone when a smart reminder covers the same goal", () => {
    // Sat 07-11, 12 of 20 (60% → would be a 50% milestone), but off pace late
    // in the week with a recent entry → only the smart reminder should fire.
    const sat = parseDateKey("2026-07-11");
    const notes = deriveNotifications(
      [goal({ id: "g1", name: "Read", weeklyGoal: 20 })],
      [entry("g1", "2026-07-10", 12)],
      "monday", 3, sat,
      { smartRemindersEnabled: true, milestonesEnabled: true, milestoneStep: 25 },
    );
    expect(notes.some((n) => n.kind === "smart-reminder")).toBe(true);
    expect(notes.some((n) => n.kind === "goal-milestone")).toBe(false);
  });

  it("fires a midweek check on Thursday when goals are behind pace", () => {
    // Thu 2026-07-09; 1 of 20 logged → projection misses badly.
    const thu = parseDateKey("2026-07-09");
    const notes = deriveNotifications(
      [goal({ id: "g1", name: "Read", weeklyGoal: 20 })],
      [entry("g1", "2026-07-08", 1)],
      "monday", 3, thu,
    );
    const check = notes.find((n) => n.kind === "midweek-check");
    expect(check).toBeDefined();
    expect(check?.title).toContain("1 goal behind pace");
    expect(check?.detail).toContain("Read");
  });

  it("does not fire the midweek check on other days or when on pace", () => {
    const wed = parseDateKey("2026-07-08");
    const behindOnWed = deriveNotifications(
      [goal({ id: "g1", weeklyGoal: 20 })], [entry("g1", "2026-07-07", 1)], "monday", 3, wed,
    );
    expect(behindOnWed.some((n) => n.kind === "midweek-check")).toBe(false);

    const thu = parseDateKey("2026-07-09");
    const onPace = deriveNotifications(
      [goal({ id: "g1", weeklyGoal: 7 })], [entry("g1", "2026-07-08", 6)], "monday", 3, thu,
    );
    expect(onPace.some((n) => n.kind === "midweek-check")).toBe(false);
  });

  it("does not smart-remind early in the week", () => {
    const notes = deriveNotifications(
      [goal({ id: "g1", weeklyGoal: 20 })],
      [entry("g1", "2026-07-07", 3)],
      "monday", 3, now, // Wed, 5 days left
      { smartRemindersEnabled: true },
    );
    expect(notes.some((n) => n.kind === "smart-reminder")).toBe(false);
  });
});
