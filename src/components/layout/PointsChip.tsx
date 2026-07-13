"use client";

import { useMemo } from "react";
import Link from "next/link";
import type { PointTransaction } from "@/types/models";
import { useSettings, useUserData } from "@/components/data/UserDataProvider";
import { useCollection } from "@/hooks/useCollection";
import { pointTransactionsRepo } from "@/lib/firebase/repos";
import { pointsBalance } from "@/lib/domain/points";
import { formatAmount } from "@/lib/domain/format";

/** Header chip with the current points balance; hidden when points are off. */
export function PointsChip() {
  const { uid } = useUserData();
  const settings = useSettings();
  const enabled = settings.rewardPointsEnabled;

  const transactions = useCollection<PointTransaction>(
    () => (enabled ? pointTransactionsRepo.query(uid) : null),
    [uid, enabled],
  );
  const balance = useMemo(() => pointsBalance(transactions.data), [transactions.data]);

  if (!enabled) return null;
  return (
    <Link
      href="/points"
      title="Points balance"
      className="flex items-center gap-1 rounded-full bg-accent-soft px-2.5 py-1 text-sm font-medium text-accent-strong transition hover:brightness-95"
    >
      <span aria-hidden>⭐</span>
      {formatAmount(balance)}
    </Link>
  );
}
