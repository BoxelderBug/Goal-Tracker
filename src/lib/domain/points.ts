/**
 * Reward-points math. Convention: earn/refund/positive adjustments store a
 * positive amount, spends store a negative amount, so the balance is just the
 * sum. Pure — no Firebase/React.
 */
import type { PointTransaction, PointTransactionType } from "@/types/models";
import { createId } from "@/lib/id";

export function pointsBalance(transactions: PointTransaction[]): number {
  return transactions.reduce((sum, t) => sum + (Number(t.amount) || 0), 0);
}

export function newPointTransaction(params: {
  type: PointTransactionType;
  amount: number;
  note?: string;
  refKey?: string;
  rewardId?: string;
}): PointTransaction {
  return {
    id: createId(),
    type: params.type,
    amount: params.amount,
    createdAt: new Date().toISOString(),
    note: params.note ?? "",
    refKey: params.refKey ?? "",
    rewardId: params.rewardId ?? "",
  };
}

/** Stable dedupe key for a period's close-out earnings. */
export function closeoutRefKey(period: string, rangeStartKey: string): string {
  return `closeout:${period}:${rangeStartKey}`;
}
