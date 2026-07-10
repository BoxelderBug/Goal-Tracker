/**
 * Entity models for the Goal Tracker rewrite.
 *
 * Shapes are ported from the legacy normalizers in legacy/app.js
 * (loadTrackers ~15181, loadEntries ~15269, normalizeGoalsPlusConfig ~16167,
 * normalizeGoalsPlusEntryData ~16275, goal-form submit ~2032). Term and
 * input-output config (termDeadline, ioConfig, …) is included even though the
 * legacy loader dropped it on reload — that was a data-loss bug, not intent.
 *
 * All dates are YYYY-MM-DD strings ("date keys"); timestamps are ISO strings.
 */

export type DateKey = string; // YYYY-MM-DD
export type IsoTimestamp = string;

// ---------------------------------------------------------------------------
// Goals
// ---------------------------------------------------------------------------

export type GoalType =
  | "quantity"
  | "yesno"
  | "bucket"
  | "floating"
  | "term"
  | "week-term"
  | "month-term"
  | "input-output";

export type GoalsPlusMode =
  | "standard"
  | "goalsplus-running"
  | "goalsplus-golf"
  | "goalsplus-weight";

export type RunningWorkout =
  | "easy"
  | "tempo"
  | "long"
  | "norwegian4x4"
  | "intervals"
  | "hill-repeats"
  | "fartlek"
  | "recovery"
  | "progression"
  | "threshold"
  | "custom";

export type GolfType = "golf" | "disc-golf";
export type WeightUnit = "lbs" | "kg";

export interface GoalsPlusStandardConfig {
  mode: "standard";
}

export interface GoalsPlusRunningConfig {
  mode: "goalsplus-running";
  runningWorkout: RunningWorkout;
  /** mph, Norwegian 4x4 only */
  workSpeed: number;
  /** mph, Norwegian 4x4 only */
  recoverySpeed: number;
}

export interface GoalsPlusGolfConfig {
  mode: "goalsplus-golf";
  golfType: GolfType;
}

export interface GoalsPlusWeightConfig {
  mode: "goalsplus-weight";
  startingWeight: number;
  targetWeight: number;
  weightUnit: WeightUnit;
}

export type GoalsPlusConfig =
  | GoalsPlusStandardConfig
  | GoalsPlusRunningConfig
  | GoalsPlusGolfConfig
  | GoalsPlusWeightConfig;

export interface ProgressMetric {
  id: string;
  name: string;
  unit: string;
  weeklyTarget: number;
  monthlyTarget: number;
  yearlyTarget: number;
}

export interface Headwind {
  id: string;
  name: string;
  description: string;
  preventions: string[];
  recoveries: string[];
}

export interface TailwindFactor {
  id: string;
  name: string;
  description: string;
  howHelpsList: string[];
  howBuildList: string[];
}

export interface IoInput {
  id: string;
  name: string;
  unit: string;
  target: number;
}

export interface IoConfig {
  outputName: string;
  outputUnit: string;
  outputTarget: number;
  inputs: IoInput[];
}

export type AccountabilityStatus = "none" | "pending" | "approved" | "rejected";

export interface Goal {
  id: string;
  name: string;
  goalType: GoalType;
  archived: boolean;
  priority: number;
  tags: string[];
  unit: string;
  progressMetrics: ProgressMetric[];
  weeklyGoal: number;
  monthlyGoal: number;
  yearlyGoal: number;
  goalsPlus: GoalsPlusConfig;
  customWeeklyEnabled: boolean;
  /** 52 slots, W1–W52 */
  customWeeklyTargets: number[];
  customMonthlyEnabled: boolean;
  /** 12 slots, Jan–Dec */
  customMonthlyTargets: number[];
  goalPointsWeekly: number;
  goalPointsMonthly: number;
  goalPointsYearly: number;
  /** term / week-term / month-term goals */
  termDeadline: DateKey | "";
  termTarget: number;
  termCarryover: boolean;
  termToYear: boolean;
  /** input-output goals */
  ioConfig: IoConfig | null;
  accountabilityPartnerEmail: string;
  accountabilityPartnerName: string;
  accountabilityPartnerId: string;
  accountabilityShareId: string;
  accountabilityStatus: AccountabilityStatus;
  headwinds: Headwind[];
  tailwinds: TailwindFactor[];
  createdAt: IsoTimestamp;
}

// ---------------------------------------------------------------------------
// Entries
// ---------------------------------------------------------------------------

export interface RunningSplit {
  /** mile index, 1-based */
  mile: number;
  /** minutes for this mile */
  minutes: number;
}

