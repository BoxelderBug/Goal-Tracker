import { describe, expect, it } from "vitest";
import type { Entry } from "@/types/models";
import { parseDateKey } from "./dates";
import { computeStreaks } from "./streaks";

const entry = (date: string, trackerId = "g1"): Entry => ({
  id: `${trackerId}-${date}`, trackerId, date, amount: 1,
  notApplicable: false, goalsPlus: null, metricValues: {}, notes: "",
  createdAt: "2026-07-01T00:00:00.000Z",
});

const now = parseDateKey("2026-07-12");

describe("computeStreaks", () => {
  it("returns zeros with no entries", () => {
    expect(computeStreaks([], now)).toEqual({ current: 0, longest: 0, countedToday: false });
  });

  it("counts a current streak ending today", () => {
    const r = computeStreaks([entry("2026-07-10"), entry("2026-07-11"), entry("2026-07-12")], now);
    expect(r.current).toBe(3);
    expect(r.countedToday).toBe(true);
  });

  it("keeps the streak alive when today has no entry yet", () => {
    const r = computeStreaks([entry("2026-07-10"), entry("2026-07-11")], now);
    expect(r.current).toBe(2);
    expect(r.countedToday).toBe(false);
  });

  it("breaks the streak after a missed day", () => {
    const r = computeStreaks([entry("2026-07-09"), entry("2026-07-10")], now);
    expect(r.current).toBe(0); // yesterday (07-11) missing → dead
    expect(r.longest).toBe(2);
  });

  it("finds the longest run anywhere in history", () => {
    const r = computeStreaks(
      ["2026-06-01", "2026-06-02", "2026-06-03", "2026-06-04", "2026-07-11", "2026-07-12"].map((d) => entry(d)),
      now,
    );
    expect(r.longest).toBe(4);
    expect(r.current).toBe(2);
  });

  it("dedupes multiple entries on the same day and filters by goal", () => {
    const entries = [entry("2026-07-12", "g1"), entry("2026-07-12", "g1"), entry("2026-07-12", "g2"), entry("2026-07-11", "g2")];
    expect(computeStreaks(entries, now).current).toBe(2); // any goal
    expect(computeStreaks(entries, now, "g1").current).toBe(1);
    expect(computeStreaks(entries, now, "g2").current).toBe(2);
  });
});
