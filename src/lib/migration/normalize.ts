/**
 * Entity normalizers for migration, ported from the legacy load* and
 * normalize* functions in legacy/app.js. They accept raw blob/JSON-backup items and
 * return typed, cleaned entities â€” the same dirt tolerance as legacy (string
 * booleans/amounts, missing arrays, legacy field aliases), plus preservation
 * of the term/ioConfig fields the legacy loader dropped.
 */
import type {
  CheckIn,
  CheckInEntry,
  Entry,
  Friend,
  Goal,
  GoalsPlusConfig,
  GoalsPlusEntryData,
  GoalType,
  Headwind,
  IdeaEntry,
  IoConfig,
  JournalEntry,
  PeriodSnapshot,
  PointTransaction,
  ProgressMetric,
  Reward,
  RewardPurchase,
  RunningSplit,
  RunningWorkout,
  ScheduleBlock,
  Settings,
  Squad,
  TailwindFactor,
  TempPeriodGoal,
  TrashItem,
  Vacation,
} from "@/types/models";
import { isDateKey } from "@/lib/domain/dates";
import { runningMetricUnit } from "@/lib/domain/goalsplus";
import {
  normalizeGoalPoints,
  normalizeGoalPriority,
  normalizeGoalTargetInt,
  normalizePositiveAmount,
} from "@/lib/domain/numbers";
import { normalizeCustomTargetList } from "@/lib/domain/targets";
import { MONTH_TEMPLATE_COUNT, WEEK_TEMPLATE_COUNT } from "@/lib/domain/periods";

type Raw = Record<string, unknown>;

/** Deterministic context: two migration runs over the same blob must produce identical docs. */
export interface NormalizeCtx {
  todayKey: string;
  nowIso: string;
}

const RUNNING_WORKOUTS: RunningWorkout[] = [
  "easy",
  "tempo",
  "long",
  "norwegian4x4",
  "intervals",
  "hill-repeats",
  "fartlek",
  "recovery",
  "progression",
  "threshold",
  "custom",
];

const TREADMILL_SPEED_MAX_MPH = 20;
const NORWEGIAN_DEFAULT_WORK_SPEED_MPH = 8;
const NORWEGIAN_DEFAULT_RECOVERY_SPEED_MPH = 4;
const RUNNING_SPLITS_MAX = 50;

const str = (value: unknown): string => String(value ?? "").trim();
const bool = (value: unknown): boolean => value === true || value === "true" || value === 1;
const isoOr = (value: unknown, fallback: string): string => (typeof value === "string" && value ? value : fallback);
const isoOrNull = (value: unknown): string | null => (typeof value === "string" && value ? value : null);
const isRaw = (value: unknown): value is Raw => Boolean(value) && typeof value === "object" && !Array.isArray(value);

function stringList(value: unknown): string[] {
  return Array.isArray(value) ? value.map(str).filter(Boolean) : [];
}

export function normalizeEmail(value: unknown): string {
  return str(value).toLowerCase();
}

export function normalizeGoalType(value: unknown): GoalType {
  const known: GoalType[] = [
    "yesno",
    "bucket",
    "floating",
    "term",
    "week-term",
    "month-term",
    "input-output",
  ];
  return known.includes(value as GoalType) ? (value as GoalType) : "quantity";
}

export function normalizeGoalTags(value: unknown): string[] {
  const parts = Array.isArray(value) ? value : String(value ?? "").split(/[,\n;|]/g);
  const normalized: string[] = [];
  const seen = new Set<string>();
  for (const part of parts) {
    const trimmed = String(part ?? "").trim().replace(/\s+/g, " ");
    if (!trimmed) continue;
    const key = trimmed.toLowerCase();
    if (seen.has(key)) continue;
    seen.add(key);
    normalized.push(trimmed.slice(0, 30));
  }
  return normalized.slice(0, 12);
}

export function normalizeGoalUnit(value: unknown): string {
  return str(value) || "units";
}

function lockedUnitForGoalType(goalType: GoalType): string {
  if (goalType === "yesno") return "days";
  if (goalType === "bucket") return "items";
  return "";
}

function normalizeRunningWorkout(value: unknown): RunningWorkout {
  return RUNNING_WORKOUTS.includes(value as RunningWorkout) ? (value as RunningWorkout) : "easy";
}

