import type { Goal, PeriodKind, SnapshotFilters, Vacation, WeekStart } from "@/types/models";
import type { DailyTotals } from "@/lib/domain/progress";
import type { DateRange } from "@/lib/domain/dates";
import type { PeriodGoalOverrides } from "@/lib/domain/targets";
import { where } from "firebase/firestore";
import { getDateKey } from "@/lib/domain/dates";
import { computeSnapshot } from "@/lib/domain/snapshot";
import { closeoutRefKey, newPointTransaction } from "@/lib/domain/points";
import { pointTransactionsRepo } from "@/lib/firebase/repos";

/**
 * Close out a period for reward points: compute the per-goal results for the
 * currently visible goals and award the earned close-out points once per period
 * (deduped by refKey). No snapshot is persisted — the snapshots feature was
 * removed; this exists purely to lock in points.
 *
 * Returns the number of points newly awarded (0 if already locked in / none).
 */
export async function closeOutPeriod(
  uid: string,
  params: {
    goals: Goal[];
    totals: DailyTotals;
    period: PeriodKind;
    range: DateRange;
    now: Date;
    weekStart: WeekStart;
    rewardPointsEnabled: boolean;
    overrides?: PeriodGoalOverrides;
    vacations?: Vacation[];
    filters: SnapshotFilters;
  },
): Promise<number> {
  const { summary } = computeSnapshot(params);
  if (!params.rewardPointsEnabled || summary.goalPointsEarned <= 0) return 0;

  const rangeStart = getDateKey(params.range.start);
  const refKey = closeoutRefKey(params.period, rangeStart);
  const existing = await pointTransactionsRepo.list(uid, where("refKey", "==", refKey));
  if (existing.length > 0) return 0;

  await pointTransactionsRepo.set(
    uid,
    newPointTransaction({
      type: "earn-closeout",
      amount: summary.goalPointsEarned,
      note: `${params.period} close-out (${rangeStart})`,
      refKey,
    }),
  );
  return summary.goalPointsEarned;
}
