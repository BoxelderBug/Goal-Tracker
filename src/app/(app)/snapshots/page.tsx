"use client";

import { useState } from "react";
import { orderBy } from "firebase/firestore";
import type { PeriodKind, PeriodSnapshot } from "@/types/models";
import { useUserData } from "@/components/data/UserDataProvider";
import { snapshotsRepo } from "@/lib/firebase/repos";
import { useCollection } from "@/hooks/useCollection";
import { formatAmount } from "@/lib/domain/format";
import { Button } from "@/components/ui/Button";
import { Card, CardTitle } from "@/components/ui/Card";
import { Badge } from "@/components/ui/Badge";
import { EmptyState } from "@/components/ui/EmptyState";
import { useConfirm } from "@/components/ui/ConfirmDialog";
import { toast } from "@/components/ui/Toaster";

const PERIOD_LABELS: Record<PeriodKind, string> = {
  week: "Week",
  month: "Month",
  quarter: "Quarter",
  year: "Year",
};

export default function SnapshotsPage() {
  const { uid } = useUserData();
  const confirm = useConfirm();
  const { data: snapshots, loading } = useCollection<PeriodSnapshot>(
    () => snapshotsRepo.query(uid, orderBy("closedAt", "desc")),
    [uid],
  );
  const [expanded, setExpanded] = useState<string | null>(null);

  async function handleDelete(snapshot: PeriodSnapshot) {
    const ok = await confirm({
      message: "Delete this snapshot? This cannot be undone.",
      confirmLabel: "Delete",
      danger: true,
    });
    if (!ok) return;
    try {
      await snapshotsRepo.remove(uid, snapshot.id);
      toast.success("Snapshot deleted");
    } catch {
      toast.error("Could not delete snapshot");
    }
  }

  return (
    <div className="flex flex-col gap-4">
      <h1 className="font-display text-2xl">Snapshots</h1>

      {loading ? (
        <p className="text-sm text-muted">Loading…</p>
      ) : snapshots.length === 0 ? (
        <EmptyState>No snapshots yet — close out a period to save one.</EmptyState>
      ) : (
        <div className="grid gap-3">
          {snapshots.map((snap) => {
            const isOpen = expanded === snap.id;
            return (
              <Card key={snap.id} className="flex flex-col gap-3">
                <div className="flex flex-wrap items-start justify-between gap-2">
                  <div>
                    <CardTitle>
                      {PERIOD_LABELS[snap.period]} · {snap.rangeStart} → {snap.rangeEnd}
                    </CardTitle>
                    <p className="text-xs text-muted">Closed {snap.closedAt.slice(0, 10)}</p>
                  </div>
                  <Badge tone="accent">{snap.summary.onPaceLabel}</Badge>
                </div>

                <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
                  <Stat label="Completion" value={`${snap.summary.completion}%`} />
                  <Stat label="Progress" value={formatAmount(snap.summary.totalProgress)} />
                  <Stat label="Target" value={formatAmount(snap.summary.totalTarget)} />
                  <Stat label="Points" value={formatAmount(snap.summary.goalPointsEarned)} />
                </div>

                <div className="flex items-center justify-between">
                  <Button
                    size="sm"
                    variant="ghost"
                    aria-expanded={isOpen}
                    onClick={() => setExpanded(isOpen ? null : snap.id)}
                  >
                    {isOpen ? "Hide goals" : `Show ${snap.goals.length} goals`}
                  </Button>
                  <Button size="sm" variant="ghost" onClick={() => handleDelete(snap)}>Delete</Button>
                </div>

                {isOpen ? (
                  <ul className="flex flex-col divide-y divide-border rounded-lg border border-border">
                    {snap.goals.map((g) => (
                      <li key={g.trackerId} className="flex items-center justify-between gap-3 px-3 py-2 text-sm">
                        <span className="flex items-center gap-2">
                          <span className={g.hit ? "text-tone-hit" : "text-muted"}>{g.hit ? "✓" : "•"}</span>
                          <span className="font-medium">{g.name}</span>
                        </span>
                        <span className="text-muted">
                          {formatAmount(g.progress)}
                          {g.target > 0 ? ` / ${formatAmount(g.target)}` : ""} {g.unit}
                          {g.pointsEarned > 0 ? ` · +${formatAmount(g.pointsEarned)} pts` : ""}
                        </span>
                      </li>
                    ))}
                  </ul>
                ) : null}
              </Card>
            );
          })}
        </div>
      )}
    </div>
  );
}

function Stat({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex flex-col">
      <span className="text-xs uppercase tracking-wide text-muted">{label}</span>
      <span className="font-display text-lg">{value}</span>
    </div>
  );
}
