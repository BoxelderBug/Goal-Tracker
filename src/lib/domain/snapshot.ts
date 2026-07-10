/**
 * Pure period close-out computation: given the goals visible in a period and the
 * daily totals, produce the per-goal results and rollup summary stored on a
 * PeriodSnapshot. No Firestore/id/clock access — the caller stamps id + closedAt.
 *
 * Points parity (legacy closeOutPeriod): a goal earns its per-period point value
 * only when the goal is hit AND reward points are enabled. Quarters have no
 * per-period point field, so they never award points.
 */
import type {
  Goal,
  PeriodKind,
  SnapshotGoal,
  SnapshotSummary,
  Vacation,
  WeekStart,
} from "@/types/models";
import type { DailyTotals } from "./progress";
import type { DateRange } from "./dates";
import { computePace, sumRange } from "./progress";
import { getTargetForPeriod, type PeriodGoalOverrides } from "./targets";

const POINTS_FIELD: Record<PeriodKind, "goalPointsWeekly" | "goalPointsMonthly" | "goalPointsYearly" | null> = {
  week: "goalPointsWeekly",
  month: "goalPointsMonthly",
  quarter: null,
  year: "goalPointsYearly",
};

export interface SnapshotComputation {
  summary: SnapshotSummary;
  goals: SnapshotGoal[];
}

export function computeSnapshot(params: {
  goals: Goal[];
  totals: DailyTotals;
  period: PeriodKind;
  range: DateRange;
  now: Date;
  weekStart: WeekStart;
  rewardPointsEnabled: boolean;
  overrides?: PeriodGoalOverrides;
  vacations?: Vacation[];
}): SnapshotComputation {
  const { goals, totals, period, range, now, weekStart, rewardPointsEnabled } = params;
  const pointsField = POINTS_FIELD[period];
  const targetContext = { weekStart, overrides: params.overrides, vacations: params.vacations };

  const snapshotGoals: SnapshotGoal[] = [];
  let totalProgress = 0;
  let totalTarget = 0;
  let completedGoalsCount = 0;
  let goalPointsEarned = 0;

  for (const goal of goals) {
    const progress = sumRange(totals, goal.id, range);
    const target = getTargetForPeriod(goal, period, range, targetContext);
    const hit = computePace(progress, target, range, now).goalHit;
    const pointsEarned =
      hit && rewardPointsEnabled && pointsField ? Number(goal[pointsField]) || 0 : 0;

    totalProgress += progress;
    totalTarget += target;
    if (hit) completedGoalsCount += 1;
    goalPointsEarned += pointsEarned;

    snapshotGoals.push({
      trackerId: goal.id,
      name: goal.name,
      unit: goal.unit,
      progress,
      target,
      hit,
      pointsEarned,
    });
  }

  const completion = totalTarget > 0 ? Math.round((totalProgress / totalTarget) * 100) : 0;

  const summary: SnapshotSummary = {
    completion,
    onPaceLabel: `${completedGoalsCount}/${goals.length} goals hit`,
    totalProgress,
    totalTarget,
    goalsCount: goals.length,
    checkInsCount: 0,
    completedGoalsCount,
    goalPointsEarned,
  };

  return { summary, goals: snapshotGoals };
}
