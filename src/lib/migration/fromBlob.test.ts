import { describe, expect, it } from "vitest";
import { planMigration } from "./fromBlob";
import type { Goal, Entry, Settings } from "@/types/models";

const sampleBlob = {
  schemaVersion: 1,
  updatedAt: "2026-07-01T10:00:00.000Z",
  trackers: [
    {
      id: "1720000000000-abc",
      name: "  Run  ",
      goalType: "quantity",
      weeklyGoal: "5", // string amount dirt
      monthlyGoal: 20,
      yearlyGoal: 240,
      tags: "cardio, health,cardio", // string + duplicate dirt
      unit: "",
      goalsPlus: { mode: "goalsplus-running", runningWorkout: "norwegian4x4", workIntervalSec: 9 },
      goalPoints: 4, // pre-split legacy points
      archived: "true",
      termDeadline: "2026-09-30",
      termTarget: 100,
      ioConfig: {
        outputName: "Words",
        outputUnit: "words",
        outputTarget: 5000,
        inputs: [{ id: "in1", name: "Writing sessions", unit: "sessions", target: 5 }],
      },
    },
    { notAGoal: true }, // dropped
  ],
  entries: [
    {
      id: "e1",
      trackerId: "1720000000000-abc",
      date: "2026-07-01",
      amount: "3.5",
      notApplicable: 0,
      metricValues: { m1: "2", "": 9, m2: -4 },
      notes: " ok ",
    },
    { id: "e2", trackerId: "", date: "2026-07-01", amount: 1 }, // dropped: no tracker
    { id: "e3", trackerId: "1720000000000-abc", date: "2026-02-30", amount: 1 }, // bad date -> today
  ],
  checkIns: [{ id: "c1", name: "Review budget", cadence: "monthly" }],
  deletedItems: Array.from({ length: 130 }, (_, i) => ({
    id: `t${i}`,
    itemType: "entry",
    payload: {},
    label: `item ${i}`,
    deletedAt: "2026-01-01T00:00:00.000Z",
  })),
  settings: { weekStart: "sunday", milestoneStep: 10, rewardPointsEnabled: true },
};

describe("planMigration", () => {
  const plan = planMigration(sampleBlob, new Date(2026, 6, 10));

  it("reuses source ids as document ids", () => {
    const goal = plan.writes.find((w) => w.collection === "goals");
    expect(goal?.id).toBe("1720000000000-abc");
  });

  it("normalizes goal dirt and preserves term/ioConfig fields", () => {
    const goal = plan.writes.find((w) => w.collection === "goals")?.data as unknown as Goal;
    expect(goal.name).toBe("Run");
    expect(goal.weeklyGoal).toBe(5);
    expect(goal.archived).toBe(true);
    expect(goal.tags).toEqual(["cardio", "health"]);
    expect(goal.unit).toBe("miles"); // running default
    expect(goal.goalsPlus).toMatchObject({ mode: "goalsplus-running", workSpeed: 9 });
    expect(goal.goalPointsWeekly).toBe(4); // legacy single points honored
    expect(goal.termDeadline).toBe("2026-09-30");
    expect(goal.termTarget).toBe(100);
    expect(goal.ioConfig?.outputName).toBe("Words");
    expect(goal.ioConfig?.inputs).toHaveLength(1);
  });

  it("drops invalid items with warnings", () => {
    expect(plan.counts.goals).toBe(1);
    expect(plan.counts.entries).toBe(2);
    expect(plan.warnings.some((w) => w.startsWith("trackers: dropped"))).toBe(true);
    expect(plan.warnings.some((w) => w.startsWith("entries: dropped"))).toBe(true);
  });

  it("normalizes entry dirt", () => {
    const entry = plan.writes.find((w) => w.collection === "entries")?.data as unknown as Entry;
    expect(entry.amount).toBe(3.5);
    expect(entry.metricValues).toEqual({ m1: 2 });
    expect(entry.notes).toBe("ok");
    const badDate = plan.writes.filter((w) => w.collection === "entries")[1]?.data as unknown as Entry;
    expect(badDate.date).toBe("2026-07-10"); // repaired to "today"
  });

  it("caps trash at 120 with a warning", () => {
    expect(plan.counts.trash).toBe(120);
    expect(plan.warnings.some((w) => w.includes("exceeds cap"))).toBe(true);
  });

  it("normalizes settings with legacy defaults", () => {
    const settings: Settings = plan.settings;
    expect(settings.weekStart).toBe("sunday");
    expect(settings.milestoneStep).toBe(10);
    expect(settings.rewardPointsEnabled).toBe(true);
    expect(settings.compareToLastDefault).toBe(true); // legacy default
    expect(settings.ideasWeeklyGoal).toBe(0); // legacy default
  });

  it("is idempotent: planning twice yields identical writes", () => {
    const again = planMigration(sampleBlob, new Date(2026, 6, 10));
    expect(again.writes).toEqual(plan.writes);
  });

  it("handles an empty blob (new user)", () => {
    const empty = planMigration(undefined);
    expect(empty.writes).toHaveLength(0);
    expect(empty.settings.theme).toBe("teal");
  });
});
