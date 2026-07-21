"use client";

import { useMemo, useState, type FormEvent } from "react";
import Link from "next/link";
import type { Challenge, Goal } from "@/types/models";
import { useUserData } from "@/components/data/UserDataProvider";
import { challengesRepo } from "@/lib/firebase/repos";
import { addDays, getDateKey } from "@/lib/domain/dates";
import { formatAmount } from "@/lib/domain/format";
import {
  compareChallenges,
  computeChallengeProgress,
  type ChallengeProgress,
} from "@/lib/domain/challenges";
import { createId } from "@/lib/id";
import { Badge } from "@/components/ui/Badge";
import { Button } from "@/components/ui/Button";
import { Card, CardTitle } from "@/components/ui/Card";
import { useConfirm } from "@/components/ui/ConfirmDialog";
import { EmptyState } from "@/components/ui/EmptyState";
import { Field } from "@/components/ui/Field";
import { Input, Select, Textarea } from "@/components/ui/Input";
import { Modal } from "@/components/ui/Modal";
import { ProgressBar } from "@/components/ui/ProgressBar";
import { toast } from "@/components/ui/Toaster";

/** The editable half of a challenge — what the form holds before saving. */
type Draft = Pick<Challenge, "goalId" | "name" | "description" | "target" | "startDate" | "dueDate">;

function emptyDraft(goalId: string): Draft {
  return {
    goalId,
    name: "",
    description: "",
    target: 0,
    startDate: getDateKey(new Date()),
    dueDate: getDateKey(addDays(new Date(), 30)),
  };
}

/**
 * The whole challenges feature: list, create, edit, delete. Pass `goalId` to
 * scope it to one goal (the goal picker disappears and new challenges land on
 * that goal); leave it off for the all-goals view.
 */
export function ChallengeManager({ goalId }: { goalId?: string }) {
  const { uid, goals, challenges, entries } = useUserData();
  const confirm = useConfirm();
  const todayKey = useMemo(() => getDateKey(new Date()), []);
  const [filterGoalId, setFilterGoalId] = useState("");
  const [editing, setEditing] = useState<{ id: string | null; draft: Draft } | null>(null);
  const [saving, setSaving] = useState(false);

  const goalsById = useMemo(() => new Map(goals.map((g) => [g.id, g])), [goals]);
  const activeGoals = useMemo(() => goals.filter((g) => !g.archived), [goals]);

  // scoped mode pins the goal; otherwise the picker above the list narrows it
  const shownGoalId = goalId ?? filterGoalId;
  const rows = useMemo(() => {
    return challenges
      .filter((c) => (shownGoalId ? c.goalId === shownGoalId : true))
      .map((challenge) => ({
        challenge,
        progress: computeChallengeProgress(challenge, entries, todayKey),
      }))
      .sort(compareChallenges);
  }, [challenges, entries, shownGoalId, todayKey]);

  const defaultGoalId = goalId ?? filterGoalId;

  async function persist(action: Promise<unknown>, message: string) {
    setSaving(true);
    try {
      await action;
      toast.success(message);
      setEditing(null);
    } catch {
      toast.error("Could not save the challenge");
    } finally {
      setSaving(false);
    }
  }

  function submit(event: FormEvent) {
    event.preventDefault();
    if (!editing) return;
    const { id, draft } = editing;
    const existing = id ? challenges.find((c) => c.id === id) : null;
    const challenge: Challenge = {
      id: existing?.id ?? createId(),
      kind: "amount",
      goalId: draft.goalId,
      name: draft.name.trim() || "Untitled challenge",
      description: draft.description.trim(),
      target: draft.target,
      // a start after the due date would leave an empty window
      startDate: draft.startDate <= draft.dueDate ? draft.startDate : draft.dueDate,
      dueDate: draft.dueDate,
      createdAt: existing?.createdAt ?? new Date().toISOString(),
    };
    void persist(
      challengesRepo.set(uid, challenge),
      existing ? "Challenge updated" : "Challenge created",
    );
  }

  async function remove(challenge: Challenge) {
    const ok = await confirm({
      title: "Delete challenge",
      message: `Delete "${challenge.name}"? Your entries are not affected.`,
      confirmLabel: "Delete",
      danger: true,
    });
    if (ok) await persist(challengesRepo.remove(uid, challenge.id), "Challenge deleted");
  }

  const draftGoal = editing ? goalsById.get(editing.draft.goalId) : undefined;

  // scoped mode already has its goal, so only the all-goals view needs one
  if (!goalId && activeGoals.length === 0) {
    return (
      <EmptyState>
        Challenges run on a goal&apos;s entries — create a goal first under{" "}
        <Link href="/settings/goals/new" className="text-accent-strong underline">Goals</Link>.
      </EmptyState>
    );
  }

  return (
    <div className="flex flex-col gap-4">
      <div className="flex flex-wrap items-center justify-between gap-3">
        {goalId ? (
          <CardTitle className="mb-0">Challenges</CardTitle>
        ) : (
          <label className="flex items-center gap-2 text-sm text-muted">
            Goal
            <Select
              className="w-auto"
              value={filterGoalId}
              onChange={(e) => setFilterGoalId(e.target.value)}
            >
              <option value="">All goals</option>
              {goals.map((g) => (
                <option key={g.id} value={g.id}>{g.name}</option>
              ))}
            </Select>
          </label>
        )}
        <Button
          size="sm"
          variant="primary"
          onClick={() =>
            setEditing({ id: null, draft: emptyDraft(defaultGoalId || activeGoals[0]?.id || "") })
          }
        >
          New challenge
        </Button>
      </div>

      {rows.length === 0 ? (
        <EmptyState>
          No challenges yet. Pick a goal, set an amount and a due date, and track the push here.
        </EmptyState>
      ) : (
        <div className="flex flex-col gap-3">
          {rows.map(({ challenge, progress }) => (
            <ChallengeCard
              key={challenge.id}
              challenge={challenge}
              goal={goalsById.get(challenge.goalId)}
              progress={progress}
              showGoalName={!goalId}
              onEdit={() => setEditing({ id: challenge.id, draft: { ...challenge } })}
              onDelete={() => void remove(challenge)}
            />
          ))}
        </div>
      )}

      <Modal
        open={editing !== null}
        onClose={() => setEditing(null)}
        title={editing?.id ? "Edit challenge" : "New challenge"}
      >
        {editing ? (
          <form onSubmit={submit} className="flex flex-col gap-4">
            {goalId ? null : (
              <Field label="Goal" hint="Entries logged for this goal fill the bar">
                <Select
                  value={editing.draft.goalId}
                  onChange={(e) => setEditing({ ...editing, draft: { ...editing.draft, goalId: e.target.value } })}
                  required
                >
                  {activeGoals.map((g) => (
                    <option key={g.id} value={g.id}>{g.name}</option>
                  ))}
                </Select>
              </Field>
            )}
            <Field label="Name">
              <Input
                value={editing.draft.name}
                onChange={(e) => setEditing({ ...editing, draft: { ...editing.draft, name: e.target.value } })}
                placeholder="e.g. 100 miles before winter"
                maxLength={80}
                autoFocus
                required
              />
            </Field>
            <Field label="Description" hint="Optional — why this one matters">
              <Textarea
                value={editing.draft.description}
                onChange={(e) => setEditing({ ...editing, draft: { ...editing.draft, description: e.target.value } })}
                rows={2}
                maxLength={500}
              />
            </Field>
            <div className="grid gap-4 sm:grid-cols-3">
              <Field label={`Target${draftGoal ? ` (${draftGoal.unit})` : ""}`}>
                <Input
                  type="number" min={0} step="any" inputMode="decimal"
                  value={editing.draft.target || ""}
                  onChange={(e) => {
                    const n = Number(e.target.value);
                    setEditing({
                      ...editing,
                      draft: { ...editing.draft, target: Number.isFinite(n) && n > 0 ? n : 0 },
                    });
                  }}
                  required
                />
              </Field>
              <Field label="Starts">
                <Input
                  type="date"
                  value={editing.draft.startDate}
                  onChange={(e) => setEditing({ ...editing, draft: { ...editing.draft, startDate: e.target.value } })}
                  required
                />
              </Field>
              <Field label="Due">
                <Input
                  type="date"
                  min={editing.draft.startDate}
                  value={editing.draft.dueDate}
                  onChange={(e) => setEditing({ ...editing, draft: { ...editing.draft, dueDate: e.target.value } })}
                  required
                />
              </Field>
            </div>
            <div className="flex justify-end gap-2">
              <Button onClick={() => setEditing(null)}>Cancel</Button>
              <Button type="submit" variant="primary" disabled={saving}>
                {saving ? "Saving…" : "Save challenge"}
              </Button>
            </div>
          </form>
        ) : null}
      </Modal>
    </div>
  );
}

