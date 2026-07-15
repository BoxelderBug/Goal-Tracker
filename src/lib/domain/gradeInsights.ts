/**
 * Grade ↔ output correlation: do the days you grade yourself well on a
 * criterion coincide with more logged volume — same day, and the day after?
 * Volume is compared through a unitless output index (per-goal daily total
 * divided by that goal's average over the criterion's graded days, averaged
 * across goals), so goals with different units carry equal weight. Pure.
 */
import type { Entry, GradeCriterion, GradeEntry } from "@/types/models";
import { GRADE_OPTIONS, gradeScore, isGradeLetter, type GradeLetter } from "./grades";
import { addDays, getDateKey, normalizeDate, parseDateKey } from "./dates";
import { buildDailyTotals } from "./progress";

/** minimum graded days on EACH side of the split before a claim is made */
const MIN_GROUP_DAYS = 5;

const round2 = (n: number) => Math.round(n * 100) / 100;

export interface GradeOutputRow {
  criterionId: string;
  /** "high" days are graded at or above this letter (the criterion's median) */
  threshold: GradeLetter;
  highDays: number;
  lowDays: number;
  /** average output index on high / low days; 1 = the criterion's typical graded day */
  highIdx: number;
  lowIdx: number;
  /** same comparison for the day AFTER the grade; null under the sample gate */
  nextHighIdx: number | null;
  nextLowIdx: number | null;
}

/**
 * One row per criterion with enough signal, strongest same-day contrast
 * first. Days are split at the criterion's median grade (ties go high), so
 * every criterion is compared against its own baseline rather than a fixed
 * letter. Today is excluded on both sides — its logging is still in flight —
 * and next-day comparisons only count fully completed days. Rows are dropped
 * until both halves have MIN_GROUP_DAYS days: no claim without a real sample.
 */
export function computeGradeOutputSignal(
  criteria: GradeCriterion[],
  gradeEntries: GradeEntry[],
  goals: { id: string; archived?: boolean }[],
  entries: Entry[],
  now: Date,
  /** first dateKey of the loaded entries window; grades before it see no volume */
  windowStartKey?: string,
): GradeOutputRow[] {
  const totals = buildDailyTotals(entries);
  const goalIds = goals.filter((g) => !g.archived).map((g) => g.id);
  const todayKey = getDateKey(normalizeDate(now));

  const rows: GradeOutputRow[] = [];
  for (const criterion of criteria) {
    const graded = gradeEntries.filter(
      (e) =>
        e.criterionId === criterion.id &&
        isGradeLetter(e.grade) &&
        e.date < todayKey &&
        (!windowStartKey || e.date >= windowStartKey),
    );
    if (graded.length < MIN_GROUP_DAYS * 2) continue;

    // Per-goal normalization over this criterion's graded days.
    const dates = graded.map((e) => e.date);
    const avgByGoal = new Map<string, number>();
    for (const goalId of goalIds) {
      const sum = dates.reduce((s, d) => s + (totals.get(`${goalId}|${d}`) ?? 0), 0);
      if (sum > 0) avgByGoal.set(goalId, sum / dates.length);
    }
    if (avgByGoal.size === 0) continue;

    const outputIdx = (dateKey: string): number => {
      let sum = 0;
      for (const [goalId, avg] of avgByGoal) sum += (totals.get(`${goalId}|${dateKey}`) ?? 0) / avg;
      return sum / avgByGoal.size;
    };

    // Median split (upper median, so ties land in the high bucket).
    const scores = graded.map((e) => gradeScore(e.grade as GradeLetter)).sort((a, b) => a - b);
    const median = scores[Math.floor(scores.length / 2)];
    const high = graded.filter((e) => gradeScore(e.grade as GradeLetter) >= median);
    const low = graded.filter((e) => gradeScore(e.grade as GradeLetter) < median);
    if (high.length < MIN_GROUP_DAYS || low.length < MIN_GROUP_DAYS) continue;
    const threshold = GRADE_OPTIONS.find((letter) => gradeScore(letter) === median)!;

    const avgIdx = (keys: string[]) => round2(keys.reduce((s, k) => s + outputIdx(k), 0) / keys.length);
    const nextKeys = (list: GradeEntry[]) =>
      list
        .map((e) => getDateKey(addDays(parseDateKey(e.date), 1)))
        .filter((k) => k < todayKey);

    const nextHigh = nextKeys(high);
    const nextLow = nextKeys(low);
    const nextOk = nextHigh.length >= MIN_GROUP_DAYS && nextLow.length >= MIN_GROUP_DAYS;

    rows.push({
      criterionId: criterion.id,
      threshold,
      highDays: high.length,
      lowDays: low.length,
      highIdx: avgIdx(high.map((e) => e.date)),
      lowIdx: avgIdx(low.map((e) => e.date)),
      nextHighIdx: nextOk ? avgIdx(nextHigh) : null,
      nextLowIdx: nextOk ? avgIdx(nextLow) : null,
    });
  }

  return rows.sort((a, b) => (b.highIdx - b.lowIdx) - (a.highIdx - a.lowIdx));
}
