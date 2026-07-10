import { describe, expect, it } from "vitest";
import {
  buildGolfEntry,
  buildRunningEntry,
  estimatedRunningVo2,
  formatPace,
  paceMinutesPerMile,
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