function normalizeRunningSpeedMph(value: unknown, fallback: number): number {
  const normalizedFallback = Math.min(Math.max(normalizePositiveAmount(fallback, 0), 0), TREADMILL_SPEED_MAX_MPH);
  const normalized = normalizePositiveAmount(value, -1);
  if (normalized <= 0 || normalized > TREADMILL_SPEED_MAX_MPH) {
    return normalizedFallback;
  }
  return normalized;
}

export function normalizeGoalsPlusConfig(value: unknown): GoalsPlusConfig {
  const raw = isRaw(value) ? value : {};
  const mode = raw.mode;
  if (mode === "goalsplus-running") {
    const runningWorkout = normalizeRunningWorkout(raw.runningWorkout);
    const isNorwegian = runningWorkout === "norwegian4x4";
    const rawWork = raw.workSpeed ?? raw.workIntervalSec;
    const rawRecovery = raw.recoverySpeed ?? raw.recoveryIntervalSec;
    return {
      mode,
      runningWorkout,
      primaryMetric:
        raw.primaryMetric === "runs" || raw.primaryMetric === "type-runs" ? raw.primaryMetric : "distance",
      primaryRunType: normalizeRunningWorkout(raw.primaryRunType ?? raw.runningWorkout),
      raceDistance: normalizePositiveAmount(raw.raceDistance, 0),
      raceTargetMinutes: normalizePositiveAmount(raw.raceTargetMinutes, 0),
      workSpeed: isNorwegian ? normalizeRunningSpeedMph(rawWork, NORWEGIAN_DEFAULT_WORK_SPEED_MPH) : 0,
      recoverySpeed: isNorwegian
        ? normalizeRunningSpeedMph(rawRecovery, NORWEGIAN_DEFAULT_RECOVERY_SPEED_MPH)
        : 0,
    };
  }
  if (mode === "goalsplus-golf") {
    return {
      mode,
      golfType: raw.golfType === "disc-golf" ? "disc-golf" : "golf",
    };
  }
  if (mode === "goalsplus-weight") {
    return {
      mode,
      startingWeight: normalizePositiveAmount(raw.startingWeight, 0),
      targetWeight: normalizePositiveAmount(raw.targetWeight, 0),
      weightUnit: raw.weightUnit === "kg" ? "kg" : "lbs",
    };
  }
  if (mode === "goalsplus-reading") return { mode };
  return { mode: "standard" };
}

function normalizeProgressMetrics(value: unknown, fallbackUnit: string): ProgressMetric[] {
  if (!Array.isArray(value)) return [];
  const metrics: ProgressMetric[] = [];
  for (const raw of value) {
    if (!isRaw(raw)) continue;
    const id = str(raw.id);
    const name = str(raw.name).replace(/\s+/g, " ").slice(0, 60);
    if (!id || !name) continue;
    metrics.push({
      id,
      name,
      unit: str(raw.unit) || fallbackUnit,
      weeklyTarget: normalizeGoalTargetInt(raw.weeklyTarget, 0),
      monthlyTarget: normalizeGoalTargetInt(raw.monthlyTarget, 0),
      yearlyTarget: normalizeGoalTargetInt(raw.yearlyTarget, 0),
    });
  }
  return metrics;
}

function normalizeHeadwinds(value: unknown): Headwind[] {
  if (!Array.isArray(value)) return [];
  const items: Headwind[] = [];
  for (const raw of value) {
    if (!isRaw(raw)) continue;
    const id = str(raw.id);
    const name = str(raw.name);
    if (!id || !name) continue;
    items.push({
      id,
      name,
      description: str(raw.description),
      preventions: stringList(raw.preventions),
      recoveries: stringList(raw.recoveries),
    });
  }
  return items;
}

function normalizeTailwinds(value: unknown): TailwindFactor[] {
  if (!Array.isArray(value)) return [];
  const items: TailwindFactor[] = [];
  for (const raw of value) {
    if (!isRaw(raw)) continue;
    const id = str(raw.id);
    const name = str(raw.name);
    if (!id || !name) continue;
    items.push({
      id,
      name,
      description: str(raw.description),
      howHelpsList: stringList(raw.howHelpsList),
      howBuildList: stringList(raw.howBuildList),
    });
  }
  return items;
}

