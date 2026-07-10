import type {
  Goal,
  PeriodKind,
  PeriodSnapshot,
  SnapshotFilters,
  Vacation,
  WeekStart,
} from "@/types/models";
import type { DailyTotals } from "@/lib/domain/progress";
import type { DateRange } from "@/lib/domain/dates";
import type { PeriodGoalOverrides } from "@/lib/domain/targets";
import { where } from "firebase/firestore";
import { getDateKey } from "@/lib/domain/dates";
import { computeSnapshot } from "@/lib/domain/snapshot";
import { closeoutRefKey, newPointTransaction } from "@/lib/domain/points";
import { pointTransactionsRepo, snapshotsRepo } from "@/lib/firebase/repos";
import { createId } from "@/lib/id";

/**
 * Close out a period: compute the per-goal results for the currently visible
 * goals and persist an immutable PeriodSnapshot. Snapshots double as historical
 * pre-aggregates, so we store the resolved numbers rather than references.
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
): Promise<PeriodSnapshot> {
  const { summary, goals } = computeSnapshot(params);
  const snapshot: PeriodSnapshot = {
    id: createId(),
    period: params.period,
    rangeStart: getDateKey(params.range.start),
    rangeEnd: getDateKey(params.range.end),
    closedAt: new Date().toISOString(),
    filters: params.filters,
    summary,
    goals,
    checkIns: [],
  };
  await snapshotsRepo.set(uid, snapshot);

  // Award close-out points once per period (deduped by refKey) when enabled.
  if (params.rewardPointsEnabled && summary.goalPointsEarned > 0) {
    const refKey = closeoutRefKey(params.period, snapshot.rangeStart);
    const existing = await pointTransactionsRepo.list(uid, where("refKey", "==", refKey));
    if (existing.length === 0) {
      await pointTransactionsRepo.set(
        uid,
        newPointTransaction({
          type: "earn-closeout",
          amount: summary.goalPointsEarned,
          note: `${params.period} close-out (${snapshot.rangeStart})`,
          refKey,
        }),
      );
    }
  }

  return snapshot;
}
