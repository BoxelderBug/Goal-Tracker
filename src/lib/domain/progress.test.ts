import { describe, expect, it } from "vitest";
import type { Entry } from "@/types/models";
import { getWeekRange } from "./periods";
import { parseDateKey } from "./dates";
import {
  buildDailyTotals,
  computePace,
  getCumulativeSeries,
  paceTone,
  sumRange,
} from "./progress";

const entry = (id: string, trackerId: string, date: string, amount: number): Entry => ({
  id,
  trackerId,
  date,
  amount,
  notApplicable: false,
  goalsPlus: null,
  metricValues: {},
  notes: "",
  createdAt: "2026-07-01T00:00:00.000Z",
});

const week = getWeekRange(parseDateKey("2026-07-08"), "monday"); // Mon 2026-07-06 .. Sun 2026-07-12

describe("buildDailyTotals + sumRange", () => {
  it("sums multiple entries per day and across the range", () => {
    const totals = buildDailyTotals([
      entry("a", "g1", "2026-07-06", 2),
      entry("b", "g1", "2026-07-06", 3), // same day
      entry("c", "g1", "2026-07-09", 5),
      entry("d", "g2", "2026-07-09", 9), // other goal
      entry("e", "g1", "2026-06-30", 4), // outside range
    ]);
    expect(sumRange(totals, "g1", week)).toBe(10);
    expect(sumRange(totals, "g2", week)).toBe(9);
  });
});

describe("computePace", () => {
  it("flags on-pace when projected meets target", () => {
    // 3 of 7 days elapsed, 6 done -> avg 2/day -> projected 14 >= 10
    const pace = computePace(6, 10, week, parseDateKey("2026-07-08"));
    expect(pace.completion).toBe(60);
    expect(pace.onPace).toBe(true);
    expect(pace.goalHit).toBe(false);
  });

  it("flags goal hit and off-pace correctly", () => {
    expect(computePace(10, 10, week, parseDateKey("2026-07-08")).goalHit).toBe(true);
    const behind = computePace(1, 10, week, parseDateKey("2026-07-08"));
    expect(behind.onPace).toBe(false);
    expect(paceTone(behind)).toBe("missed");
  });
});

describe("getCumulativeSeries", () => {
  it("accumulates actuals then projects a straight line to range end", () => {
    const totals = buildDailyTotals([
      entry("a", "g1", "2026-07-06", 2),
      entry("b", "g1", "2026-07-07", 2),
      entry("c", "g1", "2026-07-08", 2),
    ]);
    const series = getCumulativeSeries(totals, "g1", week, parseDateKey("2026-07-08"));
    expect(series).toHaveLength(7);

    // actual region (through Wed 07-08)
    expect(series[0]).toMatchObject({ date: "2026-07-06", cumulative: 2, projected: false });
    expect(series[2]).toMatchObject({ date: "2026-07-08", cumulative: 6, projected: false });

    // projection region: avg 2/day over 3 elapsed days, extends from 6
    const thu = series[3];
    expect(thu.projected).toBe(true);
    expect(thu.cumulative).toBe(6); // actual stays flat
    expect(thu.projectedCumulative).toBe(8);
    const sun = series[6];
    expect(sun.projectedCumulative).toBe(14); // 6 + 2*4
  });
});