export interface GoalsPlusRunningEntry {
  mode: "goalsplus-running";
  runningWorkout: RunningWorkout;
  distance: number;
  durationMinutes: number;
  paceMinutesPerMile: number;
  estimatedVo2: number;
  splits: RunningSplit[];
  workSpeed: number;
  recoverySpeed: number;
  customExerciseName: string;
  customReps: number;
  customWeight: number;
}

export interface GoalsPlusGolfEntry {
  mode: "goalsplus-golf";
  golfType: GolfType;
  score: number;
}

export type GoalsPlusEntryData = GoalsPlusRunningEntry | GoalsPlusGolfEntry;

export interface Entry {
  id: string;
  trackerId: string;
  date: DateKey;
  amount: number;
  notApplicable: boolean;
  goalsPlus: GoalsPlusEntryData | null;
  /** progressMetric id -> value */
  metricValues: Record<string, number>;
  notes: string;
  createdAt: IsoTimestamp;
  /** uid of the writer; differs from the owner for accountability-partner writes */
  createdBy?: string;
  /** present only on accountability-partner writes */
  shareId?: string;
}

// ---------------------------------------------------------------------------
// Check-ins
// ---------------------------------------------------------------------------

export type CheckInCadence = "weekly" | "monthly" | "yearly";

export interface CheckIn {
  id: string;
  name: string;
  cadence: CheckInCadence;
}

export interface CheckInEntry {
  id: string;
  checkInId: string;
  date: DateKey;
  completed: boolean;
  notes: string;
  createdAt: IsoTimestamp;
}

// ---------------------------------------------------------------------------
// Settings / profile
// ---------------------------------------------------------------------------

export type WeekStart = "monday" | "sunday";
export type ProjectionAverageSource = "period" | "year";
export type PerformanceMode = "standard" | "light";
export type MilestoneStep = 10 | 20 | 25;

export interface Settings {
  weekStart: WeekStart;
  compareToLastDefault: boolean;
  projectionAverageSource: ProjectionAverageSource;
  rewardPointsEnabled: boolean;
  pointStoreRewardsEnabled: boolean;
  bucketListEnabled: boolean;
  quartersEnabled: boolean;
  smartRemindersEnabled: boolean;
  missedEntryDays: number;
  milestoneNotificationsEnabled: boolean;
  milestoneStep: MilestoneStep;
  mobileQuickActionsEnabled: boolean;
  onboardingEnabled: boolean;
  performanceMode: PerformanceMode;
  ideasWeeklyGoal: number;
  theme: string;
}

export interface UserProfile {
  firstName: string;
  lastName: string;
  email: string;
  username: string;
  usernameKey: string;
  createdAt: IsoTimestamp;
}

export interface MigrationState {
  blobVersion: number;
  blobMigratedAt: IsoTimestamp;
  sourceUpdatedAt: IsoTimestamp | null;
}

/** The users/{uid} document. */
export interface UserDoc {
  profile: UserProfile;
  settings: Settings;
  migration?: MigrationState;
  createdAt: IsoTimestamp;
}

// ---------------------------------------------------------------------------
// Journal / ideas / schedules
// ---------------------------------------------------------------------------

export interface JournalEntry {
  id: string;
  date: DateKey;
  trackerId: string;
  goalName: string;
  title: string;
  content: string;
  createdAt: IsoTimestamp;
}

export type IdeaType = "idea" | "question";

export interface IdeaEntry {
  id: string;
  date: DateKey;
  type: IdeaType;
  content: string;
  createdAt: IsoTimestamp;
}

export interface ScheduleBlock {
  id: string;
  trackerId: string;
  date: DateKey;
  startTime: string; // HH:MM
  endTime: string; // HH:MM
  notes: string;
  createdAt: IsoTimestamp;
}

// ---------------------------------------------------------------------------
// Period snapshots (close-outs)
// ---------------------------------------------------------------------------

export type PeriodKind = "week" | "month" | "quarter" | "year";

export interface SnapshotFilters {
  type: string;
  status: string;
  tag: string;
}

export interface SnapshotSummary {
  completion: number;
  onPaceLabel: string;
  totalProgress: number;
  totalTarget: number;
  goalsCount: number;
  checkInsCount: number;
  completedGoalsCount: number;
  goalPointsEarned: number;
}

export interface SnapshotGoal {
  trackerId: string;
  name: string;
  unit: string;
  progress: number;
  target: number;
  hit: boolean;
  pointsEarned: number;
}

export interface SnapshotCheckIn {
  checkInId: string;
  name: string;
  completed: boolean;
}

