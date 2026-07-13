"use client";

import Link from "next/link";
import { collection, query, where } from "firebase/firestore";
import type { GoalShare } from "@/types/models";
import { useUserData } from "@/components/data/UserDataProvider";
import { useCollection } from "@/hooks/useCollection";
import { idConverter } from "@/lib/firebase/converters";
import { GOAL_SHARE_COLLECTION, getDb } from "@/lib/firebase/client";
import { formatAmount } from "@/lib/domain/format";
import { Card, CardTitle } from "@/components/ui/Card";
import { Button } from "@/components/ui/Button";

function summaryText(s: GoalShare): string {
  const g = s.goalSummary;
  if (!g) return "no update yet";
  const pct = g.target > 0 ? ` · ${Math.round((g.progress / g.target) * 100)}%` : "";
  const of = g.target > 0 ? ` / ${formatAmount(g.target)}` : "";
  return `${formatAmount(g.progress)}${of} ${s.goalUnit}${pct}`.trim();
}

/**
 * Dashboard card for goals you follow as an accountability partner. Renders
 * nothing until you've accepted at least one share, so it stays out of the way.
 */
export function FollowingCard() {
  const { uid } = useUserData();
  const incoming = useCollection<GoalShare>(
    () =>
      query(
        collection(getDb(), GOAL_SHARE_COLLECTION).withConverter(idConverter<GoalShare>()),
        where("partnerUid", "==", uid),
      ),
    [uid],
  );
  const following = incoming.data.filter((s) => s.status === "approved");
  if (following.length === 0) return null;

  return (
    <Card>
      <div className="mb-2 flex items-center justify-between gap-2">
        <CardTitle>Following</CardTitle>
        <Link href="/partners"><Button size="sm" variant="ghost">Manage</Button></Link>
      </div>
      <ul className="flex flex-col divide-y divide-border">
        {following.map((s) => (
          <li key={s.id} className="flex items-center justify-between gap-3 py-2">
            <div className="flex flex-col">
              <span className="text-sm font-medium">{s.goalName}</span>
              <span className="text-xs text-muted">{s.ownerUsername || s.ownerEmail}</span>
            </div>
            <span className="text-xs text-muted">{summaryText(s)}</span>
          </li>
        ))}
      </ul>
    </Card>
  );
}
