import { describe, expect, it } from "vitest";
import type { Entry } from "@/types/models";
import { parseDateKey } from "./dates";
import { computeComebackOdds, computeHitSignals, computeWeekdayFingerprint, computeWinningWeekFingerprint } from "./fingerprint";

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

  it("ignores weeks before the entries window", () => {
    // window starts 06-01 → only 6 full weeks visible → 2 hit weeks → null
    expect(computeWinningWeekFingerprint(goal, entries, "monday", now, "2026-06-01")).toBeNull();
  });

  it("trusts entries that predate createdAt (migrated goals keep full history)", () => {
    // createdAt is long after the first entry — history starts at the entry
    const migrated = { ...goal, createdAt: "2026-06-20T12:00:00.000Z" };
    expect(computeWinningWeekFingerprint(migrated, entries, "monday", now, "2026-05-18"))
      .toEqual({ hitWeeks: 4, missWeeks: 4, hitDay3Pct: 80, missDay3Pct: 20 });
  });

  it("still truncates at createdAt when no entries predate it", () => {
    // goal created 06-20, entries only from 06-22 on → weeks before 06-20 cut
    const late = { ...goal, createdAt: "2026-06-20T12:00:00.000Z" };
    const lateEntries = weekStarts.slice(5).flatMap((ws, i) =>
      i < 2 ? [entry(ws, 8), entry(shift(ws, 4), 4)] : [entry(ws, 2)],
    );
    // only 3 candidate weeks → under the 4+4 gate → null
    expect(computeWinningWeekFingerprint(late, lateEntries, "monday", now, "2026-05-18")).toBeNull();
  });

  it("returns null when the goal has no weekly target", () => {
    expect(computeWinningWeekFingerprint({ id: "g1" }, entries, "monday", now)).toBeNull();
  });
});

