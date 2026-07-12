/**
 * Client-derived, ephemeral notifications for the header bell. Pure: computed
 * from current goals + entries each render (no stored notifications collection;
 * that's reserved for social/partner events in a later phase).
 */
import type { Entry, Goal, WeekStart } from "@/types/models";
import { addDays, getDateKey, normalizeDate, parseDateKey } from "./dates";
import { getWeekRange } from "./periods";
import { buildDailyTotals, computePace, latestEntryDateInRange, sumRange } from "./progress";
import { getTargetForPeriod } from "./targets";

export type NotificationKind = "goal-hit" | "needs-attention" | "period-close-ready";

export interface AppNotification {
  id: string;
  kind: NotificationKind;
  title: string;
  detail: string;
  href: string;
}

function daysBetween(fromKey: string, to: Date): number {
  const from = parseDateKey(fromKey);
  return Math.round((normalizeDate(to).getTime() - normalizeDate(from).getTime()) / 86_400_000);
}

export function deriveNotifications(
  goals: Goal[],
  entries: Entry[],
  weekStart: WeekStart,
  missedEntryDays: number,
  now: Date,
): AppNotification[] {
  const active = goals.filter((g) => !g.archived);
  const week = getWeekRange(now, weekStart);
  const weekKey = getDateKey(week.start);
  const totals = buildDailyTotals(entries);
  const lookback = { start: addDays(normalizeDate(now), -60), end: normalizeDate(now) };
  const out: AppNotification[] = [];

  for (const goal of active) {
    const progress = sumRange(totals, goal.id, week);
    const target = getTargetForPeriod(goal, "week", week, { weekStart });
    const pace = computePace(progress, target, week, now);
    if (pace.goalHit) {
      out.push({
        id: `hit:${goal.id}:${weekKey}`,
        kind: "goal-hit",
        title: `${goal.name} — goal hit`,
        detail: `You reached this week's target of ${target} ${goal.unit}.`.trim(),
        href: "/week",
      });
      continue;
    }
    const latest = latestEntryDateInRange(entries, goal.id, lookback);
    const since = latest === null ? Infinity : daysBetween(latest, now);
    if (since >= missedEntryDays) {
      out.push({
        id: `miss:${goal.id}`,
        kind: "needs-attention",
        title: `${goal.name} needs an entry`,
        detail: latest === null ? "No entries in the last 60 days." : `${since} days since your last entry.`,
        href: "/entry",
      });
    }
  }

  return out;
}
