/**
 * Numeric normalizers ported from legacy/app.js (~14712, ~15986, ~16009).
 * Amounts are kept to 2 decimal places to match legacy arithmetic exactly.
 */

export function normalizeGoalTargetInt(value: unknown, fallback = 0): number {
  const numeric = Number(value);
  if (!Number.isFinite(numeric) || numeric < 0) {
    return fallback;
  }
  return Math.max(Math.floor(numeric), 0);
}

export function normalizePositiveAmount(value: unknown, fallback: number): number {
  const numeric = Number(value);
  if (!Number.isFinite(numeric) || numeric < 0) {
    return fallback;
  }
  return Math.round(numeric * 100) / 100;
}

export function normalizeGoalPoints(value: unknown, fallback = 1): number {
  const numeric = Number(value);
  if (!Number.isFinite(numeric) || numeric < 0) {
    return Math.max(Math.floor(Number(fallback) || 1), 0);
  }
  return Math.max(Math.floor(numeric), 0);
}

export function normalizeGoalPriority(value: unknown, fallback = 0): number {
  const numeric = Number(value);
  if (!Number.isFinite(numeric) || numeric < 0) {
    return Math.max(Math.floor(Number(fallback) || 0), 0);
  }
  return Math.max(Math.min(Math.floor(numeric), 1000), 0);
}

/** Add two amounts with 2-decimal rounding (avoids float drift). */
export function addAmount(a: number, b: number): number {
  return Math.round((Number(a) + Number(b)) * 100) / 100;
}

export function percent(progress: number, target: number): number {
  if (!target || target <= 0) {
    return 0;
  }
  return Math.round((progress / target) * 100);
}

export function safeDivide(value: number, by: number): number {
  if (!Number.isFinite(value) || !Number.isFinite(by) || by <= 0) {
    return 0;
  }
  return value / by;
}
