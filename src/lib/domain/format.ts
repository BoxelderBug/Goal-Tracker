import type { GoalType, GoalsPlusMode } from "@/types/models";

/** Format an amount like the legacy app: trim trailing zeros, max 2 decimals. */
export function formatAmount(value: number): string {
  if (!Number.isFinite(value)) return "0";
  const rounded = Math.round(value * 100) / 100;
  return Number.isInteger(rounded) ? String(rounded) : String(rounded);
}

export const GOAL_TYPE_LABELS: Record<GoalType, string> = {
  quantity: "Quantity",
  yesno: "Yes / No",
  bucket: "Bucket list",
  floating: "Floating",
  term: "Term (deadline)",
  "week-term": "This week only",
  "month-term": "This month only",
  "input-output": "Input / Output",
};

export const GOALS_PLUS_LABELS: Record<GoalsPlusMode, string> = {
  standard: "Standard",
  "goalsplus-running": "Running",
  "goalsplus-golf": "Golf",
  "goalsplus-weight": "Weight (Health)",
};

export const GOAL_TYPE_OPTIONS = (Object.keys(GOAL_TYPE_LABELS) as GoalType[]).map((value) => ({
  value,
  label: GOAL_TYPE_LABELS[value],
}));

/** Yes/No and bucket goals track a fixed unit; others are free-form. */
export function lockedUnitForGoalType(goalType: GoalType): string | null {
  if (goalType === "yesno") return "days";
  if (goalType === "bucket") return "items";
  return null;
}

export function isYesNoGoal(goalType: GoalType): boolean {
  return goalType === "yesno";
}
