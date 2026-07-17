import { describe, expect, it } from "vitest";
import { parseBackfillGrid } from "./backfill";

const goals = [
  { id: "g1", name: "Running" },
  { id: "g2", name: "Pushups" },
];

describe("parseBackfillGrid", () => {
  it("parses a tab-separated grid with multiple goal columns", () => {
    const plan = parseBackfillGrid(
      [
        "Date\tRunning\tPushups",
        "2025-01-01\t3.1\t50",
        "2025-01-02\t\t40",
        "2025-01-03\t5\t",
      ].join("\n"),
      goals,
    );
    expect(plan).not.toBeNull();
    expect(plan!.cells).toEqual([
      { goalId: "g1", date: "2025-01-01", amount: 3.1 },
      { goalId: "g2", date: "2025-01-01", amount: 50 },
      { goalId: "g2", date: "2025-01-02", amount: 40 },
      { goalId: "g1", date: "2025-01-03", amount: 5 },
    ]);
    expect(plan!.goals).toEqual([
      { goalId: "g1", name: "Running", count: 2 },
      { goalId: "g2", name: "Pushups", count: 2 },
    ]);
    expect(plan!.warnings).toEqual([]);
  });

  it("parses CSV with quotes, slash dates, thousands commas, and matches names case-insensitively", () => {
    const plan = parseBackfillGrid(
      ['date,"running"', '1/5/2025,"1,000"', "12/31/24,2"].join("\n"),
      goals,
    );
    expect(plan!.cells).toEqual([
      { goalId: "g1", date: "2024-12-31", amount: 2 },
      { goalId: "g1", date: "2025-01-05", amount: 1000 },
    ]);
  });

  it("keeps explicit zeros but skips blanks and dashes", () => {
    const plan = parseBackfillGrid("Date\tPushups\n2025-02-01\t0\n2025-02-02\t-\n", goals);
    expect(plan!.cells).toEqual([{ goalId: "g2", date: "2025-02-01", amount: 0 }]);
  });

  it("warns on unknown columns, bad dates, bad numbers, and duplicate cells", () => {
    const plan = parseBackfillGrid(
      [
        "Date\tRunning\tCycling",
        "not-a-date\t1\t2",
        "2025-02-30\t1\t2",
        "2025-03-01\tfast\t2",
        "2025-03-02\t1\t2",
        "2025-03-02\t4\t2",
      ].join("\n"),
      goals,
    );
    const messages = plan!.warnings.map((w) => w.message);
    expect(messages).toContainEqual(expect.stringContaining('"Cycling"'));
    expect(messages).toContainEqual(expect.stringContaining('"not-a-date"'));
    expect(messages).toContainEqual(expect.stringContaining('"2025-02-30"')); // not a real date
    expect(messages).toContainEqual(expect.stringContaining('"fast"'));
    expect(messages).toContainEqual(expect.stringContaining("kept the later one"));
    // duplicate 03-02 resolves to the later value
    expect(plan!.cells).toContainEqual({ goalId: "g1", date: "2025-03-02", amount: 4 });
  });

  it("returns null with no usable header or no matching goal columns", () => {
    expect(parseBackfillGrid("", goals)).toBeNull();
    expect(parseBackfillGrid("just one column", goals)).toBeNull();
    expect(parseBackfillGrid("Date\tNothing\n2025-01-01\t3", goals)).toBeNull();
  });
});
