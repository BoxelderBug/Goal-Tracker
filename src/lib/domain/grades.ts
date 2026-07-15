/**
 * Self-grading scale. Letter grades on a GPA-style 4.3 scale so averages are
 * computable. Pure: no Firebase/React imports.
 */

export const GRADE_OPTIONS = [
  "A+", "A", "A-", "B+", "B", "B-", "C+", "C", "C-", "D+", "D", "D-", "F",
] as const;

export type GradeLetter = (typeof GRADE_OPTIONS)[number];

const SCORE: Record<GradeLetter, number> = {
  "A+": 4.3, A: 4, "A-": 3.7,
  "B+": 3.3, B: 3, "B-": 2.7,
  "C+": 2.3, C: 2, "C-": 1.7,
  "D+": 1.3, D: 1, "D-": 0.7,
  F: 0,
};

export function gradeScore(letter: GradeLetter): number {
  return SCORE[letter];
}

export function isGradeLetter(value: unknown): value is GradeLetter {
  return typeof value === "string" && (GRADE_OPTIONS as readonly string[]).includes(value);
}

/** Nearest letter for a numeric score (ties round up). */
export function nearestGrade(score: number): GradeLetter {
  let best: GradeLetter = "F";
  let bestDiff = Infinity;
  for (const letter of GRADE_OPTIONS) {
    const diff = Math.abs(SCORE[letter] - score);
    // GRADE_OPTIONS runs high→low, so `<` keeps the higher letter on ties
    if (diff < bestDiff) {
      bestDiff = diff;
      best = letter;
    }
  }
  return best;
}

/** Average a set of letters back to the nearest letter (ties round up). */
export function averageGrade(letters: GradeLetter[]): GradeLetter | null {
  if (letters.length === 0) return null;
  return nearestGrade(letters.reduce((s, l) => s + SCORE[l], 0) / letters.length);
}
