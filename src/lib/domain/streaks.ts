/**
 * Day-streak math for the dashboard. Pure: no Firebase/React imports.
 *
 * A day "counts" when at least one entry was logged that day (N/A entries
 * included — the user showed up). The current streak stays alive if today has
 * no entry yet (you haven't missed today until it's over), but today only
 * increments the count once logged.
 */
import type { Entry } from "@/types/models";
import { dateKeyToDayNumber, getDateKey } from "./dates";

export interface StreakResult {
  /** consecutive days logged, ending today or yesterday */
  current: number;
  /** longest run within the provided entries */
  longest: number;
  /** true when the current streak already includes an entry today */
  countedToday: boolean;
}

export function computeStreaks(entries: Entry[], now: Date, goalId?: string): StreakResult {
  const days = new Set<number>();
  for (const e of entries) {
    if (!e.date) continue;
    if (goalId && e.trackerId !== goalId) continue;
    days.add(dateKeyToDayNumber(e.date));
  }
  if (days.size === 0) return { current: 0, longest: 0, countedToday: false };

  const today = dateKeyToDayNumber(getDateKey(now));

  // Current: walk back from today (or yesterday if today isn't logged yet).
  const countedToday = days.has(today);
  let current = 0;
  let cursor = countedToday ? today : today - 1;
  while (days.has(cursor)) {
    current += 1;
    cursor -= 1;
  }

  // Longest: scan sorted unique day numbers for the longest consecutive run.
  const sorted = [...days].sort((a, b) => a - b);
  let longest = 1;
  let run = 1;
  for (let i = 1; i < sorted.length; i += 1) {
    run = sorted[i] === sorted[i - 1] + 1 ? run + 1 : 1;
    if (run > longest) longest = run;
  }

  return { current, longest: Math.max(longest, current), countedToday };
}
