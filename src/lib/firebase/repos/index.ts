import type {
  CheckIn,
  CheckInEntry,
  Entry,
  Friend,
  Goal,
  GradeCriterion,
  GradeEntry,
  IdeaEntry,
  JournalEntry,
  PeriodSnapshot,
  PointTransaction,
  Reward,
  RewardPurchase,
  ScheduleBlock,
  Squad,
  TempPeriodGoal,
  TrashItem,
  Vacation,
} from "@/types/models";
import { CollectionRepo } from "./collection";

/**
 * One repo per subcollection under users/{uid}. Collection names here are the
 * migration write targets (see lib/migration/fromBlob.ts SPECS).
 */
export const goalsRepo = new CollectionRepo<Goal>("goals");
export const entriesRepo = new CollectionRepo<Entry>("entries");
export const checkInsRepo = new CollectionRepo<CheckIn>("checkIns");
export const checkInEntriesRepo = new CollectionRepo<CheckInEntry>("checkInEntries");
export const journalRepo = new CollectionRepo<JournalEntry>("journal");
export const ideasRepo = new CollectionRepo<IdeaEntry>("ideas");
export const schedulesRepo = new CollectionRepo<ScheduleBlock>("schedules");
export const snapshotsRepo = new CollectionRepo<PeriodSnapshot>("snapshots");
export const friendsRepo = new CollectionRepo<Friend>("friends");
export const squadsRepo = new CollectionRepo<Squad>("squads");
export const trashRepo = new CollectionRepo<TrashItem>("trash");
export const rewardsRepo = new CollectionRepo<Reward>("rewards");
export const rewardPurchasesRepo = new CollectionRepo<RewardPurchase>("rewardPurchases");
export const pointTransactionsRepo = new CollectionRepo<PointTransaction>("pointTransactions");
export const vacationsRepo = new CollectionRepo<Vacation>("vacations");
export const tempPeriodGoalsRepo = new CollectionRepo<TempPeriodGoal>("tempPeriodGoals");
export const gradeCriteriaRepo = new CollectionRepo<GradeCriterion>("gradeCriteria");
export const gradeEntriesRepo = new CollectionRepo<GradeEntry>("gradeEntries");