function normalizeIoConfig(value: unknown): IoConfig | null {
  if (!isRaw(value)) return null;
  const outputName = str(value.outputName);
  if (!outputName) return null;
  const inputs = Array.isArray(value.inputs) ? value.inputs : [];
  return {
    outputName,
    outputUnit: str(value.outputUnit),
    outputTarget: normalizeGoalTargetInt(value.outputTarget, 0),
    inputs: inputs.filter(isRaw).map((input, index) => ({
      id: str(input.id) || `io-${index}`,
      name: str(input.name),
      unit: str(input.unit),
      target: normalizeGoalTargetInt(input.target, 0),
    })),
  };
}

const normalizeAccountabilityStatus = (value: unknown): Goal["accountabilityStatus"] => {
  const normalized = String(value ?? "").toLowerCase();
  if (normalized === "approved" || normalized === "rejected" || normalized === "pending") {
    return normalized;
  }
  return "none";
};

export function normalizeGoal(raw: unknown, ctx: NormalizeCtx): Goal | null {
  if (!isRaw(raw) || typeof raw.id !== "string") return null;
  const goalType = normalizeGoalType(raw.goalType);
  const weeklyGoal = normalizeGoalTargetInt(raw.weeklyGoal, 0);
  const monthlyGoal = normalizeGoalTargetInt(raw.monthlyGoal, 0);
  const yearlyGoal = normalizeGoalTargetInt(raw.yearlyGoal, 0);
  let unit =
    lockedUnitForGoalType(goalType) ||
    (goalType === "floating" && !str(raw.unit) ? "items" : normalizeGoalUnit(raw.unit));
  const goalsPlus = normalizeGoalsPlusConfig(raw.goalsPlus);
  if (goalsPlus.mode === "goalsplus-running" && (!unit || unit === "units")) {
    unit = runningMetricUnit(goalsPlus.primaryMetric ?? "distance");
  }
  if (goalsPlus.mode === "goalsplus-golf" && (!unit || unit === "units")) unit = "strokes";
  if (goalsPlus.mode === "goalsplus-reading" && (!unit || unit === "units")) unit = "books";

  const hasLegacyPoints = raw.goalPoints !== undefined && raw.goalPoints !== null && raw.goalPoints !== "";
  const legacyPoints = hasLegacyPoints ? normalizeGoalPoints(raw.goalPoints, 1) : null;

  return {
    id: raw.id,
    name: str(raw.name) || "Untitled goal",
    goalType,
    archived: bool(raw.archived),
    priority: normalizeGoalPriority(raw.priority, 0),
    tags: normalizeGoalTags(raw.tags),
    unit,
    progressMetrics: normalizeProgressMetrics(raw.progressMetrics, unit),
    weeklyGoal,
    monthlyGoal,
    yearlyGoal,
    goalsPlus,
    customWeeklyEnabled: Boolean(raw.customWeeklyEnabled),
    customWeeklyTargets: normalizeCustomTargetList(raw.customWeeklyTargets, WEEK_TEMPLATE_COUNT, weeklyGoal),
    customMonthlyEnabled: Boolean(raw.customMonthlyEnabled),
    customMonthlyTargets: normalizeCustomTargetList(raw.customMonthlyTargets, MONTH_TEMPLATE_COUNT, monthlyGoal),
    goalPointsWeekly: normalizeGoalPoints(raw.goalPointsWeekly, legacyPoints === null ? 1 : legacyPoints),
    goalPointsMonthly: normalizeGoalPoints(raw.goalPointsMonthly, legacyPoints === null ? 3 : legacyPoints),
    goalPointsYearly: normalizeGoalPoints(raw.goalPointsYearly, legacyPoints === null ? 10 : legacyPoints),
    termDeadline: isDateKey(raw.termDeadline) ? raw.termDeadline : "",
    termTarget: normalizeGoalTargetInt(raw.termTarget, 0),
    termCarryover: Boolean(raw.termCarryover),
    termToYear: Boolean(raw.termToYear),
    ioConfig: normalizeIoConfig(raw.ioConfig),
    accountabilityPartnerEmail: normalizeEmail(raw.accountabilityPartnerEmail),
    accountabilityPartnerName: str(raw.accountabilityPartnerName),
    accountabilityPartnerId: typeof raw.accountabilityPartnerId === "string" ? raw.accountabilityPartnerId : "",
    accountabilityShareId: typeof raw.accountabilityShareId === "string" ? raw.accountabilityShareId : "",
    accountabilityStatus: normalizeAccountabilityStatus(raw.accountabilityStatus),
    headwinds: normalizeHeadwinds(raw.headwinds),
    tailwinds: normalizeTailwinds(raw.tailwinds),
    createdAt: isoOr(raw.createdAt, ctx.nowIso),
  };
}

