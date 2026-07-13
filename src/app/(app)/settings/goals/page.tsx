"use client";

import { useState } from "react";
import Link from "next/link";
import type { Goal } from "@/types/models";
import { useUserData } from "@/components/data/UserDataProvider";
import { goalsRepo } from "@/lib/firebase/repos";
import { moveToTrash } from "@/lib/firebase/actions/trash";
import { removeSharesForGoal } from "@/lib/firebase/actions/shares";
import { Button } from "@/components/ui/Button";
import { Card } from "@/components/ui/Card";
import { Badge } from "@/components/ui/Badge";
import { EmptyState } from "@/components/ui/EmptyState";
import { useConfirm } from "@/components/ui/ConfirmDialog";
import { toast } from "@/components/ui/Toaster";
import { GOALS_PLUS_LABELS, GOAL_TYPE_LABELS } from "@/lib/domain/format";

export default function GoalsSettingsPage() {
  const { uid, goals, loading } = useUserData();
  const confirm = useConfirm();
  const [showArchived, setShowArchived] = useState(false);

  const visible = goals.filter((g) => (showArchived ? g.archived : !g.archived));

  async function toggleArchive(goal: Goal) {
    await goalsRepo.set(uid, { ...goal, archived: !goal.archived });
    toast.success(goal.archived ? "Goal restored" : "Goal archived");
  }

  async function remove(goal: Goal) {
    const ok = await confirm({
      title: "Delete goal",
      message: `Delete "${goal.name}"? You can restore it from Trash. Its entries are kept and reattach if you restore it.`,
      confirmLabel: "Delete",
      danger: true,
    });
    if (!ok) return;
    await moveToTrash(uid, "goal", goal, goal.name);
    // Best-effort: don't leave partners following a frozen summary.
    removeSharesForGoal(uid, goal.id).catch(() => {});
    toast.success("Goal moved to Trash");
  }

  return (
    <div className="flex flex-col gap-4">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <h1 className="font-display text-2xl">Goals</h1>
        <div className="flex gap-2">
          <Button onClick={() => setShowArchived((v) => !v)}>
            {showArchived ? "Show active" : "Show archived"}
          </Button>
          <Link href="/settings/goals/new">
            <Button variant="primary">New goal</Button>
          </Link>
        </div>
      </div>

      {loading ? (
        <EmptyState>Loading goals…</EmptyState>
      ) : visible.length === 0 ? (
        <EmptyState>
          {showArchived ? "No archived goals." : "No goals yet — create your first one."}
        </EmptyState>
      ) : (
        <div className="flex flex-col gap-3">
          {visible.map((goal) => (
            <Card key={goal.id} className="flex flex-wrap items-center justify-between gap-3">
              <div className="flex flex-col gap-1">
                <div className="flex flex-wrap items-center gap-2">
                  <span className="font-medium">{goal.name}</span>
                  <Badge tone="neutral">{GOAL_TYPE_LABELS[goal.goalType]}</Badge>
                  {goal.goalsPlus.mode !== "standard" ? (
                    <Badge tone="accent">{GOALS_PLUS_LABELS[goal.goalsPlus.mode]}</Badge>
                  ) : null}
                  {goal.tags.map((tag) => (
                    <Badge key={tag} tone="neutral">#{tag}</Badge>
                  ))}
                </div>
                <span className="text-xs text-muted">
                  {goal.weeklyGoal ? `${goal.weeklyGoal}/wk · ` : ""}
                  {goal.monthlyGoal ? `${goal.monthlyGoal}/mo · ` : ""}
                  {goal.yearlyGoal ? `${goal.yearlyGoal}/yr · ` : ""}
                  {goal.unit}
                </span>
              </div>
              <div className="flex gap-2">
                <Link href={`/settings/goals/${goal.id}`}>
                  <Button size="sm">Edit</Button>
                </Link>
                <Button size="sm" onClick={() => toggleArchive(goal)}>
                  {goal.archived ? "Restore" : "Archive"}
                </Button>
                <Button size="sm" variant="danger" onClick={() => remove(goal)}>
                  Delete
                </Button>
              </div>
            </Card>
          ))}
        </div>
      )}
    </div>
  );
}
