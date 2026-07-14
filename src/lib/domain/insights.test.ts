import { describe, expect, it } from "vitest";
import type { Entry, Goal, ScheduleBlock } from "@/types/models";
import { newGoal } from "./newGoal";
import { parseDateKey } from "./dates";
import { computeLoggingWindow, computeScheduleInsights } from "./insights";

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

describe("computeLoggingWindow", () => {
  const at = (date: string, hour: number, over: Partial<Entry> = {}): Entry => ({
    ...entry("g1", date),
    id: `g1-${date}-${hour}-${over.shareId ?? ""}`,
    createdAt: new Date(2026, 6, Number(date.slice(8)), hour, 30).toISOString(),
    ...over,
  });
  const blockAt = (date: string, startTime: string, endTime: string, trackerId = "g1"): ScheduleBlock => ({
    id: `${trackerId}-${date}-${startTime}`, trackerId, date, startTime, endTime,
    notes: "", createdAt: "2026-07-01T00:00:00.000Z",
  });

  // 10 entries: 7 logged 19:30 (band 18–20), 3 logged 07:30 (band 6–8)
  const tenEntries = [
    ...Array.from({ length: 7 }, (_, i) => at(`2026-07-${String(i + 1).padStart(2, "0")}`, 19)),
    ...Array.from({ length: 3 }, (_, i) => at(`2026-07-${String(i + 8).padStart(2, "0")}`, 7)),
  ];

  it("finds the modal 2-hour band and its share", () => {
    const w = computeLoggingWindow(tenEntries, [], now);
    expect(w).not.toBeNull();
    expect(w!.bandStartHour).toBe(18);
    expect(w!.entryCount).toBe(10);
    expect(w!.bandSharePct).toBe(70);
    expect(w!.split).toBeNull(); // no blocks at all
  });

  it("returns null below the entry gate and ignores partner-authored entries", () => {
    expect(computeLoggingWindow(tenEntries.slice(0, 9), [], now)).toBeNull();
    const withPartner = [...tenEntries.slice(0, 9), at("2026-07-10", 19, { shareId: "s1" })];
    expect(computeLoggingWindow(withPartner, [], now)).toBeNull();
  });

  it("splits block keep-rate by overlap with the band, gated at 5 per side", () => {
    // 5 past in-window blocks (19:00–20:00), kept on 4 of those dates;
    // 5 past out-of-window blocks (09:00–10:00), kept on 1.
    const inBlocks = Array.from({ length: 5 }, (_, i) =>
      blockAt(`2026-07-${String(i + 1).padStart(2, "0")}`, "19:00", "20:00"));
    const outBlocks = Array.from({ length: 5 }, (_, i) =>
      blockAt(`2026-07-${String(i + 8).padStart(2, "0")}`, "09:00", "10:00"));
    // tenEntries already covers g1 on 07-01..07-10 → all block dates "kept".
    // Remove entries for 07-05 (in) and drop 07-08..09 keeps by pointing blocks at g2.
    const w = computeLoggingWindow(
      tenEntries.filter((e) => e.date !== "2026-07-05"),
      [...inBlocks, ...outBlocks.map((b, i) => (i > 0 ? { ...b, trackerId: "g2" } : b))],
      now,
    );
    // gate needs 10 entries; we removed one → expect null instead
    expect(w).toBeNull();
    const w2 = computeLoggingWindow(
      tenEntries,
      [...inBlocks, ...outBlocks.map((b, i) => (i > 0 ? { ...b, trackerId: "g2" } : b))],
      now,
    );
    expect(w2!.split).toEqual({
      inWindowBlocks: 5,
      inWindowKeptPct: 100,
      outWindowBlocks: 5,
      outWindowKeptPct: 20, // only the one g1 block date has an entry
    });
  });

  it("withholds the split when either side is under 5 past blocks", () => {
    const w = computeLoggingWindow(
      tenEntries,
      Array.from({ length: 6 }, (_, i) =>
        blockAt(`2026-07-${String(i + 1).padStart(2, "0")}`, "19:00", "20:00")),
      now,
    );
    expect(w!.split).toBeNull();
  });
});