export interface PeriodSnapshot {
  id: string;
  period: PeriodKind;
  rangeStart: DateKey;
  rangeEnd: DateKey;
  closedAt: IsoTimestamp;
  filters: SnapshotFilters;
  summary: SnapshotSummary;
  goals: SnapshotGoal[];
  checkIns: SnapshotCheckIn[];
}

// ---------------------------------------------------------------------------
// Social
// ---------------------------------------------------------------------------

export interface Friend {
  id: string;
  name: string;
  email: string;
  createdAt: IsoTimestamp;
}

export interface Squad {
  id: string;
  name: string;
  notes: string;
  weeklyGoal: number;
  memberEmails: string[];
  goalIds: string[];
  createdAt: IsoTimestamp;
}

export type GoalShareStatus = "pending" | "approved" | "rejected" | "removed";

/** Top-level goalTrackerGoalShares/{id} document. */
export interface GoalShare {
  id: string;
  ownerUid: string;
  ownerGoalId: string;
  ownerUsername: string;
  ownerEmail: string;
  partnerUid: string;
  partnerEmail: string;
  partnerName: string;
  goalName: string;
  goalUnit: string;
  status: GoalShareStatus;
  /** denormalized by the owner's client for the partner UI */
  goalSummary?: {
    period: PeriodKind;
    rangeStart: DateKey;
    rangeEnd: DateKey;
    progress: number;
    target: number;
    updatedAt: IsoTimestamp;
  };
  createdAt: IsoTimestamp;
  approvedAt: IsoTimestamp | null;
  updatedAt: IsoTimestamp;
}

// ---------------------------------------------------------------------------
// Gamification
// ---------------------------------------------------------------------------

export interface Reward {
  id: string;
  name: string;
  cost: number;
  notes: string;
  createdAt: IsoTimestamp;
}

export type RewardPurchaseStatus = "active" | "closed" | "refunded";

export interface RewardPurchase {
  id: string;
  rewardId: string;
  rewardName: string;
  cost: number;
  notes: string;
  status: RewardPurchaseStatus;
  purchasedAt: IsoTimestamp;
  closedAt: IsoTimestamp | null;
  refundedAt: IsoTimestamp | null;
}

export type PointTransactionType =
  | "earn-closeout"
  | "spend-reward"
  | "refund-reward"
  | "adjustment";

export interface PointTransaction {
  id: string;
  type: PointTransactionType;
  amount: number;
  createdAt: IsoTimestamp;
  note: string;
  /** dedupe key for close-out earnings */
  refKey: string;
  rewardId: string;
}

// ---------------------------------------------------------------------------
// Trash
// ---------------------------------------------------------------------------

export type TrashItemType = "goal" | "checkin" | "entry" | "friend" | "squad";

export interface TrashItem {
  id: string;
  itemType: TrashItemType;
  payload: Record<string, unknown>;
  label: string;
  deletedAt: IsoTimestamp;
}

// ---------------------------------------------------------------------------
// Period adjustments
// ---------------------------------------------------------------------------

export interface Vacation {
  id: string;
  name: string;
  startDate: DateKey;
  endDate: DateKey;
  pausedGoalIds: string[];
  adjustTargets: boolean;
}

export interface TempPeriodGoal {
  id: string;
  name: string;
  unit: string;
  target: number;
  periodKey: string;
  periodName: string;
  periodStart: DateKey;
  periodEnd: DateKey;
}

/** meta/periodGoalOverrides + meta/stretchGoals docs: keyed scalar maps. */
export interface KeyedValueMapDoc {
  values: Record<string, number>;
}

// ---------------------------------------------------------------------------
// Notifications
// ---------------------------------------------------------------------------

export type NotificationType =
  | "friend-added"
  | "goal-share-invite"
  | "goal-share-approved"
  | "goal-share-rejected"
  | "goal-share-entry-update"
  | "goal-hit"
  | "goal-milestone"
  | "period-close-ready"
  | "smart-reminder";

/** Top-level goalTrackerNotifications/{id} document. */
export interface AppNotification {
  id: string;
  type: NotificationType;
  recipientId: string;
  actorId: string;
  actorUsername: string;
  actorEmail: string;
  shareId: string;
  goalName: string;
  goalUnit: string;
  period: string;
  rangeStart: DateKey | "";
  rangeEnd: DateKey | "";
  progress: number;
  target: number;
  hitKey: string;
  entryAmount: number;
  entryDate: DateKey | "";
  friendLabel: string;
  milestonePercent: number;
  reminderDays: number;
  read: boolean;
  actioned: boolean;
  createdAt: IsoTimestamp;
}