function paceMinutesPerMile(distance: number, duration: number): number {
  if (distance <= 0 || duration <= 0) return 0;
  return duration / distance;
}

function normalizeRunningSplits(value: unknown): RunningSplit[] {
  if (!Array.isArray(value)) return [];
  const splits: RunningSplit[] = [];
  for (const raw of value) {
    if (!isRaw(raw)) continue;
    const distance = normalizePositiveAmount(raw.distance, 0);
    const durationMinutes = normalizePositiveAmount(raw.durationMinutes, 0);
    if (distance <= 0 || durationMinutes <= 0) continue;
    splits.push({ distance, durationMinutes, paceMinutesPerMile: paceMinutesPerMile(distance, durationMinutes) });
    if (splits.length >= RUNNING_SPLITS_MAX) break;
  }
  return splits;
}

function estimatedRunningVo2(distance: number, duration: number): number {
  if (distance <= 0 || duration <= 0) return 0;
  const metersPerMinute = (distance * 1609.34) / duration;
  return Math.round((3.5 + 0.2 * metersPerMinute) * 10) / 10;
}

function normalizeGolfScore(value: unknown, fallback = 0): number {
  const normalizedFallback = Math.max(Math.floor(normalizePositiveAmount(fallback, 0)), 0);
  const normalized = Math.floor(normalizePositiveAmount(value, -1));
  if (!Number.isFinite(normalized) || normalized < 0) return normalizedFallback;
  return normalized;
}

export function normalizeGoalsPlusEntryData(entryRaw: Raw): GoalsPlusEntryData | null {
  const raw = isRaw(entryRaw.goalsPlus) ? entryRaw.goalsPlus : null;
  if (!raw) return null;
  if (raw.mode === "goalsplus-golf") {
    return {
      mode: "goalsplus-golf",
      golfType: raw.golfType === "disc-golf" ? "disc-golf" : "golf",
      score: normalizeGolfScore(raw.score, 0),
    };
  }
  if (raw.mode === "goalsplus-reading") {
    return {
      mode: "goalsplus-reading",
      bookTitle: str(raw.bookTitle).replace(/\s+/g, " ").slice(0, 200),
      author: str(raw.author).replace(/\s+/g, " ").slice(0, 120),
      pages: Math.max(Math.floor(normalizePositiveAmount(raw.pages, 0)), 0),
      rating: Math.min(Math.max(Math.floor(normalizePositiveAmount(raw.rating, 0)), 0), 5),
      dateResolution: raw.dateResolution === "year" ? "year" : "day",
    };
  }
  if (raw.mode !== "goalsplus-running") return null;
  const runningWorkout = normalizeRunningWorkout(raw.runningWorkout);
  const distance = normalizePositiveAmount(raw.distance, 0);
  const durationMinutes = normalizePositiveAmount(raw.durationMinutes, 0);
  const isNorwegian = runningWorkout === "norwegian4x4";
  const isCustom = runningWorkout === "custom";
  const rawWork = raw.workSpeed ?? raw.workIntervalSec;
  const rawRecovery = raw.recoverySpeed ?? raw.recoveryIntervalSec;
  return {
    mode: "goalsplus-running",
    runningWorkout,
    distance,
    durationMinutes,
    paceMinutesPerMile: paceMinutesPerMile(distance, durationMinutes),
    estimatedVo2: estimatedRunningVo2(distance, durationMinutes),
    avgInclinePct: normalizePositiveAmount(raw.avgInclinePct, 0),
    splits: normalizeRunningSplits(raw.splits),
    workSpeed: isNorwegian ? normalizeRunningSpeedMph(rawWork, 0) : 0,
    recoverySpeed: isNorwegian ? normalizeRunningSpeedMph(rawRecovery, 0) : 0,
    customExerciseName: isCustom ? str(raw.customExerciseName).replace(/\s+/g, " ").slice(0, 80) : "",
    customReps: isCustom ? Math.max(Math.floor(normalizePositiveAmount(raw.customReps, 0)), 0) : 0,
    customWeight: isCustom ? normalizePositiveAmount(raw.customWeight, 0) : 0,
  };
}

