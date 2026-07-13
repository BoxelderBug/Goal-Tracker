/**
 * Build the denormalized goal summary an owner pushes onto a GoalShare so the
 * partner can see current-week progress without read access to the owner's
 * entries. Pure: no Firebase/React imports.
 */
import type { Entry, Goal, WeekStart } from "@/types/models";
import type { GoalShare } from "@/types/models";
import { getDateKey } from "./dates";
import { getWeekRange } from "./periods";
import { buildDailyTotals, sumRange } from "./progress";
import { getTargetForPeriod } from "./targets";

export type GoalSummary = NonNullable<GoalShare["goalSummary"]>;

export function buildGoalSummary(
  goal: Goal,
  entries: Entry[],
  weekStart: WeekStart,
  now: Date,
): GoalSummary {
  const week = getWeekRange(now, weekStart);
  const totals = buildDailyTotals(entries);
  return {
    period: "week",
    rangeStart: getDateKey(week.start),
    rangeEnd: getDateKey(week.end),
    progress: sumRange(totals, goal.id, week),
    target: getTargetForPeriod(goal, "week", week, { weekStart }),
    updatedAt: now.toISOString(),
  };
}
