import { describe, expect, it } from "vitest";
import type { GoalsPlusRunningConfig } from "@/types/models";
import {
  buildGolfEntry,
  buildReadingEntry,
  buildRunningEntry,
  computeRaceAttempts,
  computeRunTypeBreakdown,
  estimatedRunningVo2,
  formatMinutes,
  formatPace,
  paceMinutesPerMile,
  runningEntryAmount,
} from "./goalsplus";

describe("paceMinutesPerMile", () => {
  it("is duration / distance, 0 on non-positive input", () => {
    expect(paceMinutesPerMile(5, 40)).toBe(8);
    expect(paceMinutesPerMile(0, 40)).toBe(0);
    expect(paceMinutesPerMile(5, 0)).toBe(0);
  });
});

describe("estimatedRunningVo2", () => {
  it("matches the normalize.ts formula to one decimal", () => {
    // 5 mi in 40 min -> 201.1675 m/min -> 3.5 + 0.2*201.1675 = 43.7335 -> 43.7
    expect(estimatedRunningVo2(5, 40)).toBe(43.7);
    expect(estimatedRunningVo2(0, 40)).toBe(0);
  });
});

describe("formatPace", () => {
  it("formats minutes-per-mile as m:ss/mi", () => {
    expect(formatPace(8)).toBe("8:00/mi");
    expect(formatPace(7.5)).toBe("7:30/mi");
    expect(formatPace(0)).toBe("—");
  });
});

describe("buildRunningEntry", () => {
  it("computes pace + VO2 and zeroes Norwegian speeds for non-Norwegian runs", () => {
    const entry = buildRunningEntry({ runningWorkout: "tempo", distance: 5, durationMinutes: 40, workSpeed: 9 });
    expect(entry.paceMinutesPerMile).toBe(8);
    expect(entry.estimatedVo2).toBe(43.7);
    expect(entry.workSpeed).toBe(0);
    expect(entry.splits).toEqual([]);
  });

  it("keeps work/recovery speeds for Norwegian 4x4", () => {
    const entry = buildRunningEntry({ runningWorkout: "norwegian4x4", distance: 4, durationMinutes: 32, workSpeed: 9, recoverySpeed: 5 });
    expect(entry.workSpeed).toBe(9);
    expect(entry.recoverySpeed).toBe(5);
  });
});

describe("buildGolfEntry", () => {
  it("floors and clamps the score", () => {
    expect(buildGolfEntry({ golfType: "golf", score: 84.6 })).toEqual({ mode: "goalsplus-golf", golfType: "golf", score: 84 });
    expect(buildGolfEntry({ golfType: "disc-golf", score: -3 }).score).toBe(0);
  });
});

describe("buildReadingEntry", () => {
  it("trims fields, clamps rating, and tracks year-only completion", () => {
    const e = buildReadingEntry({
      bookTitle: "  Dune   Messiah ", author: " Frank  Herbert ", pages: 412.7, rating: 9, yearOnly: true,
    });
    expect(e).toEqual({
      mode: "goalsplus-reading", bookTitle: "Dune Messiah", author: "Frank Herbert",
      pages: 412, rating: 5, dateResolution: "year",
    });
  });

  it("defaults to a day-resolution, unrated entry", () => {
    const e = buildReadingEntry({ bookTitle: "X" });
    expect(e).toMatchObject({ author: "", pages: 0, rating: 0, dateResolution: "day" });
  });
});

describe("buildRunningEntry incline", () => {
  it("keeps a positive incline and clamps negatives/absent to 0", () => {
    expect(buildRunningEntry({ runningWorkout: "easy", distance: 3, durationMinutes: 30, avgInclinePct: 2.5 }).avgInclinePct).toBe(2.5);
    expect(buildRunningEntry({ runningWorkout: "easy", distance: 3, durationMinutes: 30, avgInclinePct: -1 }).avgInclinePct).toBe(0);
    expect(buildRunningEntry({ runningWorkout: "easy", distance: 3, durationMinutes: 30 }).avgInclinePct).toBe(0);
  });
});

describe("runningEntryAmount", () => {
  const config = (over: Partial<GoalsPlusRunningConfig>): GoalsPlusRunningConfig => ({
    mode: "goalsplus-running", runningWorkout: "easy", workSpeed: 0, recoverySpeed: 0, ...over,
  });
  const run = { distance: 4, runningWorkout: "tempo" as const };

  it("returns miles for the distance metric (and when unset)", () => {
    expect(runningEntryAmount(config({ primaryMetric: "distance" }), run)).toBe(4);
    expect(runningEntryAmount(config({}), run)).toBe(4);
  });

  it("returns 1 per run for the runs metric", () => {
    expect(runningEntryAmount(config({ primaryMetric: "runs" }), run)).toBe(1);
  });

  it("returns 1 only for the counted type under type-runs", () => {
    expect(runningEntryAmount(config({ primaryMetric: "type-runs", primaryRunType: "tempo" }), run)).toBe(1);
    expect(runningEntryAmount(config({ primaryMetric: "type-runs", primaryRunType: "long" }), run)).toBe(0);
    // falls back to the default workout when primaryRunType is unset
    expect(runningEntryAmount(config({ primaryMetric: "type-runs", runningWorkout: "tempo" }), run)).toBe(1);
  });
});

describe("formatMinutes", () => {
  it("formats m:ss and h:mm:ss", () => {
    expect(formatMinutes(25.5)).toBe("25:30");
    expect(formatMinutes(65)).toBe("1:05:00");
    expect(formatMinutes(0)).toBe("—");
  });
});

describe("computeRunTypeBreakdown", () => {
  const run = (workout: "easy" | "tempo", distance: number, durationMinutes: number, avgInclinePct = 0) =>
    buildRunningEntry({ runningWorkout: workout, distance, durationMinutes, avgInclinePct });

  it("groups by type with distance-weighted avg pace, best pace, and incline", () => {
    const rows = computeRunTypeBreakdown([
      run("easy", 3, 30, 1), // 10:00/mi
      run("easy", 5, 40),    // 8:00/mi
      run("tempo", 4, 28),   // 7:00/mi
    ]);
    expect(rows.map((r) => r.workout)).toEqual(["easy", "tempo"]); // by mileage desc
    expect(rows[0]).toMatchObject({
      runs: 2, totalDistance: 8, avgPace: 8.75, bestPace: 8, avgInclinePct: 1,
    });
    expect(rows[1]).toMatchObject({ runs: 1, totalDistance: 4, avgPace: 7, avgInclinePct: null });
  });
});

describe("computeRaceAttempts", () => {
  const dated = (date: string, distance: number, durationMinutes: number) => ({
    date, run: buildRunningEntry({ runningWorkout: "easy", distance, durationMinutes }),
  });

  it("times qualifying runs over the race distance and skips shorter ones", () => {
    const attempts = computeRaceAttempts(
      [dated("2026-07-02", 4, 32), dated("2026-07-01", 3.1, 26.35), dated("2026-07-03", 2, 14)],
      3.1,
    );
    // sorted by date; 8:00/mi × 3.1 = 24.8, 8:30/mi × 3.1 = 26.35
    expect(attempts).toEqual([
      { date: "2026-07-01", minutes: 26.35 },
      { date: "2026-07-02", minutes: 24.8 },
    ]);
  });

  it("returns nothing without a race distance", () => {
    expect(computeRaceAttempts([dated("2026-07-01", 5, 40)], 0)).toEqual([]);
  });
});