function normalizeEntryMetricValues(value: unknown): Record<string, number> {
  if (!isRaw(value)) return {};
  const normalized: Record<string, number> = {};
  for (const [metricIdRaw, metricValue] of Object.entries(value)) {
    const metricId = str(metricIdRaw);
    if (!metricId) continue;
    const amount = normalizePositiveAmount(metricValue, -1);
    if (amount < 0) continue;
    normalized[metricId] = amount;
  }
  return normalized;
}

export function normalizeEntry(raw: unknown, ctx: NormalizeCtx): Entry | null {
  if (!isRaw(raw) || typeof raw.id !== "string") return null;
  const trackerId = typeof raw.trackerId === "string" ? raw.trackerId : "";
  if (!trackerId) return null;
  return {
    id: raw.id,
    trackerId,
    date: isDateKey(raw.date) ? raw.date : ctx.todayKey,
    amount: normalizePositiveAmount(raw.amount, 0),
    notApplicable: bool(raw.notApplicable),
    goalsPlus: normalizeGoalsPlusEntryData(raw),
    metricValues: normalizeEntryMetricValues(raw.metricValues),
    notes: str(raw.notes),
    createdAt: isoOr(raw.createdAt, ctx.nowIso),
  };
}

export function normalizeCheckIn(raw: unknown): CheckIn | null {
  if (!isRaw(raw) || typeof raw.id !== "string") return null;
  const name = str(raw.name);
  if (!name) return null;
  const cadence = raw.cadence === "monthly" || raw.cadence === "yearly" ? raw.cadence : "weekly";
  return { id: raw.id, name, cadence };
}

export function normalizeCheckInEntry(raw: unknown, ctx: NormalizeCtx): CheckInEntry | null {
  if (!isRaw(raw) || typeof raw.id !== "string") return null;
  const checkInId = typeof raw.checkInId === "string" ? raw.checkInId : "";
  if (!checkInId) return null;
  return {
    id: raw.id,
    checkInId,
    date: isDateKey(raw.date) ? raw.date : ctx.todayKey,
    completed: bool(raw.completed),
    notes: str(raw.notes),
    createdAt: isoOr(raw.createdAt, ctx.nowIso),
  };
}

export function normalizeJournalEntry(raw: unknown, ctx: NormalizeCtx): JournalEntry | null {
  if (!isRaw(raw) || typeof raw.id !== "string") return null;
  const content = str(raw.content);
  if (!content) return null;
  return {
    id: raw.id,
    date: isDateKey(raw.date) ? raw.date : ctx.todayKey,
    trackerId: typeof raw.trackerId === "string" ? raw.trackerId : "",
    goalName: str(raw.goalName),
    title: str(raw.title),
    content,
    createdAt: isoOr(raw.createdAt, ctx.nowIso),
  };
}

export function normalizeIdeaEntry(raw: unknown, ctx: NormalizeCtx): IdeaEntry | null {
  if (!isRaw(raw) || typeof raw.id !== "string") return null;
  const content = str(raw.content);
  if (!content) return null;
  return {
    id: raw.id,
    date: isDateKey(raw.date) ? raw.date : ctx.todayKey,
    type: raw.type === "question" ? "question" : "idea",
    content,
    createdAt: isoOr(raw.createdAt, ctx.nowIso),
  };
}

export function normalizeSchedule(raw: unknown, ctx: NormalizeCtx): ScheduleBlock | null {
  if (!isRaw(raw) || typeof raw.id !== "string") return null;
  const trackerId = typeof raw.trackerId === "string" ? raw.trackerId : "";
  if (!trackerId) return null;
  const isTime = (value: unknown) => /^([01]\d|2[0-3]):[0-5]\d$/.test(String(value ?? ""));
  // legacy single `time` field migrates to startTime
  const startTime = isTime(raw.startTime) ? String(raw.startTime) : isTime(raw.time) ? String(raw.time) : "";
  return {
    id: raw.id,
    trackerId,
    date: isDateKey(raw.date) ? raw.date : ctx.todayKey,
    startTime,
    endTime: isTime(raw.endTime) ? String(raw.endTime) : "",
    notes: str(raw.notes),
    createdAt: isoOr(raw.createdAt, ctx.nowIso),
  };
}

