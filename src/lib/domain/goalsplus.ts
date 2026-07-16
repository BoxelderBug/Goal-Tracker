/**
 * Pure Goals+ math and entry-data constructors. The pace and VO2 formulas MUST
 * stay identical to lib/migration/normalize.ts (paceMinutesPerMile,
 * estimatedRunningVo2) so migrated and freshly-entered records agree.
 */
import type {
  GolfType,
  GoalsPlusGolfEntry,
  GoalsPlusReadingEntry,
  GoalsPlusRunningConfig,
  GoalsPlusRunningEntry,
  RunningPrimaryMetric,
  RunningWorkout,
} from "@/types/models";

export const RUNNING_WORKOUT_LABELS: Record<RunningWorkout, string> = {
  easy: "Easy",
  tempo: "Tempo",
  long: "Long run",
  norwegian4x4: "Norwegian 4×4",
  intervals: "Intervals",
  "hill-repeats": "Hill repeats",
  fartlek: "Fartlek",
  recovery: "Recovery",
  progression: "Progression",
  threshold: "Threshold",
  custom: "Custom",
};

export const GOLF_TYPE_LABELS: Record<GolfType, string> = {
  golf: "Golf",
  "disc-golf": "Disc golf",
};

export const RUNNING_METRIC_LABELS: Record<RunningPrimaryMetric, string> = {
  distance: "Total distance (miles)",
  runs: "Number of runs",
  "type-runs": "Runs of a specific type",
};

/** The unit a running goal's amount is measured in, given its primary metric. */
export function runningMetricUnit(metric: RunningPrimaryMetric): string {
  return metric === "distance" ? "miles" : "runs";
}

/**
 * The tracked amount one run contributes under the goal's primary metric:
 * miles for "distance", 1 for "runs", 1-or-0 for "type-runs" (non-matching
 * runs still get logged — they just don't advance the goal).
 */
export function runningEntryAmount(
  config: GoalsPlusRunningConfig,
  run: { distance: number; runningWorkout: RunningWorkout },
): number {
  const metric = config.primaryMetric ?? "distance";
  if (metric === "runs") return 1;
  if (metric === "type-runs") {
    return run.runningWorkout === (config.primaryRunType ?? config.runningWorkout) ? 1 : 0;
  }
  return run.distance;
}

/** Minutes per mile. 0 when either input is non-positive. */
export function paceMinutesPerMile(distance: number, durationMinutes: number): number {
  if (distance <= 0 || durationMinutes <= 0) return 0;
  return durationMinutes / distance;
}

/** Rough VO2 (ml/kg/min) from distance (mi) + duration (min), 1-decimal. */
export function estimatedRunningVo2(distance: number, durationMinutes: number): number {
  if (distance <= 0 || durationMinutes <= 0) return 0;
  const metersPerMinute = (distance * 1609.34) / durationMinutes;
  return Math.round((3.5 + 0.2 * metersPerMinute) * 10) / 10;
}

/** Format a minutes-per-mile pace as `m:ss/mi` (empty when 0). */
export function formatPace(paceMinutesPerMile: number): string {
  if (!(paceMinutesPerMile > 0) || !Number.isFinite(paceMinutesPerMile)) return "—";
  const totalSeconds = Math.round(paceMinutesPerMile * 60);
  const minutes = Math.floor(totalSeconds / 60);
  const seconds = totalSeconds % 60;
  return `${minutes}:${String(seconds).padStart(2, "0")}/mi`;
}

/** Format a duration in minutes as `m:ss` or `h:mm:ss` ("—" when 0). */
export function formatMinutes(minutes: number): string {
  if (!(minutes > 0) || !Number.isFinite(minutes)) return "—";
  const totalSeconds = Math.round(minutes * 60);
  const h = Math.floor(totalSeconds / 3600);
  const m = Math.floor((totalSeconds % 3600) / 60);
  const s = totalSeconds % 60;
  const ss = String(s).padStart(2, "0");
  return h > 0 ? `${h}:${String(m).padStart(2, "0")}:${ss}` : `${m}:${ss}`;
}

// ---------------------------------------------------------------------------
// Running stats: run-type breakdown and race attempts
// ---------------------------------------------------------------------------

export interface RunTypeStats {
  workout: RunningWorkout;
  runs: number;
  totalDistance: number;
  /** distance-weighted min/mi over the group; 0 when unknown */
  avgPace: number;
  /** fastest single-run pace in the group; 0 when unknown */
  bestPace: number;
  /** average of recorded (>0) inclines; null when none recorded */
  avgInclinePct: number | null;
}

