/**
 * When a goal's history actually begins.
 *
 * `createdAt` alone is not trustworthy: goals migrated from the legacy blob all
 * carry the migration day (legacy trackers had no created timestamp), so a goal
 * tracked since 2019 looks brand new. The effective start is therefore the
 * earlier of `createdAt` and the goal's first entry.
 */
import type { DateKey, Entry } from "@/types/models";
import { getDateKey, normalizeDate } from "./dates";

export interface StartGoalLike {
  id: string;
  createdAt?: string;
}

/** Earlier of the goal's created date and its first entry; null when neither exists. */
export function effectiveStartKey(goal: StartGoalLike, entries: Entry[]): DateKey | null {
  const createdKey = goal.createdAt ? getDateKey(normalizeDate(new Date(goal.createdAt))) : null;
  let firstEntryKey: DateKey | null = null;
  for (const entry of entries) {
    if (entry.trackerId !== goal.id || !entry.date) continue;
    if (firstEntryKey === null || entry.date < firstEntryKey) firstEntryKey = entry.date;
  }
  if (createdKey !== null && firstEntryKey !== null) {
    return firstEntryKey < createdKey ? firstEntryKey : createdKey;
  }
  return createdKey ?? firstEntryKey;
}

/** A goal starting inside the first week of January still counts as year-start. */
export const YEAR_START_GRACE_DAYS = 7;

/**
 * The start date to flag when a goal did NOT run for the whole of `year` —
 * i.e. its history begins after the first week of January that year. Returns
 * null for goals that were already running (or whose start is unknown), so a
 * caller can simply render the marker when it gets a key back.
 */
export function midYearStartKey(
  goal: StartGoalLike,
  entries: Entry[],
  year: number,
  graceDays: number = YEAR_START_GRACE_DAYS,
): DateKey | null {
  const startKey = effectiveStartKey(goal, entries);
  if (!startKey) return null;
  if (Number(startKey.slice(0, 4)) < year) return null;
  const graceKey = `${year}-01-${String(Math.max(graceDays, 1)).padStart(2, "0")}`;
  return startKey > graceKey ? startKey : null;
}
