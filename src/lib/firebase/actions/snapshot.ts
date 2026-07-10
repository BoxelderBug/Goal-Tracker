import type {
  Goal,
  PeriodKind,
  PeriodSnapshot,
  SnapshotFilters,
  WeekStart,
} from "@/types/models";
import type { DailyTotals } from "@/lib/domain/progress";
import type { DateRange } from "@/lib/domain/dates";
import { getDateKey } from "@/lib/domain/dates";
import { computeSnapshot } from "@/lib/domain/snapshot";
import { snapshotsRepo } from "@/lib/firebase/repos";
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
  return snapshot;
}
