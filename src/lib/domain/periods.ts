/**
 * Period ranges ported from legacy/app.js (~12364–12393, ~10256–10303).
 * The legacy functions read the global `settings.weekStart` and view anchors;
 * here both are explicit parameters.
 */
import type { PeriodKind, WeekStart } from "@/types/models";
import { DAY_MS, addDays, getDateKey, normalizeDate, type DateRange } from "./dates";

export const WEEK_TEMPLATE_COUNT = 52;
export const MONTH_TEMPLATE_COUNT = 12;

export function getWeekRange(date: Date, weekStart: WeekStart): DateRange {
  const start = normalizeDate(date);
  if (weekStart === "sunday") {
    start.setDate(start.getDate() - start.getDay());
  } else {
    start.setDate(start.getDate() - ((start.getDay() + 6) % 7));
  }
  const end = addDays(start, 6);
  return { start, end };
}

export function getMonthRange(date: Date): DateRange {
  const start = new Date(date.getFullYear(), date.getMonth(), 1);
  const end = new Date(date.getFullYear(), date.getMonth() + 1, 0);
  return { start, end };
}

export function getYearRange(date: Date): DateRange {
  const start = new Date(date.getFullYear(), 0, 1);
  const end = new Date(date.getFullYear(), 11, 31);
  return { start, end };
}

export function getQuarterRange(date: Date): DateRange {
  const normalized = normalizeDate(date);
  const quarterStartMonth = Math.floor(normalized.getMonth() / 3) * 3;
  const start = new Date(normalized.getFullYear(), quarterStartMonth, 1);
  const end = new Date(normalized.getFullYear(), quarterStartMonth + 3, 0);
  return { start, end };
}

export function getPeriodRange(period: PeriodKind, anchor: Date, weekStart: WeekStart): DateRange {
  if (period === "month") return getMonthRange(anchor);
  if (period === "quarter") return getQuarterRange(anchor);
  if (period === "year") return getYearRange(anchor);
  return getWeekRange(anchor, weekStart);
}

/**
 * Key identifying a period instance for overrides/temp goals/stretch goals.
 * Quarter has no key in legacy (quarter overrides are unsupported).
 */
export function getPeriodKey(period: "week" | "month" | "year", range: DateRange): string {
  if (period === "month") return `month:${getDateKey(range.start).slice(0, 7)}`;
  if (period === "year") return `year:${range.start.getFullYear()}`;
  return `week:${getDateKey(range.start)}`;
}

/**
 * Slot index (0–51) into the custom weekly target grid for the week containing
 * `date`: whole weeks since the week that contains Jan 1, clamped to the grid.
 */
export function getWeekTemplateIndexForDate(date: Date, weekStart: WeekStart): number {
  const normalized = normalizeDate(date);
  const yearStart = new Date(normalized.getFullYear(), 0, 1);
  const yearWeekStart = getWeekRange(yearStart, weekStart).start;
  const targetWeekStart = getWeekRange(normalized, weekStart).start;
  const diffDays = Math.round(
    (normalizeDate(targetWeekStart).getTime() - normalizeDate(yearWeekStart).getTime()) / DAY_MS,
  );
  const weekIndex = Math.floor(diffDays / 7);
  return Math.max(Math.min(weekIndex, WEEK_TEMPLATE_COUNT - 1), 0);
}
