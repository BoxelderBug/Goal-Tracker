/**
 * Capture kinds — questions, ideas and experiments — treated like lightweight
 * goals: each one can be switched off, and each carries weekly / monthly /
 * yearly targets counted as "how many did I log this period".
 *
 * Questions and ideas share the `ideas` collection (discriminated by
 * IdeaEntry.type); experiments live in their own `experiments` collection.
 * Targets live on Settings as flat keys so they merge cleanly into the user doc
 * (the legacy `ideasWeeklyGoal` field is the weekly ideas target).
 */
import type { DateKey, PeriodKind, Settings } from "@/types/models";
import { getDateKey, type DateRange } from "./dates";
import { computePace, paceTone, type PaceResult } from "./progress";

export type CaptureKind = "question" | "idea" | "experiment";

type EnabledKey = "questionsEnabled" | "ideasEnabled" | "experimentsEnabled";
type TargetKey = Extract<keyof Settings, `${string}lyGoal`>;

export interface CaptureKindMeta {
  kind: CaptureKind;
  /** plural label used in menus and card titles */
  label: string;
  /** unit shown next to a count */
  unit: string;
  href: string;
  enabledKey: EnabledKey;
  weeklyKey: TargetKey;
  monthlyKey: TargetKey;
  yearlyKey: TargetKey;
}

/** Menu / card order: questions, ideas, experiments. */
export const CAPTURE_KINDS: CaptureKindMeta[] = [
  {
    kind: "question",
    label: "Questions",
    unit: "questions",
    href: "/questions",
    enabledKey: "questionsEnabled",
    weeklyKey: "questionsWeeklyGoal",
    monthlyKey: "questionsMonthlyGoal",
    yearlyKey: "questionsYearlyGoal",
  },
  {
    kind: "idea",
    label: "Ideas",
    unit: "ideas",
    href: "/ideas",
    enabledKey: "ideasEnabled",
    weeklyKey: "ideasWeeklyGoal",
    monthlyKey: "ideasMonthlyGoal",
    yearlyKey: "ideasYearlyGoal",
  },
  {
    kind: "experiment",
    label: "Experiments",
    unit: "experiments",
    href: "/experiments",
    enabledKey: "experimentsEnabled",
    weeklyKey: "experimentsWeeklyGoal",
    monthlyKey: "experimentsMonthlyGoal",
    yearlyKey: "experimentsYearlyGoal",
  },
];

export function captureKindMeta(kind: CaptureKind): CaptureKindMeta {
  const meta = CAPTURE_KINDS.find((m) => m.kind === kind);
  if (!meta) throw new Error(`unknown capture kind: ${kind}`);
  return meta;
}

export function isCaptureEnabled(settings: Settings, kind: CaptureKind): boolean {
  return settings[captureKindMeta(kind).enabledKey] !== false;
}

/** The kinds that should show up in menus and views, in display order. */
export function enabledCaptureKinds(settings: Settings): CaptureKindMeta[] {
  return CAPTURE_KINDS.filter((meta) => settings[meta.enabledKey] !== false);
}

const asTarget = (value: unknown): number => {
  const n = Number(value);
  return Number.isFinite(n) && n > 0 ? n : 0;
};

/**
 * Target for one kind in one period. Quarter mirrors the goal math in
 * targets.ts: monthly ×3, else a quarter of the yearly target.
 */
export function getCaptureTarget(
  settings: Settings,
  kind: CaptureKind,
  period: PeriodKind,
): number {
  const meta = captureKindMeta(kind);
  const weekly = asTarget(settings[meta.weeklyKey]);
  const monthly = asTarget(settings[meta.monthlyKey]);
  const yearly = asTarget(settings[meta.yearlyKey]);
  if (period === "week") return weekly;
  if (period === "month") return monthly;
  if (period === "year") return yearly;
  if (monthly > 0) return monthly * 3;
  if (yearly > 0) return Math.ceil(yearly / 4);
  return 0;
}

/** How many dated items fall inside a range (inclusive of both ends). */
export function countInRange(items: { date: DateKey }[], range: DateRange): number {
  const startKey = getDateKey(range.start);
  const endKey = getDateKey(range.end);
  let count = 0;
  for (const item of items) {
    if (item.date >= startKey && item.date <= endKey) count += 1;
  }
  return count;
}

export interface CapturePeriodProgress {
  meta: CaptureKindMeta;
  count: number;
  target: number;
  pace: PaceResult;
  tone: "hit" | "onpace" | "behind" | "missed";
}

/**
 * One kind's progress for a period. `items` must already be narrowed to the
 * kind (ideas filtered by type, or the experiments list).
 */
export function computeCapturePeriod(
  settings: Settings,
  kind: CaptureKind,
  items: { date: DateKey }[],
  period: PeriodKind,
  range: DateRange,
  now: Date,
): CapturePeriodProgress {
  const meta = captureKindMeta(kind);
  const count = countInRange(items, range);
  const target = getCaptureTarget(settings, kind, period);
  const pace = computePace(count, target, range, now);
  return { meta, count, target, pace, tone: paceTone(pace) };
}
