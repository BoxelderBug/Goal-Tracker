"use client";

import { useState, type FormEvent } from "react";
import type { Goal, GoalType, GoalsPlusConfig, GoalsPlusMode, ProgressMetric, RunningWorkout } from "@/types/models";
import { Button } from "@/components/ui/Button";
import { Field } from "@/components/ui/Field";
import { Input, Select } from "@/components/ui/Input";
import { Card, CardTitle } from "@/components/ui/Card";
import { GOALS_PLUS_LABELS, GOAL_TYPE_OPTIONS, lockedUnitForGoalType } from "@/lib/domain/format";
import { createId } from "@/lib/id";

const RUNNING_WORKOUTS: RunningWorkout[] = [
  "easy", "tempo", "long", "norwegian4x4", "intervals",
  "hill-repeats", "fartlek", "recovery", "progression", "threshold", "custom",
];

const num = (v: string) => {
  const n = Number(v);
  return Number.isFinite(n) && n >= 0 ? n : 0;
};

export function GoalForm({
  initial,
  onSave,
  onCancel,
  saving,
}: {
  initial: Goal;
  onSave: (goal: Goal) => void;
  onCancel: () => void;
  saving?: boolean;
}) {
  const [goal, setGoal] = useState<Goal>(initial);
  const [tagsText, setTagsText] = useState(initial.tags.join(", "));

  const mode = goal.goalsPlus.mode;
  const lockedUnit = lockedUnitForGoalType(goal.goalType);
  const effectiveUnit = lockedUnit ?? goal.unit;
  const set = (patch: Partial<Goal>) => setGoal((g) => ({ ...g, ...patch }));

  function setMode(nextMode: GoalsPlusMode) {
    let goalsPlus: GoalsPlusConfig;
    if (nextMode === "goalsplus-running") {
      goalsPlus = { mode: nextMode, runningWorkout: "easy", workSpeed: 0, recoverySpeed: 0 };
    } else if (nextMode === "goalsplus-golf") {
      goalsPlus = { mode: nextMode, golfType: "golf" };
    } else if (nextMode === "goalsplus-weight") {
      goalsPlus = { mode: nextMode, startingWeight: 0, targetWeight: 0, weightUnit: "lbs" };
    } else {
      goalsPlus = { mode: "standard" };
    }
    const patch: Partial<Goal> = { goalsPlus };
    if (nextMode === "goalsplus-running" && (!goal.unit || goal.unit === "units")) patch.unit = "miles";
    if (nextMode === "goalsplus-golf" && (!goal.unit || goal.unit === "units")) patch.unit = "strokes";
    if (nextMode === "goalsplus-weight" && (!goal.unit || goal.unit === "units")) patch.unit = "lbs";
    set(patch);
  }

  function addMetric() {
    const metric: ProgressMetric = {
      id: createId(),
      name: "",
      unit: effectiveUnit || "units",
      weeklyTarget: 0,
      monthlyTarget: 0,
      yearlyTarget: 0,
    };
    set({ progressMetrics: [...goal.progressMetrics, metric] });
  }

  function updateMetric(id: string, patch: Partial<ProgressMetric>) {
    set({ progressMetrics: goal.progressMetrics.map((m) => (m.id === id ? { ...m, ...patch } : m)) });
  }

  function handleSubmit(event: FormEvent) {
    event.preventDefault();
    const tags = tagsText
      .split(/[,\n;|]/g)
      .map((t) => t.trim())
      .filter(Boolean)
      .slice(0, 12);
    onSave({
      ...goal,
      name: goal.name.trim() || "Untitled goal",
      unit: lockedUnit ?? (goal.unit.trim() || (mode === "standard" ? "units" : goal.unit)),
      tags,
      progressMetrics: goal.progressMetrics.filter((m) => m.name.trim()),
    });
  }

  return (
    <form onSubmit={handleSubmit} className="flex flex-col gap-5">
      <Card>
        <CardTitle>Basics</CardTitle>
        <div className="flex flex-col gap-4">
          <Field label="Goal name">
            <Input value={goal.name} onChange={(e) => set({ name: e.target.value })} maxLength={120} required />
          </Field>
          <div className="grid gap-4 sm:grid-cols-2">
            <Field label="Goal type">
              <Select value={goal.goalType} onChange={(e) => set({ goalType: e.target.value as GoalType })}>
                {GOAL_TYPE_OPTIONS.map((o) => (
                  <option key={o.value} value={o.value}>{o.label}</option>
                ))}
              </Select>
            </Field>
            <Field label="Unit" hint={lockedUnit ? `Fixed to "${lockedUnit}" for this goal type` : undefined}>
              <Input
                value={effectiveUnit}
                onChange={(e) => set({ unit: e.target.value })}
                disabled={Boolean(lockedUnit)}
                placeholder="e.g. miles, pages"
              />
            </Field>
          </div>
          <div className="grid gap-4 sm:grid-cols-2">
            <Field label="Priority" hint="Higher shows first">
              <Input type="number" min={0} value={goal.priority} onChange={(e) => set({ priority: num(e.target.value) })} />
            </Field>
            <Field label="Tags" hint="Comma-separated">
              <Input value={tagsText} onChange={(e) => setTagsText(e.target.value)} placeholder="health, work" />
            </Field>
          </div>
        </div>
      </Card>

      <Card>
        <CardTitle>Targets</CardTitle>
        <div className="grid gap-4 sm:grid-cols-3">
          <Field label="Weekly">
            <Input type="number" min={0} value={goal.weeklyGoal} onChange={(e) => set({ weeklyGoal: num(e.target.value) })} />
          </Field>
          <Field label="Monthly">
            <Input type="number" min={0} value={goal.monthlyGoal} onChange={(e) => set({ monthlyGoal: num(e.target.value) })} />
          </Field>
          <Field label="Yearly">
            <Input type="number" min={0} value={goal.yearlyGoal} onChange={(e) => set({ yearlyGoal: num(e.target.value) })} />
          </Field>
        </div>
      </Card>

      <Card>
        <CardTitle>Goals+</CardTitle>
        <Field label="Mode" hint="Adds sport/health-specific tracking">
          <Select value={mode} onChange={(e) => setMode(e.target.value as GoalsPlusMode)}>
            {(Object.keys(GOALS_PLUS_LABELS) as GoalsPlusMode[]).map((m) => (
              <option key={m} value={m}>{GOALS_PLUS_LABELS[m]}</option>
            ))}
          </Select>
        </Field>

        {goal.goalsPlus.mode === "goalsplus-running" ? (
          <div className="mt-4 grid gap-4 sm:grid-cols-2">
            <Field label="Default workout">
              <Select
                value={goal.goalsPlus.runningWorkout}
                onChange={(e) =>
                  set({ goalsPlus: { ...goal.goalsPlus, runningWorkout: e.target.value as RunningWorkout } as GoalsPlusConfig })
                }
              >
                {RUNNING_WORKOUTS.map((w) => (
                  <option key={w} value={w}>{w}</option>
                ))}
              </Select>
            </Field>
            {goal.goalsPlus.runningWorkout === "norwegian4x4" ? (
              <>
                <Field label="Work speed (mph)">
                  <Input
                    type="number" min={0} step="0.1"
                    value={goal.goalsPlus.workSpeed}
                    onChange={(e) => set({ goalsPlus: { ...goal.goalsPlus, workSpeed: num(e.target.value) } as GoalsPlusConfig })}
                  />
                </Field>
                <Field label="Recovery speed (mph)">
                  <Input
                    type="number" min={0} step="0.1"
                    value={goal.goalsPlus.recoverySpeed}
                    onChange={(e) => set({ goalsPlus: { ...goal.goalsPlus, recoverySpeed: num(e.target.value) } as GoalsPlusConfig })}
                  />
                </Field>
              </>
            ) : null}
          </div>
        ) : null}

        {goal.goalsPlus.mode === "goalsplus-golf" ? (
          <div className="mt-4">
            <Field label="Golf type">
              <Select
                value={goal.goalsPlus.golfType}
                onChange={(e) => set({ goalsPlus: { mode: "goalsplus-golf", golfType: e.target.value as "golf" | "disc-golf" } })}
              >
                <option value="golf">Golf</option>
                <option value="disc-golf">Disc golf</option>
              </Select>
            </Field>
          </div>
        ) : null}

        {goal.goalsPlus.mode === "goalsplus-weight" ? (
          <div className="mt-4 grid gap-4 sm:grid-cols-3">
            <Field label="Starting weight">
              <Input type="number" min={0} step="0.1" value={goal.goalsPlus.startingWeight}
                onChange={(e) => set({ goalsPlus: { ...goal.goalsPlus, startingWeight: num(e.target.value) } as GoalsPlusConfig })} />
            </Field>
            <Field label="Target weight">
              <Input type="number" min={0} step="0.1" value={goal.goalsPlus.targetWeight}
                onChange={(e) => set({ goalsPlus: { ...goal.goalsPlus, targetWeight: num(e.target.value) } as GoalsPlusConfig })} />
            </Field>
            <Field label="Unit">
              <Select value={goal.goalsPlus.weightUnit}
                onChange={(e) => set({ goalsPlus: { ...goal.goalsPlus, weightUnit: e.target.value as "lbs" | "kg" } as GoalsPlusConfig })}>
                <option value="lbs">lbs</option>
                <option value="kg">kg</option>
              </Select>
            </Field>
          </div>
        ) : null}
      </Card>

      <Card>
        <div className="mb-3 flex items-center justify-between">
          <CardTitle className="mb-0">Additional metrics</CardTitle>
          <Button size="sm" onClick={addMetric}>Add metric</Button>
        </div>
        {goal.progressMetrics.length === 0 ? (
          <p className="text-sm text-muted">Optional extra measurements tracked alongside this goal.</p>
        ) : (
          <div className="flex flex-col gap-3">
            {goal.progressMetrics.map((metric) => (
              <div key={metric.id} className="grid items-end gap-2 sm:grid-cols-[2fr_1fr_auto]">
                <Field label="Name">
                  <Input value={metric.name} onChange={(e) => updateMetric(metric.id, { name: e.target.value })} />
                </Field>
                <Field label="Unit">
                  <Input value={metric.unit} onChange={(e) => updateMetric(metric.id, { unit: e.target.value })} />
                </Field>
                <Button
                  variant="danger" size="sm"
                  onClick={() => set({ progressMetrics: goal.progressMetrics.filter((m) => m.id !== metric.id) })}
                >
                  Remove
                </Button>
              </div>
            ))}
          </div>
        )}
      </Card>

      <div className="flex justify-end gap-2">
        <Button onClick={onCancel}>Cancel</Button>
        <Button type="submit" variant="primary" disabled={saving}>
          {saving ? "Saving…" : "Save goal"}
        </Button>
      </div>
    </form>
  );
}
