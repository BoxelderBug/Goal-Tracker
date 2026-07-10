/**
 * Pure Goals+ math and entry-data constructors. The pace and VO2 formulas MUST
 * stay identical to lib/migration/normalize.ts (paceMinutesPerMile,
 * estimatedRunningVo2) so migrated and freshly-entered records agree.
 */
import type {
  GolfType,
  GoalsPlusGolfEntry,
  GoalsPlusRunningEntry,
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

/** Build a running Goals+ entry, computing pace + VO2. Splits/Norwegian speeds
 *  and custom fields are left at defaults (set later where relevant). */
export function buildRunningEntry(params: {
  runningWorkout: RunningWorkout;
  distance: number;
  durationMinutes: number;
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
