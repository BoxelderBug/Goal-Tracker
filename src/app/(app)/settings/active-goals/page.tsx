"use client";

import { useMemo, useState } from "react";
import Link from "next/link";
import type { Goal } from "@/types/models";
import { useUserData } from "@/components/data/UserDataProvider";
import { goalsRepo } from "@/lib/firebase/repos";
import { Button } from "@/components/ui/Button";
import { Card } from "@/components/ui/Card";
import { Input } from "@/components/ui/Input";
import { EmptyState } from "@/components/ui/EmptyState";
import { toast } from "@/components/ui/Toaster";

/** Editable subset of a Goal exposed in the quick-edit table. */
interface Draft {
  name: string;
  weeklyGoal: string;
  monthlyGoal: string;
  yearlyGoal: string;
  priority: string;
}

function toDraft(goal: Goal): Draft {
  return {
    name: goal.name,
    weeklyGoal: String(goal.weeklyGoal),
    monthlyGoal: String(goal.monthlyGoal),
    yearlyGoal: String(goal.yearlyGoal),
    priority: String(goal.priority),
  };
}

function num(value: string): number {
  const n = Number(value);
  return Number.isFinite(n) ? n : 0;
}

/** Fold a draft back onto its goal, coercing numeric fields. */
function applyDraft(goal: Goal, draft: Draft): Goal {
  return {
    ...goal,
    name: draft.name.trim() || goal.name,
    weeklyGoal: num(draft.weeklyGoal),
    monthlyGoal: num(draft.monthlyGoal),
    yearlyGoal: num(draft.yearlyGoal),
    priority: num(draft.priority),
  };
}

function draftDiffers(goal: Goal, draft: Draft): boolean {
  const applied = applyDraft(goal, draft);
  return (
    applied.name !== goal.name ||
    applied.weeklyGoal !== goal.weeklyGoal ||
    applied.monthlyGoal !== goal.monthlyGoal ||
    applied.yearlyGoal !== goal.yearlyGoal ||
    applied.priority !== goal.priority
  );
}

export default function ActiveGoalsPage() {
  const { uid, goals, loading } = useUserData();
  const activeGoals = useMemo(() => goals.filter((g) => !g.archived), [goals]);

  const [drafts, setDrafts] = useState<Record<string, Draft>>({});
  const [saving, setSaving] = useState(false);

  // The live goals are the source of truth; a draft only exists for edited rows.
  const draftFor = (goal: Goal): Draft => drafts[goal.id] ?? toDraft(goal);

  function edit(goalId: string, field: keyof Draft, value: string, base: Goal) {
    setDrafts((prev) => ({
      ...prev,
      [goalId]: { ...(prev[goalId] ?? toDraft(base)), [field]: value },
    }));
  }

  const dirtyGoals = useMemo(
    () => activeGoals.filter((g) => drafts[g.id] && draftDiffers(g, drafts[g.id])),
    [activeGoals, drafts],
  );

  async function saveAll() {
    if (dirtyGoals.length === 0) return;
    setSaving(true);
    try {
      const updated = dirtyGoals.map((g) => applyDraft(g, drafts[g.id]));
      await goalsRepo.setMany(uid, updated);
      setDrafts({});
      toast.success(`Saved ${updated.length} goal${updated.length === 1 ? "" : "s"}`);
    } catch {
      toast.error("Could not save changes");
    } finally {
      setSaving(false);
    }
  }

  function resetAll() {
    setDrafts({});
  }

  async function archive(goal: Goal) {
    try {
      await goalsRepo.set(uid, { ...goal, archived: true });
      setDrafts((prev) => {
        const next = { ...prev };
        delete next[goal.id];
        return next;
      });
      toast.success("Goal archived");
    } catch {
      toast.error("Could not archive goal");
    }
  }

  return (
    <div className="flex flex-col gap-4">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <h1 className="font-display text-2xl">Active goals</h1>
        <div className="flex gap-2">
          <Button onClick={resetAll} disabled={dirtyGoals.length === 0 || saving}>
            Reset
          </Button>
          <Button variant="primary" onClick={saveAll} disabled={dirtyGoals.length === 0 || saving}>
            {saving ? "Saving…" : dirtyGoals.length > 0 ? `Save ${dirtyGoals.length}` : "Save"}
          </Button>
        </div>
      </div>
      <p className="text-sm text-muted">
        Quick-edit targets and priority across all active goals. Changes are staged until you save.
      </p>

      {loading ? (
        <EmptyState>Loading goals…</EmptyState>
      ) : activeGoals.length === 0 ? (
        <EmptyState>
          No active goals. <Link href="/settings/goals/new" className="text-accent-strong underline">Create one</Link>.
        </EmptyState>
      ) : (
        <Card className="overflow-x-auto p-0">
          <table className="w-full min-w-[44rem] border-collapse text-sm">
            <thead>
              <tr className="border-b border-border text-left text-xs uppercase tracking-wide text-muted">
                <th className="px-3 py-2 font-medium">Goal</th>
                <th className="px-3 py-2 font-medium">Weekly</th>
                <th className="px-3 py-2 font-medium">Monthly</th>
                <th className="px-3 py-2 font-medium">Yearly</th>
                <th className="px-3 py-2 font-medium">Priority</th>
                <th className="px-3 py-2 font-medium">Unit</th>
                <th className="px-3 py-2" />
              </tr>
            </thead>
            <tbody>
              {activeGoals.map((goal) => {
                const draft = draftFor(goal);
                const dirty = Boolean(drafts[goal.id]) && draftDiffers(goal, draft);
                return (
                  <tr
                    key={goal.id}
                    className={dirty ? "border-b border-border bg-accent-soft/40" : "border-b border-border"}
                  >
                    <td className="px-3 py-2">
                      <Input
                        className="min-w-[10rem] py-1"
                        value={draft.name}
                        onChange={(e) => edit(goal.id, "name", e.target.value, goal)}
                        aria-label={`Name for ${goal.name}`}
                      />
                    </td>
                    {(["weeklyGoal", "monthlyGoal", "yearlyGoal", "priority"] as const).map((field) => (
                      <td key={field} className="px-3 py-2">
                        <Input
                          type="number" step="any" inputMode="decimal"
                          className="w-20 py-1"
                          value={draft[field]}
                          onChange={(e) => edit(goal.id, field, e.target.value, goal)}
                          aria-label={`${field} for ${goal.name}`}
                        />
                      </td>
                    ))}
                    <td className="px-3 py-2 text-muted">{goal.unit || "—"}</td>
                    <td className="px-3 py-2">
                      <div className="flex justify-end gap-1">
                        <Link href={`/settings/goals/${goal.id}`}>
                          <Button size="sm" variant="ghost">Edit</Button>
                        </Link>
                        <Button size="sm" variant="ghost" onClick={() => archive(goal)}>Archive</Button>
                      </div>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </Card>
      )}
    </div>
  );
}
