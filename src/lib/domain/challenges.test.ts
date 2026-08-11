import { describe, expect, it } from "vitest";
import type { Challenge, Entry } from "@/types/models";
import { compareChallenges, computeChallengeProgress, type ChallengeProgress } from "./challenges";

const challenge = (over: Partial<Challenge> = {}): Challenge => ({
  id: "c1",
  goalId: "g1",
  name: "100 miles",
  description: "",
  kind: "amount",
  target: 100,
  startDate: "2026-07-01",
  dueDate: "2026-07-31", // 31-day window
  createdAt: "2026-07-01T00:00:00.000Z",
  ...over,
});

const entry = (date: string, amount: number, trackerId = "g1"): Entry => ({
  id: `${trackerId}-${date}`,
  trackerId,
  date,
  amount,
  notApplicable: false,
  goalsPlus: null,
  metricValues: {},
  notes: "",
  createdAt: "2026-07-01T00:00:00.000Z",
});

describe("computeChallengeProgress", () => {
  it("sums only this goal's entries inside the window and reports days left", () => {
    const p = computeChallengeProgress(
      challenge(),
      [
        entry("2026-06-30", 9), // before the start
        entry("2026-07-02", 6),
        entry("2026-07-10", 4.5),
        entry("2026-07-10", 20, "g2"), // another goal
        entry("2026-08-01", 9), // after the due date
      ],
      "2026-07-11",
    );
    expect(p.amount).toBe(10.5);
    expect(p.remaining).toBe(89.5);
    expect(p.percent).toBe(10.5);
    expect(p.daysRemaining).toBe(20);
    expect(p.status).toBe("active");
  });

  it("tones by where the current pace lands, in the same tiers as period goals", () => {
    // day 11 of 31, so 10 finished days: projected = (amount / 10) * 31
    const toneAt = (amount: number) =>
      computeChallengeProgress(challenge(), [entry("2026-07-02", amount)], "2026-07-11").tone;
    expect(toneAt(40)).toBe("onpace"); // projects 124 — clears the target
    expect(toneAt(30)).toBe("behind"); // projects 93 — short, but within 75%
    expect(toneAt(20)).toBe("missed"); // projects 62 — badly short
  });

  it("reports the daily average and where it projects to", () => {
    // 22 logged over the 10 FINISHED days of a 31-day window (day 11 is today,
    // still in progress, so it is not part of the divisor)
    const p = computeChallengeProgress(challenge(), [entry("2026-07-02", 22)], "2026-07-11");
    expect(p.avgPerDay).toBe(2.2);
    expect(p.projected).toBe(68.2);
    expect(p.projectedPercent).toBe(68.2);
  });

  it("does not let a day still in progress drag the average down", () => {
    // same 22 logged; yesterday the divisor was 9 finished days, today it is 10
    const yesterday = computeChallengeProgress(challenge(), [entry("2026-07-02", 22)], "2026-07-10");
    expect(yesterday.avgPerDay).toBeCloseTo(2.44, 2);
    // logging nothing today moves the rate by one day's worth, not by a
    // whole day of credit vanishing
    const today = computeChallengeProgress(challenge(), [entry("2026-07-02", 22)], "2026-07-11");
    expect(today.avgPerDay).toBe(2.2);
  });

  it("divides the first day by itself, having no finished day to go on", () => {
    const p = computeChallengeProgress(challenge(), [entry("2026-07-01", 5)], "2026-07-01");
    expect(p.avgPerDay).toBe(5);
    expect(p.projected).toBe(155);
  });

  it("stays neutral before the window opens instead of projecting a miss", () => {
    const p = computeChallengeProgress(challenge(), [], "2026-06-20");
    expect(p).toMatchObject({ status: "upcoming", tone: "onpace", avgPerDay: 0, projected: 0 });
  });

  it("projects the final amount once the window is over", () => {
    const p = computeChallengeProgress(challenge(), [entry("2026-07-30", 62)], "2026-08-05");
    expect(p.avgPerDay).toBe(2);
    expect(p.projected).toBe(62);
  });

  it("leaves projectedPercent at 0 without a target", () => {
    const p = computeChallengeProgress(challenge({ target: 0 }), [entry("2026-07-02", 5)], "2026-07-11");
    expect(p.projectedPercent).toBe(0);
    expect(p.tone).toBe("onpace");
  });

  it("spreads what is left over the days remaining, today included", () => {
    // 21 days left (Jul 11–31) for the remaining 79
    const p = computeChallengeProgress(challenge(), [entry("2026-07-02", 21)], "2026-07-11");
    expect(p.requiredPerDay).toBe(3.76);
  });

  it("completes once the target is met, even after the due date", () => {
    const p = computeChallengeProgress(challenge(), [entry("2026-07-30", 100)], "2026-08-05");
    expect(p).toMatchObject({ status: "complete", tone: "hit", remaining: 0, requiredPerDay: 0 });
  });

  it("expires unmet past the due date and stops asking for a daily pace", () => {
    const p = computeChallengeProgress(challenge(), [entry("2026-07-30", 60)], "2026-08-05");
    expect(p).toMatchObject({ status: "expired", tone: "missed", remaining: 40, requiredPerDay: 0, daysRemaining: 0 });
  });

  it("is upcoming before the start date", () => {
    expect(computeChallengeProgress(challenge(), [], "2026-06-20").status).toBe("upcoming");
  });

  it("treats the due date itself as the last day", () => {
    const p = computeChallengeProgress(challenge(), [entry("2026-07-02", 95)], "2026-07-31");
    expect(p.daysRemaining).toBe(0);
    expect(p.status).toBe("active");
    expect(p.requiredPerDay).toBe(5);
  });

  it("reports 0% rather than dividing by a zero target", () => {
    const p = computeChallengeProgress(challenge({ target: 0 }), [entry("2026-07-02", 5)], "2026-07-11");
    expect(p.percent).toBe(0);
    expect(p.status).toBe("active");
  });
});

describe("compareChallenges", () => {
  const row = (id: string, dueDate: string, status: ChallengeProgress["status"]) => ({
    challenge: challenge({ id, dueDate }),
    progress: { status } as ChallengeProgress,
  });

  it("puts active first (soonest due leading), then upcoming, then finished", () => {
    const rows = [
      row("done", "2026-05-01", "complete"),
      row("later", "2026-09-01", "active"),
      row("soon", "2026-08-01", "active"),
      row("future", "2026-10-01", "upcoming"),
      row("lapsed", "2026-04-01", "expired"),
    ];
    expect([...rows].sort(compareChallenges).map((r) => r.challenge.id)).toEqual([
      "soon", "later", "future", "done", "lapsed",
    ]);
  });
});
