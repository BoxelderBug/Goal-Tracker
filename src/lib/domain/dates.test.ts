import { describe, expect, it } from "vitest";
import {
  addDays,
  dateKeyToDayNumber,
  dayNumberToDateKey,
  getDateKey,
  getElapsedDays,
  getRangeDays,
  isDateKey,
  normalizeDate,
  parseDateKey,
} from "./dates";

describe("isDateKey", () => {
  it("accepts real dates", () => {
    expect(isDateKey("2026-07-10")).toBe(true);
    expect(isDateKey("2024-02-29")).toBe(true); // leap day
  });

  it("rejects impossible or malformed dates", () => {
    expect(isDateKey("2026-02-30")).toBe(false);
    expect(isDateKey("2025-02-29")).toBe(false); // not a leap year
    expect(isDateKey("2026-13-01")).toBe(false);
    expect(isDateKey("2026-7-1")).toBe(false);
    expect(isDateKey("")).toBe(false);
    expect(isDateKey(null)).toBe(false);
  });
});

describe("date key round-trips", () => {
  it("getDateKey/parseDateKey round-trip", () => {
    const key = "2026-01-31";
    expect(getDateKey(parseDateKey(key))).toBe(key);
  });

  it("day number round-trip", () => {
    const key = "2026-07-10";
    expect(dayNumberToDateKey(dateKeyToDayNumber(key))).toBe(key);
  });

  it("parseDateKey falls back to today for garbage", () => {
    const parsed = parseDateKey("not-a-date");
    expect(getDateKey(parsed)).toBe(getDateKey(normalizeDate(new Date())));
  });
});

describe("range days", () => {
  it("counts inclusive days", () => {
    const range = { start: parseDateKey("2026-07-06"), end: parseDateKey("2026-07-12") };
    expect(getRangeDays(range)).toBe(7);
  });

  it("elapsed days clamp to the range", () => {
    const range = { start: parseDateKey("2026-07-06"), end: parseDateKey("2026-07-12") };
    expect(getElapsedDays(range, parseDateKey("2026-07-01"))).toBe(1);
    expect(getElapsedDays(range, parseDateKey("2026-07-08"))).toBe(3);
    expect(getElapsedDays(range, parseDateKey("2026-08-01"))).toBe(7);
  });

  it("addDays crosses month boundaries", () => {
    expect(getDateKey(addDays(parseDateKey("2026-01-31"), 1))).toBe("2026-02-01");
  });
});
