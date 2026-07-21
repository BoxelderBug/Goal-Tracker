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

  it("is on pace when at or past an even split, behind otherwise", () => {
    // day 11 of 31 -> even split expects 35.48
    expect(computeChallengeProgress(challenge(), [entry("2026-07-02", 40)], "2026-07-11").tone).toBe("onpace");
    expect(computeChallengeProgress(challenge(), [entry("2026-07-02", 20)], "2026-07-11").tone).toBe("behind");
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
