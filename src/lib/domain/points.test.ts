import { describe, expect, it } from "vitest";
import type { PointTransaction } from "@/types/models";
import { closeoutRefKey, newPointTransaction, pointsBalance } from "./points";

const txn = (amount: number): PointTransaction => ({
  id: `t${amount}`, type: "adjustment", amount, createdAt: "2026-07-01T00:00:00.000Z",
  note: "", refKey: "", rewardId: "",
});

describe("pointsBalance", () => {
  it("sums positive earns and negative spends", () => {
    expect(pointsBalance([txn(10), txn(3), txn(-5)])).toBe(8);
    expect(pointsBalance([])).toBe(0);
  });
});

describe("newPointTransaction", () => {
  it("defaults optional fields", () => {
    const t = newPointTransaction({ type: "spend-reward", amount: -4 });
    expect(t.amount).toBe(-4);
    expect(t.note).toBe("");
    expect(t.refKey).toBe("");
    expect(t.id).toBeTruthy();
  });
});

describe("closeoutRefKey", () => {
  it("is stable for a period + range start", () => {
    expect(closeoutRefKey("week", "2026-07-06")).toBe("closeout:week:2026-07-06");
  });
});
