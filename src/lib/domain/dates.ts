/**
 * Date helpers ported from legacy/app.js (~12395–12425, ~18835–18929).
 *
 * Dates are handled as LOCAL calendar dates: a "date key" is YYYY-MM-DD, and
 * Date objects are normalized to local midnight. Keys are validated/converted
 * via UTC arithmetic (as in legacy) so DST shifts never change the day.
 */
import type { DateKey } from "@/types/models";

export const DAY_MS = 24 * 60 * 60 * 1000;

export interface DateRange {
  start: Date;
  end: Date;
}

/** Strip the time component (local midnight). */
export function normalizeDate(date: Date): Date {
  return new Date(date.getFullYear(), date.getMonth(), date.getDate());
}

export function addDays(date: Date, days: number): Date {
  const copy = new Date(date);
  copy.setDate(copy.getDate() + days);
  return copy;
}

export function addMonths(date: Date, months: number): Date {
  return new Date(date.getFullYear(), date.getMonth() + months, 1);
}

export function addYears(date: Date, years: number): Date {
  return new Date(date.getFullYear() + years, 0, 1);
}

export function isDateKey(value: unknown): value is DateKey {
  const raw = String(value ?? "");
  if (!/^\d{4}-\d{2}-\d{2}$/.test(raw)) {
    return false;
  }
  const [year, month, day] = raw.split("-").map(Number);
  const utc = new Date(Date.UTC(year, month - 1, day));
  return (
    utc.getUTCFullYear() === year &&
    utc.getUTCMonth() === month - 1 &&
    utc.getUTCDate() === day
  );
}

export function getDateKey(date: Date): DateKey {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, "0");
  const day = String(date.getDate()).padStart(2, "0");
  return `${year}-${month}-${day}`;
}

/** Invalid keys fall back to today (legacy behavior). */
export function parseDateKey(value: string): Date {
  const date = new Date(`${value}T00:00:00`);
  if (Number.isNaN(date.getTime())) {
    return normalizeDate(new Date());
  }
  return date;
}

/** Days since the Unix epoch for a date key (UTC arithmetic, DST-safe). */
export function dateKeyToDayNumber(value: string): number {
  if (!isDateKey(value)) {
    return 0;
  }
  const [year, month, day] = value.split("-").map(Number);
  return Math.floor(Date.UTC(year, month - 1, day) / DAY_MS);
}

export function dayNumberToDateKey(dayNumber: number): DateKey {
  const utc = new Date(Math.floor(Number(dayNumber) || 0) * DAY_MS);
  const year = utc.getUTCFullYear();
  const month = String(utc.getUTCMonth() + 1).padStart(2, "0");
  const day = String(utc.getUTCDate()).padStart(2, "0");
  return `${year}-${month}-${day}`;
}

/** Inclusive day count of a range, minimum 1. */
export function getRangeDays(range: DateRange): number {
  return Math.max(Math.floor((range.end.getTime() - range.start.getTime()) / DAY_MS) + 1, 1);
}

/** Days elapsed inside a range as of `now`, clamped to [1, rangeDays]. */
export function getElapsedDays(range: DateRange, now: Date): number {
  if (now < range.start) {
    return 1;
  }
  if (now > range.end) {
    return getRangeDays(range);
  }
  return Math.max(Math.floor((now.getTime() - range.start.getTime()) / DAY_MS) + 1, 1);
}