function daysLabel(progress: ChallengeProgress): string {
  if (progress.status === "complete") return "Complete 🎉";
  if (progress.status === "expired") return "Past due";
  if (progress.status === "upcoming") return "Not started yet";
  if (progress.daysRemaining === 0) return "Due today";
  return `${progress.daysRemaining} day${progress.daysRemaining === 1 ? "" : "s"} left`;
}

function ChallengeCard({
  challenge,
  goal,
  progress,
  showGoalName,
  onEdit,
  onDelete,
}: {
  challenge: Challenge;
  goal: Goal | undefined;
  progress: ChallengeProgress;
  showGoalName: boolean;
  onEdit: () => void;
  onDelete: () => void;
}) {
  const unit = goal?.unit ?? "";
  const done = progress.status === "complete" || progress.status === "expired";

  return (
    <Card className={done ? "opacity-80" : undefined}>
      <div className="flex flex-col gap-2">
        <div className="flex flex-wrap items-baseline justify-between gap-x-3 gap-y-1">
          <span className="flex flex-wrap items-baseline gap-2">
            <span className="font-medium">{challenge.name}</span>
            {showGoalName ? (
              <Badge>{goal ? goal.name : "Deleted goal"}</Badge>
            ) : null}
          </span>
          <span className="text-sm text-muted">
            {formatAmount(progress.amount)} / {formatAmount(challenge.target)}
            {unit ? ` ${unit}` : ""} · {Math.round(progress.percent)}%
          </span>
        </div>

        {challenge.description ? (
          <p className="text-sm text-muted">{challenge.description}</p>
        ) : null}

        <ProgressBar percent={progress.percent} tone={progress.tone} />

        <div className="flex flex-wrap items-center justify-between gap-x-3 gap-y-1 text-xs text-muted">
          <span>
            {daysLabel(progress)}
            {progress.requiredPerDay > 0
              ? ` · ${formatAmount(progress.requiredPerDay)}${unit ? ` ${unit}` : ""}/day to finish`
              : progress.status === "expired"
                ? ` · ${formatAmount(progress.remaining)}${unit ? ` ${unit}` : ""} short`
                : ""}
          </span>
          <span className="flex gap-3">
            <span>{challenge.startDate} → {challenge.dueDate}</span>
            <button type="button" onClick={onEdit} className="underline hover:text-text">Edit</button>
            <button type="button" onClick={onDelete} className="underline hover:text-text">Delete</button>
          </span>
        </div>
      </div>
    </Card>
  );
}
