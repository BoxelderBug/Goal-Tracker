import { describe, expect, it } from "vitest";
import type { Entry, GradeCriterion, GradeEntry } from "@/types/models";
import { parseDateKey } from "./dates";
import { computeGradeOutputSignal } from "./gradeInsights";

const entry = (date: string, amount: number, over: Partial<Entry> = {}): Entry => ({
  id: `g1-${date}-${amount}`, trackerId: "g1", date, amount,
  notApplicable: false, goalsPlus: null, metricValues: {}, notes: "",
  createdAt: "2026-07-01T00:00:00.000Z", ...over,
});

const grade = (date: string, letter: string, criterionId = "c1"): GradeEntry => ({
  id: `${date}_${criterionId}`, date, criterionId,
  grade: letter, score: 0, createdAt: "2026-07-01T00:00:00.000Z",
});

const criterion = (id: string): GradeCriterion => ({ id, name: id, createdAt: "2026-06-01T00:00:00.000Z" });

const now = parseDateKey("2026-07-14");
const goals = [{ id: "g1" }];

// June 1–6 graded A with 10 logged; June 7–12 graded C with 2 logged. The
// per-goal average over the 12 graded days is (60 + 12) / 12 = 6, so A-days
// index 10/6 ≈ 1.67 and C-days 2/6 ≈ 0.33. Next days after A-days are June
// 2–7 (five 10s and one 2 → 8.67/6 ≈ 1.44); after C-days June 8–13 (five 2s
// and one 0 → 1.67/6 ≈ 0.28).
const highDates = ["2026-06-01", "2026-06-02", "2026-06-03", "2026-06-04", "2026-06-05", "2026-06-06"];
const lowDates = ["2026-06-07", "2026-06-08", "2026-06-09", "2026-06-10", "2026-06-11", "2026-06-12"];
const grades = [...highDates.map((d) => grade(d, "A")), ...lowDates.map((d) => grade(d, "C"))];
const entries = [...highDates.map((d) => entry(d, 10)), ...lowDates.map((d) => entry(d, 2))];

describe("computeGradeOutputSignal", () => {
  it("splits at the median grade and compares same-day and next-day output", () => {
    const rows = computeGradeOutputSignal([criterion("c1")], grades, goals, entries, now, "2026-05-18");
    expect(rows).toEqual([{
      criterionId: "c1",
      threshold: "A",
      highDays: 6,
      lowDays: 6,
      highIdx: 1.67,
      lowIdx: 0.33,
      nextHighIdx: 1.44,
      nextLowIdx: 0.28,
    }]);
  });

  it("returns no row when either side of the split is under 5 days", () => {
    // all A except a single C → low bucket of 1
    const lopsided = [...highDates, ...lowDates.slice(0, 5)].map((d) => grade(d, "A"))
      .concat(grade("2026-06-12", "C"));
    expect(computeGradeOutputSignal([criterion("c1")], lopsided, goals, entries, now)).toEqual([]);
  });

  it("ignores grades outside the entries window, today, and unknown letters", () => {
    const noisy = [
      ...grades,
      grade("2026-05-01", "F"),  // before window
      grade("2026-07-14", "F"),  // today — logging still in flight
      grade("2026-06-13", "??"), // not a letter
    ];
    const rows = computeGradeOutputSignal([criterion("c1")], noisy, goals, entries, now, "2026-05-18");
    expect(rows[0].highDays + rows[0].lowDays).toBe(12);
  });

  it("returns no row when no goal has volume on the graded days", () => {
    expect(computeGradeOutputSignal([criterion("c1")], grades, goals, [], now)).toEqual([]);
    const archived = [{ id: "g1", archived: true }];
    expect(computeGradeOutputSignal([criterion("c1")], grades, archived, entries, now)).toEqual([]);
  });

  it("orders criteria by same-day contrast, strongest first", () => {
    // c2 grades the same days the opposite way → its "high" days are the
    // low-volume days, a negative contrast that must sort after c1's.
    const c2Grades = [
      ...highDates.map((d) => grade(d, "C", "c2")),
      ...lowDates.map((d) => grade(d, "A", "c2")),
    ];
    const rows = computeGradeOutputSignal(
      [criterion("c2"), criterion("c1")],
      [...grades, ...c2Grades],
      goals,
      entries,
      now,
      "2026-05-18",
    );
    expect(rows.map((r) => r.criterionId)).toEqual(["c1", "c2"]);
    expect(rows[0].highIdx - rows[0].lowIdx).toBeGreaterThan(rows[1].highIdx - rows[1].lowIdx);
  });
});
