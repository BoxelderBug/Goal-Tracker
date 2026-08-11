/**
 * Challenges: a time-boxed push on a single goal, alongside that goal's own
 * weekly/monthly/yearly targets. Progress is just the goal's logged amounts
 * inside the window, so one challenge type serves every goal type — miles for
 * a running goal, days for a yes/no goal, pages for a reading goal.
 */
import type { Challenge, Entry } from "@/types/models";
import { dateKeyToDayNumber } from "@/lib/domain/dates";

export type ChallengeStatus = "upcoming" | "active" | "complete" | "expired";

export interface ChallengeProgress {
  /** amount logged inside the challenge window, in the goal's unit */
  amount: number;
  /** amount still to go; 0 once the target is met */
  remaining: number;
  /** completion %, one decimal; can exceed 100 */
  percent: number;
  /** whole days from today to the due date — 0 means due today, 0 once past */
  daysRemaining: number;
  status: ChallengeStatus;
  tone: "hit" | "onpace" | "behind" | "missed";
  /** per-day amount needed over the days left (today counts); 0 when done or past due */
  requiredPerDay: number;
  /** amount logged per FINISHED day so far; 0 before the window opens */
  avgPerDay: number;
  /** where the current average lands by the due date */
  projected: number;
  /** projected as a % of target, one decimal; 0 without a target */
  projectedPercent: number;
}

const round2 = (n: number) => Math.round(n * 100) / 100;

/**
 * Progress of one challenge against the full entry list. Entries count when
 * they belong to the challenge's goal and fall inside [startDate, dueDate];
 * pace is judged against a flat spread of the target across the window, so
 * "behind" means behind an even split, not behind any plan of the user's.
 */
export function computeChallengeProgress(
  challenge: Challenge,
  entries: Entry[],
  todayKey: string,
): ChallengeProgress {
  const target = challenge.target;
  const amount = round2(
    entries
      .filter(
        (e) =>
          e.trackerId === challenge.goalId &&
          e.date >= challenge.startDate &&
          e.date <= challenge.dueDate,
      )
      .reduce((sum, e) => sum + (Number(e.amount) || 0), 0),
  );

  const today = dateKeyToDayNumber(todayKey);
  const start = dateKeyToDayNumber(challenge.startDate);
  const due = dateKeyToDayNumber(challenge.dueDate);

  const complete = target > 0 && amount >= target;
  const pastDue = today > due;
  const status: ChallengeStatus = complete
    ? "complete"
    : pastDue
      ? "expired"
      : today < start
        ? "upcoming"
        : "active";

  // days still available, today included — the divisor for the required pace
  const daysLeftInclusive = pastDue ? 0 : due - today + 1;
  const remaining = complete ? 0 : Math.max(round2(target - amount), 0);

  // Daily average so far and where it lands by the due date, using the same
  // divisor rule as progress.ts getProjectionDays: today is still in progress,
  // so it is not counted as a finished day. What is logged today still counts
  // toward the amount — the day just is not treated as spent.
  const totalDays = Math.max(due - start + 1, 1);
  const elapsedDays = Math.min(Math.max(today - start + 1, 1), totalDays);
  const projectionDays = pastDue ? elapsedDays : Math.max(elapsedDays - 1, 1);
  const started = today >= start;
  const avgPerDay = started ? round2(amount / projectionDays) : 0;
  const projected = round2(avgPerDay * totalDays);

  return {
    amount,
    remaining,
    percent: target > 0 ? Math.round((amount / target) * 1000) / 10 : 0,
    daysRemaining: Math.max(due - today, 0),
    status,
    tone: challengeTone(status, projected, target),
    requiredPerDay: daysLeftInclusive > 0 && remaining > 0 ? round2(remaining / daysLeftInclusive) : 0,
    avgPerDay,
    projected,
    projectedPercent: target > 0 ? Math.round((projected / target) * 1000) / 10 : 0,
  };
}

/**
 * Same tiers as progress.ts `paceTone`, so a challenge bar means what a
 * week/month/year bar means: on pace to finish, short of it, or badly short.
 * An upcoming challenge reads neutral — there is no pace to judge yet.
 */
function challengeTone(
  status: ChallengeStatus,
  projected: number,
  target: number,
): ChallengeProgress["tone"] {
  if (status === "complete") return "hit";
  if (status === "expired") return "missed";
  if (status === "upcoming" || target <= 0) return "onpace";
  if (projected >= target) return "onpace";
  return projected >= target * 0.75 ? "behind" : "missed";
}

/** Live challenges first (soonest due leading), finished and lapsed ones after. */
export function compareChallenges(
  a: { challenge: Challenge; progress: ChallengeProgress },
  b: { challenge: Challenge; progress: ChallengeProgress },
): number {
  const rank = (status: ChallengeStatus) =>
    status === "active" ? 0 : status === "upcoming" ? 1 : status === "complete" ? 2 : 3;
  const byStatus = rank(a.progress.status) - rank(b.progress.status);
  if (byStatus !== 0) return byStatus;
  // within a status: soonest due first for live ones, most recent first for done
  const done = a.progress.status === "complete" || a.progress.status === "expired";
  return done
    ? b.challenge.dueDate.localeCompare(a.challenge.dueDate)
    : a.challenge.dueDate.localeCompare(b.challenge.dueDate);
}
