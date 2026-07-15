import { describe, expect, it } from "vitest";
import type { Entry, Goal, ScheduleBlock } from "@/types/models";
import { newGoal } from "./newGoal";
import { parseDateKey } from "./dates";
import { computePriorityEffort, computeScheduleInsights, computeZeroDayDefense } from "./insights";

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

describe("computeZeroDayDefense", () => {
  // Window clamped to 2026-06-01 (Mon) .. 2026-07-12 (Sun) = 42 days.
  // Zero days: all 6 Fridays + 06-02 + 06-10 = 8 (Fridays = 75% share).
  const g1 = goal({ id: "g1", name: "Run" });
  const zeroSet = new Set(["2026-06-05", "2026-06-12", "2026-06-19", "2026-06-26",
    "2026-07-03", "2026-07-10", "2026-06-02", "2026-06-10"]);
  const allDays: string[] = [];
  for (let d = parseDateKey("2026-06-01"); d <= parseDateKey("2026-07-12"); d = new Date(d.getTime() + 86_400_000)) {
    allDays.push(d.toISOString().slice(0, 10));
  }
  const entries = allDays.filter((k) => !zeroSet.has(k)).map((k) => entry("g1", k));
  // 10 blocked days, all of them logged → blocked zero-rate 0%.
  const blocks = allDays.filter((k) => !zeroSet.has(k)).slice(0, 10).map((k) => block("g1", k));

  it("finds the danger weekday and the blocked-vs-unblocked split", () => {
    const z = computeZeroDayDefense([g1], entries, blocks, [], "monday", now, "2026-06-01");
    expect(z).not.toBeNull();
    expect(z!.daysConsidered).toBe(42);
    expect(z!.zeroDays).toBe(8);
    expect(z!.dangerDow).toBe(5); // Fridays
    expect(z!.dangerZeroDays).toBe(6);
    expect(z!.dangerSharePct).toBe(75);
    expect(z!.split).toEqual({
      blockedDays: 10, blockedZeroPct: 0, unblockedDays: 32, unblockedZeroPct: 25,
    });
  });

  it("excuses days where every active goal is paused by a vacation", () => {
    const vacation = {
      id: "v1", name: "Trip", startDate: "2026-06-02", endDate: "2026-06-02",
      pausedGoalIds: ["g1"], adjustTargets: true,
    };
    const z = computeZeroDayDefense([g1], entries, blocks, [vacation], "monday", now, "2026-06-01");
    expect(z!.daysConsidered).toBe(41);
    expect(z!.zeroDays).toBe(7);
  });

  it("withholds the danger day under 8 zero days or 25% share, and hides under 28 days", () => {
    const fewer = allDays.filter((k) => !zeroSet.has(k) || k === "2026-06-02").map((k) => entry("g1", k));
    const z = computeZeroDayDefense([g1], fewer, [], [], "monday", now, "2026-06-01");
    expect(z!.zeroDays).toBe(7);
    expect(z!.dangerDow).toBeNull();
    expect(computeZeroDayDefense([g1], entries, blocks, [], "monday", now, "2026-07-01")).toBeNull();
  });
});

describe("computePriorityEffort", () => {
  const goals = [
    goal({ id: "g1", name: "Deep work", priority: 3 }),
    goal({ id: "g2", name: "Read", priority: 2 }),
    goal({ id: "g3", name: "Games", priority: 1 }),
  ];
  // 28-day window ending 07-14: 20 entries → g1 2, g2 8, g3 10.
  const day = (n: number) => `2026-07-${String(n).padStart(2, "0")}`;
  const entries = [
    ...Array.from({ length: 2 }, (_, i) => entry("g1", day(i + 1))),
    ...Array.from({ length: 8 }, (_, i) => entry("g2", day(i + 1))),
    ...Array.from({ length: 10 }, (_, i) => entry("g3", day(i + 1))),
  ];

  it("ranks by priority and flags the starving top goal and the low-priority soaker", () => {
    const pe = computePriorityEffort(goals, entries, [], now);
    expect(pe).not.toBeNull();
    expect(pe!.needsPriorities).toBe(false);
    expect(pe!.rows.map((r) => r.id)).toEqual(["g1", "g2", "g3"]);
    expect(pe!.rows.map((r) => r.effortPct)).toEqual([10, 40, 50]);
    expect(pe!.starving?.id).toBe("g1"); // top priority, 10% < half of even share (16.7%)
    expect(pe!.soaker?.id).toBe("g3"); // bottom-half priority at 50%
  });

  it("blends scheduled minutes 50/50 when blocks exist", () => {
    // all 600 scheduled minutes go to g1 → 0.5×10% + 0.5×100% = 55%
    const blocks10 = Array.from({ length: 10 }, (_, i) => block("g1", day(i + 1)));
    const pe = computePriorityEffort(goals, entries, blocks10, now);
    expect(pe!.rows.find((r) => r.id === "g1")!.effortPct).toBe(55);
    expect(pe!.starving).toBeNull();
  });

  it("nudges for priorities when they aren't distinct, hides under 20 entries", () => {
    const flat = goals.map((g) => ({ ...g, priority: 0 }));
    expect(computePriorityEffort(flat, entries, [], now)!.needsPriorities).toBe(true);
    expect(computePriorityEffort(goals, entries.slice(0, 19), [], now)).toBeNull();
    expect(computePriorityEffort(goals.slice(0, 1), entries, [], now)).toBeNull();
  });
});