const round2 = (n: number) => Math.round(n * 100) / 100;

/** Per-run-type segment stats, biggest mileage first. */
export function computeRunTypeBreakdown(runs: GoalsPlusRunningEntry[]): RunTypeStats[] {
  const groups = new Map<RunningWorkout, GoalsPlusRunningEntry[]>();
  for (const run of runs) {
    if (!groups.has(run.runningWorkout)) groups.set(run.runningWorkout, []);
    groups.get(run.runningWorkout)!.push(run);
  }
  const rows: RunTypeStats[] = [];
  for (const [workout, group] of groups) {
    const totalDistance = group.reduce((s, r) => s + r.distance, 0);
    const totalDuration = group.reduce((s, r) => s + r.durationMinutes, 0);
    const bestPace = group.reduce(
      (b, r) => (r.paceMinutesPerMile > 0 && (b === 0 || r.paceMinutesPerMile < b) ? r.paceMinutesPerMile : b),
      0,
    );
    const inclines = group.map((r) => r.avgInclinePct ?? 0).filter((v) => v > 0);
    rows.push({
      workout,
      runs: group.length,
      totalDistance: round2(totalDistance),
      avgPace: totalDistance > 0 && totalDuration > 0 ? round2(totalDuration / totalDistance) : 0,
      bestPace: round2(bestPace),
      avgInclinePct: inclines.length ? round2(inclines.reduce((s, v) => s + v, 0) / inclines.length) : null,
    });
  }
  return rows.sort((a, b) => b.totalDistance - a.totalDistance);
}

export interface RaceAttempt {
  date: string;
  /** time to cover the race distance at this run's pace */
  minutes: number;
}

/**
 * Equivalent race times from real runs: every run at least as long as the
 * race distance counts as an attempt, timed at that run's overall pace.
 * Shorter runs are excluded — extrapolating them up would flatter the pace.
 */
export function computeRaceAttempts(
  runs: { date: string; run: GoalsPlusRunningEntry }[],
  raceDistance: number,
): RaceAttempt[] {
  if (!(raceDistance > 0)) return [];
  return runs
    .filter(({ run }) => run.distance >= raceDistance && run.paceMinutesPerMile > 0)
    .map(({ date, run }) => ({ date, minutes: round2(run.paceMinutesPerMile * raceDistance) }))
    .sort((a, b) => a.date.localeCompare(b.date));
}

/** Build a running Goals+ entry, computing pace + VO2. Splits/Norwegian speeds
 *  and custom fields are left at defaults (set later where relevant). */
export function buildRunningEntry(params: {
  runningWorkout: RunningWorkout;
  distance: number;
  durationMinutes: number;
  avgInclinePct?: number;
  workSpeed?: number;
  recoverySpeed?: number;
}): GoalsPlusRunningEntry {
  const { runningWorkout, distance, durationMinutes } = params;
  const isNorwegian = runningWorkout === "norwegian4x4";
  return {
    mode: "goalsplus-running",
    runningWorkout,
    distance,
    durationMinutes,
    paceMinutesPerMile: paceMinutesPerMile(distance, durationMinutes),
    estimatedVo2: estimatedRunningVo2(distance, durationMinutes),
    avgInclinePct: Math.max(params.avgInclinePct ?? 0, 0) || 0,
    splits: [],
    workSpeed: isNorwegian ? (params.workSpeed ?? 0) : 0,
    recoverySpeed: isNorwegian ? (params.recoverySpeed ?? 0) : 0,
    customExerciseName: "",
    customReps: 0,
    customWeight: 0,
  };
}

export function buildGolfEntry(params: { golfType: GolfType; score: number }): GoalsPlusGolfEntry {
  return {
    mode: "goalsplus-golf",
    golfType: params.golfType,
    score: Math.max(Math.floor(params.score) || 0, 0),
  };
}

/** Build a reading entry: one completed book. Rating clamps to 0–5 stars. */
export function buildReadingEntry(params: {
  bookTitle: string;
  author?: string;
  pages?: number;
  rating?: number;
  yearOnly?: boolean;
}): GoalsPlusReadingEntry {
  return {
    mode: "goalsplus-reading",
    bookTitle: params.bookTitle.trim().replace(/\s+/g, " ").slice(0, 200),
    author: (params.author ?? "").trim().replace(/\s+/g, " ").slice(0, 120),
    pages: Math.max(Math.floor(params.pages ?? 0) || 0, 0),
    rating: Math.min(Math.max(Math.floor(params.rating ?? 0) || 0, 0), 5),
    dateResolution: params.yearOnly ? "year" : "day",
  };
}
