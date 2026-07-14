import { describe, expect, it } from "vitest";
import type { Entry } from "@/types/models";
import { getWeekRange } from "./periods";
import { parseDateKey } from "./dates";
import {
  aggregateCumulativePoints,
  bucketRangeTotals,
  buildDailyTotals,
  computePace,
  getCumulativeSeries,
  neededPerDay,
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

describe("aggregateCumulativePoints", () => {
  const mk = (date: string, cumulative: number) => ({
    date, cumulative, projected: false, projectedCumulative: null,
  });

  it("passes day granularity through unchanged", () => {
    const pts = [mk("2026-07-06", 1), mk("2026-07-07", 2)];
    expect(aggregateCumulativePoints(pts, "day", "monday")).toBe(pts);
  });

  it("keeps week-end points plus the final point", () => {
    // Mon 07-06 .. Sun 07-12 is one week; 07-13 starts the next.
    const pts = [
      mk("2026-07-10", 1), mk("2026-07-11", 2), mk("2026-07-12", 3),
      mk("2026-07-13", 4), mk("2026-07-14", 5),
    ];
    const out = aggregateCumulativePoints(pts, "week", "monday");
    expect(out.map((p) => p.date)).toEqual(["2026-07-12", "2026-07-14"]);
    expect(out.map((p) => p.cumulative)).toEqual([3, 5]);
  });

  it("keeps month-end points plus the final point", () => {
    const pts = [mk("2026-06-29", 1), mk("2026-06-30", 2), mk("2026-07-01", 3), mk("2026-07-15", 4)];
    const out = aggregateCumulativePoints(pts, "month", "monday");
    expect(out.map((p) => p.date)).toEqual(["2026-06-30", "2026-07-15"]);
  });
});

describe("neededPerDay", () => {
  // week = Mon 07-06 .. Sun 07-12; Wed 07-08 → 5 days left incl today
  const now = parseDateKey("2026-07-08");

  it("splits the remaining amount across remaining days incl today", () => {
    expect(neededPerDay(5, 20, week, now)).toBe(3); // 15 / 5
  });

  it("rounds to 2 decimals", () => {
    expect(neededPerDay(0, 10, week, now)).toBe(2); // 10 / 5
    expect(neededPerDay(3, 10, week, now)).toBe(1.4); // 7 / 5
  });

  it("returns 0 when hit, no target, or the range is over", () => {
    expect(neededPerDay(20, 20, week, now)).toBe(0);
    expect(neededPerDay(5, 0, week, now)).toBe(0);
    expect(neededPerDay(5, 20, week, parseDateKey("2026-07-20"))).toBe(0);
  });

  it("demands the full remainder on the last day", () => {
    expect(neededPerDay(5, 20, week, parseDateKey("2026-07-12"))).toBe(15);
  });

  it("still works mid-day on the last day (unnormalized now)", () => {
    // regression: a 2pm `now` on Sunday must not read as past the week's end
    expect(neededPerDay(5, 20, week, new Date(2026, 6, 12, 14, 30))).toBe(15);
  });
});

describe("bucketRangeTotals", () => {
  // Jan 2026: Thu Jan 1; weeks (monday-start) of 2025-12-29, 01-05, 01-12, ...
  const jan = { start: parseDateKey("2026-01-01"), end: parseDateKey("2026-01-31") };
  const totals = buildDailyTotals([
    entry("a", "g1", "2026-01-01", 2),
    entry("b", "g1", "2026-01-02", 3), // same week as Jan 1
    entry("c", "g1", "2026-01-05", 5), // next week
    entry("d", "g2", "2026-01-05", 9), // other goal
  ]);

  it("buckets totals by week with full calendar week ranges", () => {
    const out = bucketRangeTotals(totals, "g1", jan, "week", "monday", parseDateKey("2026-02-15"));
    expect(out[0].startKey).toBe("2025-12-29"); // week straddling the year edge
    expect(out[0].total).toBe(5);
    expect(out[1].startKey).toBe("2026-01-05");
    expect(out[1].total).toBe(5);
    // full calendar week even though the range starts Jan 1
    expect(out[0].range.start.getDate()).toBe(29);
    // covers every week through range.end (Jan 31 falls in week of Jan 26)
    expect(out[out.length - 1].startKey).toBe("2026-01-26");
  });

  it("buckets by month and omits buckets after the one containing now", () => {
    const year = { start: parseDateKey("2026-01-01"), end: parseDateKey("2026-12-31") };
    const out = bucketRangeTotals(totals, "g1", year, "month", "monday", parseDateKey("2026-03-10"));
    expect(out.map((b) => b.startKey)).toEqual(["2026-01-01", "2026-02-01", "2026-03-01"]);
    expect(out[0].total).toBe(10);
    expect(out[1].total).toBe(0); // zero buckets kept, not skipped
  });

  it("returns nothing for a range entirely in the future", () => {
    expect(bucketRangeTotals(totals, "g1", jan, "week", "monday", parseDateKey("2025-06-01"))).toEqual([]);
  });
});
