import { describe, expect, it } from "vitest";
import type { Entry, Goal } from "@/types/models";
import { newGoal } from "./newGoal";
import {
  collectTagSuggestions,
  computeTagStats,
  computeTagWeeklyCounts,
  entryHasTag,
  entryTags,
  normalizeTags,
  tagKey,
} from "./tags";

const goal = (id: string, name: string, unit: string): Goal => ({ ...newGoal(), id, name, unit });

let seq = 0;
const entry = (over: Partial<Entry> & Pick<Entry, "trackerId" | "date">): Entry => ({
  id: `e${++seq}`,
  amount: 1,
  notApplicable: false,
  goalsPlus: null,
  metricValues: {},
  notes: "",
  createdAt: "2026-08-01T10:00:00.000Z",
  ...over,
});

describe("normalizeTags", () => {
  it("trims, collapses whitespace, and drops case-insensitive duplicates", () => {
    expect(normalizeTags([" morning ", "Morning", "with  Sam", ""])).toEqual(["morning", "with Sam"]);
  });

  it("splits a delimited string", () => {
    expect(normalizeTags("treadmill, outdoor;rainy|early\nmorning")).toEqual([
      "treadmill", "outdoor", "rainy", "early", "morning",
    ]);
  });

  it("caps the tag length and the tag count", () => {
    expect(normalizeTags(["x".repeat(50)])[0]).toHaveLength(30);
    expect(normalizeTags(Array.from({ length: 20 }, (_, i) => `t${i}`))).toHaveLength(8);
  });

  it("keeps the first spelling of a duplicate", () => {
    expect(normalizeTags(["Treadmill", "treadmill"])).toEqual(["Treadmill"]);
  });
});

describe("entryTags / entryHasTag", () => {
  it("treats a pre-tagging entry as untagged", () => {
    expect(entryTags(entry({ trackerId: "g1", date: "2026-08-01" }))).toEqual([]);
  });

  it("matches a tag regardless of case", () => {
    const e = entry({ trackerId: "g1", date: "2026-08-01", tags: ["Treadmill"] });
    expect(entryHasTag(e, "treadmill")).toBe(true);
    expect(entryHasTag(e, "outdoor")).toBe(false);
  });
});

describe("collectTagSuggestions", () => {
  it("ranks by use, with unused goal tags last", () => {
    const entries = [
      entry({ trackerId: "g1", date: "2026-08-01", tags: ["morning"] }),
      entry({ trackerId: "g1", date: "2026-08-02", tags: ["morning", "treadmill"] }),
    ];
    expect(collectTagSuggestions(entries, [{ ...goal("g1", "Run", "miles"), tags: ["health"] }])).toEqual([
      "morning", "treadmill", "health",
    ]);
  });

  it("reports one spelling per tag", () => {
    const entries = [
      entry({ trackerId: "g1", date: "2026-08-01", tags: ["Morning"] }),
      entry({ trackerId: "g1", date: "2026-08-02", tags: ["morning"] }),
    ];
    expect(collectTagSuggestions(entries)).toEqual(["Morning"]);
  });
});

