"use client";

import { useEffect, useMemo } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useSettings, useUserData } from "@/components/data/UserDataProvider";
import { entriesRepo } from "@/lib/firebase/repos";
import { newEntry } from "@/lib/domain/newEntry";
import { getDateKey, normalizeDate } from "@/lib/domain/dates";
import { buildDailyTotals } from "@/lib/domain/progress";
import { formatAmount } from "@/lib/domain/format";
import { Button } from "@/components/ui/Button";
import { Card } from "@/components/ui/Card";
import { ProgressBar } from "@/components/ui/ProgressBar";
import { EmptyState } from "@/components/ui/EmptyState";
import { toast } from "@/components/ui/Toaster";

export default function BucketListPage() {
  const { uid, goals, entries } = useUserData();
  const settings = useSettings();
  const router = useRouter();

  useEffect(() => {
    if (!settings.bucketListEnabled) router.replace("/settings");
  }, [settings.bucketListEnabled, router]);

  const bucketGoals = useMemo(() => goals.filter((g) => g.goalType === "bucket" && !g.archived), [goals]);
  const totalsByGoal = useMemo(() => {
    const totals = buildDailyTotals(entries);
    const byGoal = new Map<string, number>();
    for (const [key, amount] of totals) {
      const id = key.slice(0, key.indexOf("|"));
      byGoal.set(id, (byGoal.get(id) ?? 0) + amount);
    }
    return byGoal;
  }, [entries]);

  if (!settings.bucketListEnabled) return null;

  async function addOne(goalId: string) {
    try {
      await entriesRepo.set(uid, newEntry({ trackerId: goalId, date: getDateKey(normalizeDate(new Date())), amount: 1, notes: "Bucket item" }));
      toast.success("Checked off one");
    } catch {
      toast.error("Could not update");
    }
  }

  return (
    <div className="flex flex-col gap-4">
      <h1 className="font-display text-2xl">Bucket list</h1>

      {bucketGoals.length === 0 ? (
        <EmptyState>
          No bucket-list goals yet. Create a goal with the &quot;Bucket list&quot; type under{" "}
          <Link href="/settings/goals/new" className="text-accent-strong underline">Goals</Link>.
        </EmptyState>
      ) : (
        <div className="flex flex-col gap-3">
          {bucketGoals.map((goal) => {
            const done = totalsByGoal.get(goal.id) ?? 0;
            const target = goal.termTarget || goal.yearlyGoal || 0;
            const pct = target > 0 ? Math.min(100, Math.round((done / target) * 100)) : 0;
            return (
              <Card key={goal.id} className="flex flex-col gap-2">
                <div className="flex items-center justify-between gap-3">
                  <span className="font-medium">{goal.name}</span>
                  <span className="text-sm text-muted">
                    {formatAmount(done)}{target > 0 ? ` / ${formatAmount(target)}` : ""} {goal.unit || "items"}
                  </span>
                </div>
                {target > 0 ? <ProgressBar percent={pct} tone={done >= target ? "hit" : "onpace"} /> : null}
                <div className="flex justify-end">
                  <Button size="sm" variant="primary" onClick={() => addOne(goal.id)}>Check off one</Button>
                </div>
              </Card>
            );
          })}
        </div>
      )}
    </div>
  );
}
