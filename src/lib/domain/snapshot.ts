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
  PeriodSnapshot,
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

// ---------------------------------------------------------------------------
// Target reality check: what the closed weeks say about the targets
// ---------------------------------------------------------------------------

/** minimum closed weeks before any verdict */
const MIN_REALITY_WEEKS = 8;
/** below this hit rate a target has stopped being a target */
const LOW_HIT_PCT = 30;
/** above this (and with the larger sample) it's a floor, not a target */
const HIGH_HIT_PCT = 90;
const MIN_RAISE_WEEKS = 10;

export interface TargetReality {
  goalId: string;
  name: string;
  unit: string;
  /** closed weeks with a target for this goal */
  weeks: number;
  hits: number;
  hitPct: number;
  verdict: "lower" | "raise";
  /** the target from the most recently closed week */
  currentTarget: number;
  /** lower: your 30th-percentile week (cleared ~70% of the time);
   *  raise: your median week */
  recommendedTarget: number;
}

/**
 * Reads week close-out snapshots — which escape the client's rolling entries
 * window and already reflect overrides/vacation proration — and flags targets
 * that have drifted out of the useful 30–90% hit band. Calibrated targets stay
 * silent. Duplicate close-outs of the same week count once (latest wins).
 */
export function computeTargetReality(goals: Goal[], snapshots: PeriodSnapshot[]): TargetReality[] {
  const weekRows = new Map<string, Map<string, SnapshotGoal>>(); // trackerId -> rangeStart -> row
  const seenAt = new Map<string, string>(); // `${trackerId}|${rangeStart}` -> closedAt
  for (const snap of snapshots) {
    if (snap.period !== "week") continue;
    for (const row of snap.goals) {
      if (!(row.target > 0)) continue;
      const key = `${row.trackerId}|${snap.rangeStart}`;
      if ((seenAt.get(key) ?? "") > snap.closedAt) continue;
      seenAt.set(key, snap.closedAt);
      const byWeek = weekRows.get(row.trackerId) ?? new Map<string, SnapshotGoal>();
      byWeek.set(snap.rangeStart, row);
      weekRows.set(row.trackerId, byWeek);
    }
  }

  const out: TargetReality[] = [];
  for (const goal of goals) {
    if (goal.archived) continue;
    const byWeek = weekRows.get(goal.id);
    if (!byWeek || byWeek.size < MIN_REALITY_WEEKS) continue;
    const weeks = [...byWeek.entries()].sort((a, b) => (a[0] < b[0] ? -1 : 1)).map(([, r]) => r);
    const hits = weeks.filter((w) => w.hit).length;
    const hitPct = Math.round((hits / weeks.length) * 100);
    const currentTarget = weeks[weeks.length - 1].target;
    const progresses = weeks.map((w) => w.progress).sort((a, b) => a - b);

    if (hitPct < LOW_HIT_PCT) {
      // the level cleared ~70% of the time = 30th percentile week
      const idx = Math.max(0, Math.ceil(0.3 * progresses.length) - 1);
      const recommended = Math.max(1, Math.round(progresses[idx]));
      if (recommended < currentTarget) {
        out.push({
          goalId: goal.id, name: goal.name, unit: goal.unit,
          weeks: weeks.length, hits, hitPct,
          verdict: "lower", currentTarget, recommendedTarget: recommended,
        });
      }
    } else if (hitPct > HIGH_HIT_PCT && weeks.length >= MIN_RAISE_WEEKS) {
      const recommended = Math.round(progresses[Math.floor(progresses.length / 2)]);
      if (recommended > currentTarget) {
        out.push({
          goalId: goal.id, name: goal.name, unit: goal.unit,
          weeks: weeks.length, hits, hitPct,
          verdict: "raise", currentTarget, recommendedTarget: recommended,
        });
      }
    }
  }
  return out;
}