describe("computeTagStats", () => {
  const goals = [goal("g1", "Run", "miles"), goal("g2", "Read", "books")];

  it("rolls up entries, days and per-goal totals, busiest tag first", () => {
    const stats = computeTagStats(
      [
        entry({ trackerId: "g1", date: "2026-08-01", amount: 3, tags: ["morning"] }),
        entry({ trackerId: "g1", date: "2026-08-01", amount: 2, tags: ["morning"] }),
        entry({ trackerId: "g1", date: "2026-08-04", amount: 5, tags: ["morning", "long"] }),
      ],
      goals,
    );
    expect(stats.map((s) => s.key)).toEqual(["morning", "long"]);
    expect(stats[0]).toMatchObject({
      label: "morning", entries: 3, days: 2, total: 10, unit: "miles",
      firstDate: "2026-08-01", lastDate: "2026-08-04",
    });
    expect(stats[0].goals).toEqual([
      { goalId: "g1", goalName: "Run", unit: "miles", entries: 3, total: 10 },
    ]);
  });

  it("refuses a combined total when the goals do not share a unit", () => {
    const stats = computeTagStats(
      [
        entry({ trackerId: "g1", date: "2026-08-01", amount: 3, tags: ["evening"] }),
        entry({ trackerId: "g2", date: "2026-08-02", amount: 1, tags: ["evening"] }),
      ],
      goals,
    );
    expect(stats[0].total).toBeNull();
    expect(stats[0].unit).toBe("");
    // per-goal totals still add up, since each goal has one unit
    // (equal entry counts, so the tiebreak orders them by name)
    expect(stats[0].goals.map((g) => [g.goalName, g.total])).toEqual([["Read", 1], ["Run", 3]]);
  });

  it("skips not-applicable entries and honours the range", () => {
    const rows = [
      entry({ trackerId: "g1", date: "2026-08-01", amount: 0, notApplicable: true, tags: ["morning"] }),
      entry({ trackerId: "g1", date: "2026-07-01", amount: 4, tags: ["morning"] }),
      entry({ trackerId: "g1", date: "2026-08-05", amount: 4, tags: ["morning"] }),
    ];
    expect(computeTagStats(rows, goals, { fromKey: "2026-08-01" })[0]).toMatchObject({
      entries: 1, total: 4,
    });
    expect(computeTagStats(rows, goals, { toKey: "2026-07-31" })[0]).toMatchObject({ entries: 1 });
  });

  it("keeps a tag whose goal has been deleted", () => {
    const stats = computeTagStats([entry({ trackerId: "gone", date: "2026-08-01", tags: ["old"] })], goals);
    expect(stats[0].goals[0].goalName).toBe("Deleted goal");
  });

  it("labels a tag with its most common spelling", () => {
    const stats = computeTagStats(
      [
        entry({ trackerId: "g1", date: "2026-08-01", tags: ["Treadmill"] }),
        entry({ trackerId: "g1", date: "2026-08-02", tags: ["treadmill"] }),
        entry({ trackerId: "g1", date: "2026-08-03", tags: ["treadmill"] }),
      ],
      goals,
    );
    expect(stats[0].label).toBe("treadmill");
    expect(stats[0].entries).toBe(3);
  });

  it("returns nothing when no entry is tagged", () => {
    expect(computeTagStats([entry({ trackerId: "g1", date: "2026-08-01" })], goals)).toEqual([]);
  });
});

describe("computeTagWeeklyCounts", () => {
  // 2026-08-09 is a Sunday; with a Sunday week start that opens the newest week.
  const now = new Date(2026, 7, 9);

  it("counts entries per week per tag, oldest week first", () => {
    const data = computeTagWeeklyCounts(
      [
        entry({ trackerId: "g1", date: "2026-08-09", tags: ["morning"] }),
        entry({ trackerId: "g1", date: "2026-08-03", tags: ["morning"] }),
        entry({ trackerId: "g1", date: "2026-08-04", tags: ["Morning"] }),
        entry({ trackerId: "g1", date: "2026-06-01", tags: ["morning"] }), // outside the window
      ],
      ["morning"],
      3,
      "sunday",
      now,
    );
    expect(data.weekKeys).toEqual(["2026-07-26", "2026-08-02", "2026-08-09"]);
    expect(data.series).toEqual([{ tag: "morning", counts: [0, 2, 1] }]);
  });

  it("gives an untagged window all zeros rather than dropping the series", () => {
    const data = computeTagWeeklyCounts([], ["morning", "night"], 2, "sunday", now);
    expect(data.series).toEqual([
      { tag: "morning", counts: [0, 0] },
      { tag: "night", counts: [0, 0] },
    ]);
  });
});

describe("tagKey", () => {
  it("is the trimmed lowercase form", () => {
    expect(tagKey("  Morning Run ")).toBe("morning run");
  });
});
