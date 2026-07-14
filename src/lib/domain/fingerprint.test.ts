import { describe, expect, it } from "vitest";
import type { Entry } from "@/types/models";
import { parseDateKey } from "./dates";
import { computeWeekdayFingerprint } from "./fingerprint";

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
