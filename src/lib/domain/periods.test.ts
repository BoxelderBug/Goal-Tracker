import { describe, expect, it } from "vitest";
import { getDateKey, parseDateKey } from "./dates";
import {
  getMonthRange,
  getPeriodKey,
  getQuarterRange,
  getWeekRange,
  getWeekTemplateIndexForDate,
  getYearRange,
} from "./periods";

// 2026-07-10 is a Friday.
const friday = () => parseDateKey("2026-07-10");

describe("getWeekRange", () => {
  it("monday start", () => {
    const range = getWeekRange(friday(), "monday");
    expect(getDateKey(range.start)).toBe("2026-07-06"); // Monday
    expect(getDateKey(range.end)).toBe("2026-07-12"); // Sunday
  });

  it("sunday start", () => {
    const range = getWeekRange(friday(), "sunday");
    expect(getDateKey(range.start)).toBe("2026-07-05");
    expect(getDateKey(range.end)).toBe("2026-07-11");
  });

  it("monday start on a Sunday goes back six days", () => {
    const range = getWeekRange(parseDateKey("2026-07-12"), "monday");
    expect(getDateKey(range.start)).toBe("2026-07-06");
  });

  it("spans a year boundary", () => {
    const range = getWeekRange(parseDateKey("2026-01-01"), "monday"); // Thursday
    expect(getDateKey(range.start)).toBe("2025-12-29");
    expect(getDateKey(range.end)).toBe("2026-01-04");
  });
});

describe("month/quarter/year ranges", () => {
  it("month range handles leap February", () => {
    const range = getMonthRange(parseDateKey("2024-02-10"));
    expect(getDateKey(range.start)).toBe("2024-02-01");
    expect(getDateKey(range.end)).toBe("2024-02-29");
  });

  it("quarter range", () => {
    const range = getQuarterRange(parseDateKey("2026-07-10"));
    expect(getDateKey(range.start)).toBe("2026-07-01");
    expect(getDateKey(range.end)).toBe("2026-09-30");
  });

  it("year range", () => {
    const range = getYearRange(parseDateKey("2026-07-10"));
    expect(getDateKey(range.start)).toBe("2026-01-01");
    expect(getDateKey(range.end)).toBe("2026-12-31");
  });
});

describe("getPeriodKey", () => {
  it("builds week/month/year keys", () => {
    const week = getWeekRange(friday(), "monday");
    expect(getPeriodKey("week", week)).toBe("week:2026-07-06");
    const month = getMonthRange(friday());
    expect(getPeriodKey("month", month)).toBe("month:2026-07");
    const year = getYearRange(friday());
    expect(getPeriodKey("year", year)).toBe("year:2026");
  });
});

describe("getWeekTemplateIndexForDate", () => {
  it("week containing Jan 1 is slot 0", () => {
    expect(getWeekTemplateIndexForDate(parseDateKey("2026-01-01"), "monday")).toBe(0);
  });

  it("advances weekly and clamps at 51", () => {
    expect(getWeekTemplateIndexForDate(parseDateKey("2026-01-08"), "monday")).toBe(1);
    expect(getWeekTemplateIndexForDate(parseDateKey("2026-12-31"), "monday")).toBeLessThanOrEqual(51);
  });

  it("depends on the week-start setting", () => {
    // 2026-01-04 is a Sunday: with Monday weeks it belongs to week 0 (Dec 29–Jan 4);
    // with Sunday weeks it starts week 1 (Jan 4–Jan 10).
    expect(getWeekTemplateIndexForDate(parseDateKey("2026-01-04"), "monday")).toBe(0);
    expect(getWeekTemplateIndexForDate(parseDateKey("2026-01-04"), "sunday")).toBe(1);
  });
});
