import { describe, expect, it } from "vitest";
import type { Entry } from "@/types/models";
import { parseDateKey } from "./dates";
import { computeWeekdayFingerprint, computeWinningWeekFingerprint } from "./fingerprint";

const entry = (date: string, amount: number, over: Partial<Entry> = {}): Entry => ({
  id: `g1-${date}-${amount}`, trackerId: "g1", date, amount,
  notApplicable: false, goalsPlus: null, metricValues: {}, notes: "",
  createdAt: "2026-07-01T00:00:00.000Z", ...over,
});

// Tue 2026-07-14, monday weeks → current week starts Mon 07-13; window = the
// 4 full weeks Mon 06-15 .. Sun 07-12.
const now = parseDateKey("2026-07-14");

describe("computeWeekdayFingerprint", () => {
  it("orders days from the week start and computes share + average", () => {
    const fp = computeWeekdayFingerprint(
      "g1",
      [
        entry("2026-07-06", 6), // Mon
        entry("2026-06-29", 2), // Mon (previous week)
        entry("2026-07-08", 2), // Wed
      ],
      4, "monday", now,
    );
    expect(fp.days[0].dow).toBe(1); // Monday first
    expect(fp.total).toBe(10);
    expect(fp.days[0].sharePct).toBe(80); // 8 of 10 on Mondays
    expect(fp.days[0].avg).toBe(2); // 8 over 4 weeks
    expect(fp.days[2].sharePct).toBe(20); // Wed
    expect(fp.days[6].sharePct).toBe(0); // Sunday untouched
  });

  it("excludes the current partial week and out-of-window entries", () => {
    const fp = computeWeekdayFingerprint(
      "g1",
      [entry("2026-07-13", 100), entry("2026-01-01", 50)], // current Mon + far past
      4, "monday", now,
    );
    expect(fp.total).toBe(0);
  });

  it("ignores other goals and N/A entries", () => {
    const fp = computeWeekdayFingerprint(
      "g1",
      [entry("2026-07-06", 5, { trackerId: "g2" }), entry("2026-07-07", 5, { notApplicable: true })],
      4, "monday", now,
    );
    expect(fp.total).toBe(0);
  });

  it("starts on Sunday for sunday week starts", () => {
    const fp = computeWeekdayFingerprint("g1", [], 4, "sunday", now);
    expect(fp.days[0].dow).toBe(0);
  });
});

describe("computeWinningWeekFingerprint", () => {
  // 8 full monday-start weeks before Tue 2026-07-14: Mon 05-18 .. Sun 07-12.
  // Weekly target 10. Hit weeks front-load (8 by Wed), miss weeks drag (2 by Wed).
  const goal = { id: "g1", weeklyGoal: 10, createdAt: "2026-01-01T00:00:00.000Z" };
  const weekStarts = ["2026-05-18", "2026-05-25", "2026-06-01", "2026-06-08",
    "2026-06-15", "2026-06-22", "2026-06-29", "2026-07-06"];
  const shift = (key: string, days: number) => {
    const d = parseDateKey(key);
    d.setDate(d.getDate() + days);
    return d.toISOString().slice(0, 10);
  };
  // first 4 weeks hit (8 on Mon, 4 on Fri = 12 ≥ 10), last 4 miss (2 on Mon only)
  const entries = weekStarts.flatMap((ws, i) =>
    i < 4
      ? [entry(ws, 8), entry(shift(ws, 4), 4)]
      : [entry(ws, 2)],
  );

  it("compares day-3 share of target in hit vs miss weeks", () => {
    const fp = computeWinningWeekFingerprint(goal, entries, "monday", now, "2026-05-18");
    expect(fp).toEqual({ hitWeeks: 4, missWeeks: 4, hitDay3Pct: 80, missDay3Pct: 20 });
  });

  it("returns null when either group is under 4 weeks", () => {
    // make one hit week a miss → 3 hit weeks
    const fewer = entries.filter((e) => !(e.date === "2026-05-22"));
    expect(computeWinningWeekFingerprint(goal, fewer, "monday", now)).toBeNull();
  });

  it("ignores weeks before the entries window or before the goal existed", () => {
    // window starts 06-01 → only 6 full weeks visible → 2 hit weeks → null
    expect(computeWinningWeekFingerprint(goal, entries, "monday", now, "2026-06-01")).toBeNull();
    const younger = { ...goal, createdAt: "2026-06-20T12:00:00.000Z" };
    expect(computeWinningWeekFingerprint(younger, entries, "monday", now)).toBeNull();
  });

  it("returns null when the goal has no weekly target", () => {
    expect(computeWinningWeekFingerprint({ id: "g1" }, entries, "monday", now)).toBeNull();
  });
});
