/**
 * Client-derived, ephemeral notifications for the header bell. Pure: computed
 * from current goals + entries each render (no stored notifications collection;
 * that's reserved for social/partner events in a later phase).
 */
import type { Entry, Goal, MilestoneStep, WeekStart } from "@/types/models";
import { addDays, getDateKey, normalizeDate, parseDateKey } from "./dates";
import { formatAmount } from "./format";
import { getWeekRange } from "./periods";
import { buildDailyTotals, computePace, latestEntryDateInRange, sumRange } from "./progress";
import { getTargetForPeriod } from "./targets";

export type NotificationKind =
  | "goal-hit"
  | "goal-milestone"
  | "smart-reminder"
  | "needs-attention"
  | "period-close-ready";

export interface AppNotification {
  id: string;
  kind: NotificationKind;
  title: string;
  detail: string;
  href: string;
}

/** Optional subtype toggles (default off, so the base two kinds are unchanged). */
export interface NotificationOptions {
  milestonesEnabled?: boolean;
  milestoneStep?: MilestoneStep;
  smartRemindersEnabled?: boolean;
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
  options: NotificationOptions = {},
): AppNotification[] {
  const { milestonesEnabled = false, milestoneStep = 20, smartRemindersEnabled = false } = options;
  const active = goals.filter((g) => !g.archived);
  const week = getWeekRange(now, weekStart);
  const weekKey = getDateKey(week.start);
  const nowKey = getDateKey(now);
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
    const needsAttention = since >= missedEntryDays;
    if (needsAttention) {
      out.push({
        id: `miss:${goal.id}`,
        kind: "needs-attention",
        title: `${goal.name} needs an entry`,
        detail: latest === null ? "No entries in the last 60 days." : `${since} days since your last entry.`,
        href: `/entry?goal=${goal.id}`,
      });
    }

    // Smart reminder: recently active but running out of week and off pace to hit.
    let remindedThisGoal = false;
    if (smartRemindersEnabled && !needsAttention && target > 0) {
      const remaining = target - progress;
      const daysLeft = daysBetween(nowKey, week.end);
      if (remaining > 0 && daysLeft <= 2 && pace.projected < target) {
        remindedThisGoal = true;
        out.push({
          id: `remind:${goal.id}:${weekKey}`,
          kind: "smart-reminder",
          title: `${goal.name} — finish the week strong`,
          detail: `${daysLeft <= 0 ? "Last day" : `${daysLeft} days left`} · ${formatAmount(remaining)} ${goal.unit} to go.`.trim(),
          href: `/entry?goal=${goal.id}`,
        });
      }
    }

    // Milestone: currently past a step boundary (e.g. 25/50/75%) but not yet hit.
    // Skipped when a smart reminder already covers this goal, to avoid two
    // overlapping nudges for the same goal in the same week.
    if (milestonesEnabled && !remindedThisGoal && target > 0) {
      const reached = Math.floor(pace.completion / milestoneStep) * milestoneStep;
      if (reached >= milestoneStep && reached < 100) {
        out.push({
          id: `milestone:${goal.id}:${weekKey}:${reached}`,
          kind: "goal-milestone",
          title: `${goal.name} — ${reached}% there`,
          detail: `${formatAmount(progress)} of ${formatAmount(target)} ${goal.unit} this week.`.trim(),
          href: "/week",
        });
      }
    }
  }

  return out;
}