export function normalizeSnapshot(raw: unknown, ctx: NormalizeCtx): PeriodSnapshot | null {
  if (!isRaw(raw) || typeof raw.id !== "string") return null;
  const period =
    raw.period === "month" || raw.period === "quarter" || raw.period === "year" ? raw.period : "week";
  if (!isDateKey(raw.rangeStart) || !isDateKey(raw.rangeEnd)) return null;
  const filters = isRaw(raw.filters) ? raw.filters : {};
  const summary = isRaw(raw.summary) ? raw.summary : {};
  return {
    id: raw.id,
    period,
    rangeStart: raw.rangeStart,
    rangeEnd: raw.rangeEnd,
    closedAt: isoOr(raw.closedAt, ctx.nowIso),
    filters: {
      type: str(filters.type) || "all",
      status: str(filters.status) || "all",
      tag: str(filters.tag) || "all",
    },
    summary: {
      completion: normalizePositiveAmount(summary.completion, 0),
      onPaceLabel: str(summary.onPaceLabel),
      totalProgress: normalizePositiveAmount(summary.totalProgress, 0),
      totalTarget: normalizePositiveAmount(summary.totalTarget, 0),
      goalsCount: normalizeGoalTargetInt(summary.goalsCount, 0),
      checkInsCount: normalizeGoalTargetInt(summary.checkInsCount, 0),
      completedGoalsCount: normalizeGoalTargetInt(summary.completedGoalsCount, 0),
      goalPointsEarned: normalizeGoalTargetInt(summary.goalPointsEarned, 0),
    },
    goals: Array.isArray(raw.goals)
      ? raw.goals.filter(isRaw).map((g) => ({
          trackerId: str(g.trackerId),
          name: str(g.name),
          unit: str(g.unit),
          progress: normalizePositiveAmount(g.progress, 0),
          target: normalizePositiveAmount(g.target, 0),
          hit: bool(g.hit),
          pointsEarned: normalizeGoalTargetInt(g.pointsEarned, 0),
        }))
      : [],
    checkIns: Array.isArray(raw.checkIns)
      ? raw.checkIns.filter(isRaw).map((c) => ({
          checkInId: str(c.checkInId),
          name: str(c.name),
          completed: bool(c.completed),
        }))
      : [],
  };
}

export function normalizeFriend(raw: unknown, ctx: NormalizeCtx): Friend | null {
  if (!isRaw(raw) || typeof raw.id !== "string") return null;
  const name = str(raw.name);
  if (!name) return null;
  return { id: raw.id, name, email: normalizeEmail(raw.email), createdAt: isoOr(raw.createdAt, ctx.nowIso) };
}

export function normalizeSquad(raw: unknown, ctx: NormalizeCtx): Squad | null {
  if (!isRaw(raw) || typeof raw.id !== "string") return null;
  const name = str(raw.name);
  if (!name) return null;
  return {
    id: raw.id,
    name,
    notes: str(raw.notes),
    weeklyGoal: normalizeGoalTargetInt(raw.weeklyGoal, 0),
    memberEmails: stringList(raw.memberEmails).map(normalizeEmail),
    goalIds: stringList(raw.goalIds),
    createdAt: isoOr(raw.createdAt, ctx.nowIso),
  };
}

export function normalizeTrashItem(raw: unknown, ctx: NormalizeCtx): TrashItem | null {
  if (!isRaw(raw) || typeof raw.id !== "string") return null;
  const itemType = str(raw.itemType);
  const known = ["goal", "checkin", "entry", "friend", "squad"];
  if (!known.includes(itemType)) return null;
  return {
    id: raw.id,
    itemType: itemType as TrashItem["itemType"],
    payload: isRaw(raw.payload) ? raw.payload : {},
    label: str(raw.label),
    deletedAt: isoOr(raw.deletedAt, ctx.nowIso),
  };
}

export function normalizeReward(raw: unknown, ctx: NormalizeCtx): Reward | null {
  if (!isRaw(raw) || typeof raw.id !== "string") return null;
  const name = str(raw.name);
  if (!name) return null;
  return {
    id: raw.id,
    name,
    cost: normalizeGoalTargetInt(raw.cost, 0),
    notes: str(raw.notes),
    createdAt: isoOr(raw.createdAt, ctx.nowIso),
  };
}

