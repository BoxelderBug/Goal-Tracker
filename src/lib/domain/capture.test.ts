import { describe, expect, it } from "vitest";
import type { Settings } from "@/types/models";
import { normalizeSettings } from "@/lib/migration/normalize";
import {
  CAPTURE_KINDS,
  computeCapturePeriod,
  countInRange,
  enabledCaptureKinds,
  getCaptureTarget,
  isCaptureEnabled,
} from "./capture";
import { parseDateKey } from "./dates";

const settings = (patch: Partial<Settings> = {}): Settings => ({
  ...normalizeSettings({}),
  ...patch,
});

const range = (start: string, end: string) => ({
  start: parseDateKey(start),
  end: parseDateKey(end),
});

describe("capture kinds", () => {
  it("defaults every kind to on", () => {
    const s = settings();
    expect(enabledCaptureKinds(s).map((m) => m.kind)).toEqual(["question", "idea", "experiment"]);
    for (const meta of CAPTURE_KINDS) expect(isCaptureEnabled(s, meta.kind)).toBe(true);
  });

  it("drops a kind that is switched off", () => {
    const s = settings({ ideasEnabled: false });
    expect(enabledCaptureKinds(s).map((m) => m.kind)).toEqual(["question", "experiment"]);
    expect(isCaptureEnabled(s, "idea")).toBe(false);
  });
});

describe("getCaptureTarget", () => {
  it("reads the period's own target", () => {
    const s = settings({ ideasWeeklyGoal: 3, ideasMonthlyGoal: 12, ideasYearlyGoal: 150 });
    expect(getCaptureTarget(s, "idea", "week")).toBe(3);
    expect(getCaptureTarget(s, "idea", "month")).toBe(12);
    expect(getCaptureTarget(s, "idea", "year")).toBe(150);
  });

  it("derives the quarter from monthly ×3, else a quarter of the year", () => {
    expect(getCaptureTarget(settings({ ideasMonthlyGoal: 12 }), "idea", "quarter")).toBe(36);
    expect(getCaptureTarget(settings({ ideasYearlyGoal: 150 }), "idea", "quarter")).toBe(38);
    expect(getCaptureTarget(settings(), "idea", "quarter")).toBe(0);
  });

  it("keeps kinds independent", () => {
    const s = settings({ questionsWeeklyGoal: 5, experimentsWeeklyGoal: 1 });
    expect(getCaptureTarget(s, "question", "week")).toBe(5);
    expect(getCaptureTarget(s, "idea", "week")).toBe(0);
    expect(getCaptureTarget(s, "experiment", "week")).toBe(1);
  });
});

describe("countInRange", () => {
  const items = [
    { date: "2026-06-30" },
    { date: "2026-07-01" },
    { date: "2026-07-15" },
    { date: "2026-07-31" },
    { date: "2026-08-01" },
  ];

  it("counts both ends of the range inclusively", () => {
    expect(countInRange(items, range("2026-07-01", "2026-07-31"))).toBe(3);
  });

  it("is 0 when nothing lands inside", () => {
    expect(countInRange(items, range("2026-09-01", "2026-09-30"))).toBe(0);
  });
});

describe("computeCapturePeriod", () => {
  it("hits the target and reports the tone", () => {
    const s = settings({ ideasWeeklyGoal: 2 });
    const week = range("2026-07-20", "2026-07-26");
    const result = computeCapturePeriod(
      s,
      "idea",
      [{ date: "2026-07-21" }, { date: "2026-07-22" }, { date: "2026-08-01" }],
      "week",
      week,
      parseDateKey("2026-07-24"),
    );
    expect(result.count).toBe(2);
    expect(result.target).toBe(2);
    expect(result.tone).toBe("hit");
    expect(result.meta.href).toBe("/ideas");
  });

  it("projects the rest of the period when behind", () => {
    const s = settings({ questionsWeeklyGoal: 7 });
    const week = range("2026-07-20", "2026-07-26");
    // 1 logged over the first 5 days → projects to ~1.4, well under 7
    const result = computeCapturePeriod(
      s,
      "question",
      [{ date: "2026-07-20" }],
      "week",
      week,
      parseDateKey("2026-07-24"),
    );
    expect(result.count).toBe(1);
    expect(result.pace.projected).toBeCloseTo(1.4, 5);
    expect(result.tone).toBe("missed");
  });

  it("stays on-pace-toned when there is no target", () => {
    const result = computeCapturePeriod(
      settings(),
      "experiment",
      [{ date: "2026-07-21" }],
      "week",
      range("2026-07-20", "2026-07-26"),
      parseDateKey("2026-07-24"),
    );
    expect(result.target).toBe(0);
    expect(result.tone).toBe("onpace");
  });
});
