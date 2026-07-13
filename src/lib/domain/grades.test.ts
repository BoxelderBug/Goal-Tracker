import { describe, expect, it } from "vitest";
import { averageGrade, gradeScore, isGradeLetter } from "./grades";

describe("grades", () => {
  it("scores the scale monotonically", () => {
    expect(gradeScore("A+")).toBe(4.3);
    expect(gradeScore("C")).toBe(2);
    expect(gradeScore("F")).toBe(0);
    expect(gradeScore("A")).toBeGreaterThan(gradeScore("A-"));
  });

  it("validates letters", () => {
    expect(isGradeLetter("B+")).toBe(true);
    expect(isGradeLetter("E")).toBe(false);
    expect(isGradeLetter(3)).toBe(false);
  });

  it("averages back to the nearest letter", () => {
    expect(averageGrade([])).toBeNull();
    expect(averageGrade(["A"])).toBe("A");
    expect(averageGrade(["A", "C"])).toBe("B"); // (4+2)/2 = 3
    expect(averageGrade(["A+", "A+"])).toBe("A+");
    expect(averageGrade(["F", "F", "D"])).toBe("F"); // 0.33 → F (0) vs D- (0.7)
  });
});