export function normalizeRewardPurchase(raw: unknown, ctx: NormalizeCtx): RewardPurchase | null {
  if (!isRaw(raw) || typeof raw.id !== "string") return null;
  const status = raw.status === "closed" || raw.status === "refunded" ? raw.status : "active";
  return {
    id: raw.id,
    rewardId: typeof raw.rewardId === "string" ? raw.rewardId : "",
    rewardName: str(raw.rewardName),
    cost: normalizeGoalTargetInt(raw.cost, 0),
    notes: str(raw.notes),
    status,
    purchasedAt: isoOr(raw.purchasedAt, ctx.nowIso),
    closedAt: isoOrNull(raw.closedAt),
    refundedAt: isoOrNull(raw.refundedAt),
  };
}

export function normalizePointTransaction(raw: unknown, ctx: NormalizeCtx): PointTransaction | null {
  if (!isRaw(raw) || typeof raw.id !== "string") return null;
  const amount = Number(raw.amount);
  if (!Number.isFinite(amount)) return null;
  const knownTypes = ["earn-closeout", "spend-reward", "refund-reward", "adjustment"];
  const type = knownTypes.includes(String(raw.type)) ? (String(raw.type) as PointTransaction["type"]) : "adjustment";
  return {
    id: raw.id,
    type,
    amount,
    createdAt: isoOr(raw.createdAt, ctx.nowIso),
    note: str(raw.note),
    refKey: str(raw.refKey),
    rewardId: typeof raw.rewardId === "string" ? raw.rewardId : "",
  };
}

export function normalizeVacation(raw: unknown): Vacation | null {
  if (!isRaw(raw) || typeof raw.id !== "string") return null;
  if (!isDateKey(raw.startDate) || !isDateKey(raw.endDate)) return null;
  return {
    id: raw.id,
    name: str(raw.name),
    startDate: raw.startDate,
    endDate: raw.endDate,
    pausedGoalIds: stringList(raw.pausedGoalIds),
    adjustTargets: Boolean(raw.adjustTargets),
  };
}

export function normalizeTempPeriodGoal(raw: unknown): TempPeriodGoal | null {
  if (!isRaw(raw) || typeof raw.id !== "string") return null;
  const name = str(raw.name);
  const periodKey = str(raw.periodKey);
  if (!name || !periodKey) return null;
  return {
    id: raw.id,
    name,
    unit: str(raw.unit) || "units",
    target: typeof raw.target === "number" ? raw.target : 0,
    periodKey,
    periodName: str(raw.periodName) || "week",
    periodStart: isDateKey(raw.periodStart) ? raw.periodStart : "",
    periodEnd: isDateKey(raw.periodEnd) ? raw.periodEnd : "",
  };
}

/** Defaults match legacy getDefaultSettings() (legacy/app.js ~14675) exactly. */
export function normalizeSettings(raw: unknown): Settings {
  const value = isRaw(raw) ? raw : {};
  const themes = ["teal", "ocean", "forest", "sunset", "amber", "berry", "slate", "midnight"];
  const asBool = (v: unknown, fallback: boolean) => (typeof v === "boolean" ? v : fallback);
  const milestoneStep = Number(value.milestoneStep);
  return {
    weekStart: value.weekStart === "sunday" ? "sunday" : "monday",
    compareToLastDefault: asBool(value.compareToLastDefault, true),
    projectionAverageSource: value.projectionAverageSource === "year" ? "year" : "period",
    rewardPointsEnabled: asBool(value.rewardPointsEnabled, false),
    pointStoreRewardsEnabled: asBool(value.pointStoreRewardsEnabled, true),
    bucketListEnabled: asBool(value.bucketListEnabled, true),
    quartersEnabled: asBool(value.quartersEnabled, false),
    smartRemindersEnabled: asBool(value.smartRemindersEnabled, true),
    missedEntryDays: Math.max(Math.min(normalizeGoalTargetInt(value.missedEntryDays, 2), 14), 1),
    milestoneNotificationsEnabled: asBool(value.milestoneNotificationsEnabled, true),
    milestoneStep: milestoneStep === 10 || milestoneStep === 25 ? milestoneStep : 20,
    mobileQuickActionsEnabled: asBool(value.mobileQuickActionsEnabled, true),
    onboardingEnabled: asBool(value.onboardingEnabled, true),
    onboardingCompleted: asBool(value.onboardingCompleted, false),
    performanceMode: value.performanceMode === "light" ? "light" : "standard",
    ideasWeeklyGoal: normalizeGoalTargetInt(value.ideasWeeklyGoal, 0),
    theme: themes.includes(String(value.theme)) ? String(value.theme) : "teal",
  };
}