describe("computeHitSignals", () => {
  // 8 full monday-start weeks before Tue 2026-07-14 (Mon 05-18 .. Sun 07-12),
  // target goal g1 with weekly target 10. First 4 weeks: g1 logs 10 on Monday
  // (hit) and g2 logs 1 on Wednesday. Last 4 weeks: g1 logs 2 on Thursday
  // (miss). So overall 50%; g1×Mon and g2×Wed are 4/4 hits (+50), g1×Thu is
  // 0/4 (−50).
  const goal = { id: "g1", weeklyGoal: 10, createdAt: "2026-01-01T00:00:00.000Z" };
  const weekStarts = ["2026-05-18", "2026-05-25", "2026-06-01", "2026-06-08",
    "2026-06-15", "2026-06-22", "2026-06-29", "2026-07-06"];
  const shiftDay = (key: string, days: number) => {
    const d = parseDateKey(key);
    d.setDate(d.getDate() + days);
    return d.toISOString().slice(0, 10);
  };
  const entries = weekStarts.flatMap((ws, i) =>
    i < 4
      ? [entry(ws, 10), entry(shiftDay(ws, 2), 1, { trackerId: "g2" })]
      : [entry(shiftDay(ws, 3), 2)],
  );

  it("finds same-goal and cross-goal combos with their lift vs the baseline", () => {
    const data = computeHitSignals(goal, ["g1", "g2"], entries, "monday", now, "2026-05-18");
    expect(data).not.toBeNull();
    expect(data!.weeks).toBe(8);
    expect(data!.overallHitRatePct).toBe(50);
    expect(data!.signals).toHaveLength(3);
    expect(data!.signals).toContainEqual(
      { goalId: "g1", dow: 1, loggedWeeks: 4, hitRatePct: 100, liftPct: 50 });
    expect(data!.signals).toContainEqual(
      { goalId: "g2", dow: 3, loggedWeeks: 4, hitRatePct: 100, liftPct: 50 });
    expect(data!.signals).toContainEqual(
      { goalId: "g1", dow: 4, loggedWeeks: 4, hitRatePct: 0, liftPct: -50 });
  });

  it("carries the target's own weekday grid, ordered from the week start", () => {
    const data = computeHitSignals(goal, ["g1", "g2"], entries, "monday", now, "2026-05-18");
    expect(data!.days).toHaveLength(7);
    expect(data!.days[0]).toEqual({ dow: 1, loggedWeeks: 4, hitRatePct: 100 }); // Mondays
    expect(data!.days[3]).toEqual({ dow: 4, loggedWeeks: 4, hitRatePct: 0 }); // Thursdays
    expect(data!.days[1]).toEqual({ dow: 2, loggedWeeks: 0, hitRatePct: null }); // never logged
  });

  it("ignores predictor goals outside the given set but still fills the grid", () => {
    const data = computeHitSignals(goal, ["g2"], entries, "monday", now, "2026-05-18");
    expect(data!.signals.some((s) => s.goalId === "g1")).toBe(false);
    expect(data!.signals.some((s) => s.goalId === "g2")).toBe(true);
    expect(data!.days[0]).toEqual({ dow: 1, loggedWeeks: 4, hitRatePct: 100 });
  });

  it("withholds combos under 4 logged weeks", () => {
    // move one Monday log to Tuesday → 3 logged Mondays, 1 logged Tuesday
    const moved = entries.map((e) =>
      e.date === "2026-05-18" && e.trackerId === "g1" ? { ...e, date: "2026-05-19" } : e,
    );
    const data = computeHitSignals(goal, ["g1", "g2"], moved, "monday", now, "2026-05-18");
    expect(data!.signals.some((s) => s.goalId === "g1" && (s.dow === 1 || s.dow === 2))).toBe(false);
  });

  it("withholds combos that happen almost every week (no contrast group)", () => {
    // g3 logs every Monday of all 8 weeks → 0 contrast weeks
    const withG3 = [
      ...entries,
      ...weekStarts.map((ws) => entry(ws, 1, { trackerId: "g3" })),
    ];
    const data = computeHitSignals(goal, ["g3"], withG3, "monday", now, "2026-05-18");
    expect(data!.signals).toHaveLength(0);
  });

  it("returns null under 6 considered weeks or without a weekly target", () => {
    expect(computeHitSignals(goal, ["g1"], entries, "monday", now, "2026-06-08")).toBeNull();
    expect(computeHitSignals({ id: "g1" }, ["g1"], entries, "monday", now, "2026-05-18")).toBeNull();
  });

  it("keeps full lookback when createdAt is newer than the entries (migrated goals)", () => {
    // migration stamped createdAt = 2026-07-10 even though entries go back to May
    const migrated = { ...goal, createdAt: "2026-07-10T00:00:00.000Z" };
    const data = computeHitSignals(migrated, ["g1", "g2"], entries, "monday", now, "2026-05-18");
    expect(data).not.toBeNull();
    expect(data!.weeks).toBe(8);
  });

  it("does not count N/A or zero-amount entries as showing up", () => {
    // an N/A Friday every week would otherwise be an 8-week combo
    const withNa = [
      ...entries,
      ...weekStarts.map((ws) => ({ ...entry(shiftDay(ws, 4), 0, { trackerId: "g2" }), notApplicable: true })),
    ];
    const data = computeHitSignals(goal, ["g1", "g2"], withNa, "monday", now, "2026-05-18");
    expect(data!.signals.some((s) => s.goalId === "g2" && s.dow === 5)).toBe(false);
  });
});

describe("computeComebackOdds", () => {
  // 8 full monday-start weeks, target 10. Weeks 1-6: nothing by Thursday
  // (behind at day 4); two of them are rescued with 10 on Friday. Weeks 7-8:
  // 10 on Monday (never behind).
  const goal = { id: "g1", weeklyGoal: 10, createdAt: "2026-01-01T00:00:00.000Z" };
  const weekStarts = ["2026-05-18", "2026-05-25", "2026-06-01", "2026-06-08",
    "2026-06-15", "2026-06-22", "2026-06-29", "2026-07-06"];
  const shiftDate = (key: string, days: number) => {
    const d = parseDateKey(key);
    d.setDate(d.getDate() + days);
    return d.toISOString().slice(0, 10);
  };
  const entries = weekStarts.flatMap((ws, i) => {
    if (i >= 6) return [entry(ws, 10)];
    return i < 2 ? [entry(shiftDate(ws, 4), 10)] : [];
  });

  it("computes the rescue rate over behind-at-day-4 weeks", () => {
    const odds = computeComebackOdds(goal, entries, "monday", now, "2026-05-18");
    expect(odds).toEqual({ behindWeeks: 6, rescuedWeeks: 2, rescuePct: 33 });
  });

  it("hides under 6 behind weeks", () => {
    // window starts a week later → only 5 behind weeks
    expect(computeComebackOdds(goal, entries, "monday", now, "2026-05-25")).toBeNull();
  });

  it("ignores goals without a weekly target", () => {
    expect(computeComebackOdds({ id: "g1" }, entries, "monday", now, "2026-05-18")).toBeNull();
  });
});
