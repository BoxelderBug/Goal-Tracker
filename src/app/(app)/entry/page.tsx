"use client";

import { useMemo, useState, type FormEvent } from "react";
import type { Entry, GoalsPlusEntryData, RunningWorkout } from "@/types/models";
import { useUserData } from "@/components/data/UserDataProvider";
import { entriesRepo } from "@/lib/firebase/repos";
import { moveEntryToTrash } from "@/lib/firebase/actions/trash";
import { newEntry } from "@/lib/domain/newEntry";
import { getDateKey, normalizeDate } from "@/lib/domain/dates";
import { isYesNoGoal, formatAmount } from "@/lib/domain/format";
import {
  GOLF_TYPE_LABELS,
  RUNNING_WORKOUT_LABELS,
  buildGolfEntry,
  buildRunningEntry,
  estimatedRunningVo2,
  formatPace,
  paceMinutesPerMile,
} from "@/lib/domain/goalsplus";
import { Button } from "@/components/ui/Button";
import { Card, CardTitle } from "@/components/ui/Card";
import { Field } from "@/components/ui/Field";
import { Input, Select, Textarea } from "@/components/ui/Input";
import { EmptyState } from "@/components/ui/EmptyState";
import { useConfirm } from "@/components/ui/ConfirmDialog";
import { toast } from "@/components/ui/Toaster";

const todayKey = () => getDateKey(normalizeDate(new Date()));

const RUNNING_WORKOUTS = Object.keys(RUNNING_WORKOUT_LABELS) as RunningWorkout[];

/** Discriminated result of the value fields for the current Goals+ mode. */
interface EntryValue {
  amount: number;
  goalsPlus: GoalsPlusEntryData | null;
}

export default function EntryPage() {
  const { uid, goals, entries } = useUserData();
  const confirm = useConfirm();
  const active = useMemo(() => goals.filter((g) => !g.archived), [goals]);

  const [trackerId, setTrackerId] = useState("");
  const [date, setDate] = useState(todayKey());
  const [amount, setAmount] = useState("");
  const [yesNo, setYesNo] = useState("1");
  const [notApplicable, setNotApplicable] = useState(false);
  const [notes, setNotes] = useState("");
  const [saving, setSaving] = useState(false);
  // Goals+ per-entry fields
  const [distance, setDistance] = useState("");
  const [duration, setDuration] = useState("");
  const [workout, setWorkout] = useState<RunningWorkout | "">("");
  const [score, setScore] = useState("");
  const [weight, setWeight] = useState("");

  const selected = active.find((g) => g.id === trackerId) ?? active[0];
  const selectedId = selected?.id ?? "";
  const isYesNo = selected ? isYesNoGoal(selected.goalType) : false;
  const mode = selected?.goalsPlus.mode ?? "standard";
  const isGoalsPlus = mode !== "standard";

  const effectiveWorkout: RunningWorkout =
    workout || (selected?.goalsPlus.mode === "goalsplus-running" ? selected.goalsPlus.runningWorkout : "easy");
  const golfType = selected?.goalsPlus.mode === "goalsplus-golf" ? selected.goalsPlus.golfType : "golf";

  // Live running readout
  const runPace = paceMinutesPerMile(Number(distance), Number(duration));
  const runVo2 = estimatedRunningVo2(Number(distance), Number(duration));

  /** Compute {amount, goalsPlus} for the active mode, or null if invalid. */
  function buildValue(): EntryValue | null {
    if (mode === "goalsplus-running") {
      const d = Number(distance);
      const t = Number(duration);
      if (!(d > 0) || !(t > 0)) return null;
      return { amount: d, goalsPlus: buildRunningEntry({ runningWorkout: effectiveWorkout, distance: d, durationMinutes: t }) };
    }
    if (mode === "goalsplus-golf") {
      const s = Number(score);
      if (!(s > 0)) return null;
      return { amount: s, goalsPlus: buildGolfEntry({ golfType, score: s }) };
    }
    if (mode === "goalsplus-weight") {
      const w = Number(weight);
      if (!(w > 0)) return null;
      return { amount: w, goalsPlus: null };
    }
    // standard
    if (notApplicable) return { amount: 0, goalsPlus: null };
    const value = isYesNo ? Number(yesNo) : Number(amount);
    if (!isYesNo && !(value >= 0)) return null;
    return { amount: value, goalsPlus: null };
  }

  const todaysEntries = useMemo(() => {
    const key = todayKey();
    return entries
      .filter((e) => e.date === key)
      .sort((a, b) => b.createdAt.localeCompare(a.createdAt));
  }, [entries]);

  const goalName = (id: string) => goals.find((g) => g.id === id)?.name ?? "Unknown goal";

  async function handleSubmit(event: FormEvent) {
    event.preventDefault();
    if (!selected) return;
    const built = buildValue();
    if (!built) {
      toast.error("Enter a valid value");
      return;
    }
    setSaving(true);
    try {
      await entriesRepo.set(
        uid,
        newEntry({
          trackerId: selected.id,
          date,
          amount: built.amount,
          notApplicable: mode === "standard" ? notApplicable : false,
          goalsPlus: built.goalsPlus,
          notes: notes.trim(),
        }),
      );
      toast.success(`Logged ${selected.name}`);
      setAmount(""); setNotes(""); setNotApplicable(false);
      setDistance(""); setDuration(""); setScore(""); setWeight("");
    } catch {
      toast.error("Could not save entry");
    } finally {
      setSaving(false);
    }
  }

  async function deleteEntry(entry: Entry) {
    const ok = await confirm({ message: "Move this entry to trash?", confirmLabel: "Delete", danger: true });
    if (!ok) return;
    try {
      await moveEntryToTrash(uid, entry, goalName(entry.trackerId));
      toast.success("Moved to trash");
    } catch {
      toast.error("Could not delete entry");
    }
  }

  if (active.length === 0) {
    return <EmptyState>No active goals yet — create one under Settings → Goals.</EmptyState>;
  }

  return (
    <div className="flex flex-col gap-4">
      <h1 className="font-display text-2xl">Add entry</h1>
      <Card>
        <form onSubmit={handleSubmit} className="flex flex-col gap-4">
          <Field label="Goal">
            <Select value={selectedId} onChange={(e) => setTrackerId(e.target.value)}>
              {active.map((g) => (
                <option key={g.id} value={g.id}>{g.name}</option>
              ))}
            </Select>
          </Field>
          <div className="grid gap-4 sm:grid-cols-2">
            <Field label="Date">
              <Input type="date" value={date} onChange={(e) => setDate(e.target.value)} />
            </Field>

            {mode === "goalsplus-running" ? (
              <>
                <Field label="Distance (miles)">
                  <Input type="number" min={0} step="any" inputMode="decimal" value={distance}
                    onChange={(e) => setDistance(e.target.value)} required />
                </Field>
                <Field label="Duration (minutes)">
                  <Input type="number" min={0} step="any" inputMode="decimal" value={duration}
                    onChange={(e) => setDuration(e.target.value)} required />
                </Field>
                <Field label="Workout">
                  <Select value={effectiveWorkout} onChange={(e) => setWorkout(e.target.value as RunningWorkout)}>
                    {RUNNING_WORKOUTS.map((w) => (
                      <option key={w} value={w}>{RUNNING_WORKOUT_LABELS[w]}</option>
                    ))}
                  </Select>
                </Field>
                <div className="flex flex-col justify-end text-sm text-muted">
                  <span>Pace {formatPace(runPace)}</span>
                  <span>Est. VO₂ {runVo2 > 0 ? runVo2 : "—"}</span>
                </div>
              </>
            ) : mode === "goalsplus-golf" ? (
              <Field label={`Score (${GOLF_TYPE_LABELS[golfType]})`}>
                <Input type="number" min={0} step={1} inputMode="numeric" value={score}
                  onChange={(e) => setScore(e.target.value)} required />
              </Field>
            ) : mode === "goalsplus-weight" ? (
              <Field label={`Weight${selected?.unit ? ` (${selected.unit})` : ""}`}>
                <Input type="number" min={0} step="any" inputMode="decimal" value={weight}
                  onChange={(e) => setWeight(e.target.value)} required />
              </Field>
            ) : isYesNo ? (
              <Field label="Done?">
                <Select value={yesNo} onChange={(e) => setYesNo(e.target.value)} disabled={notApplicable}>
                  <option value="1">Yes</option>
                  <option value="0">No</option>
                </Select>
              </Field>
            ) : (
              <Field label={`Amount${selected?.unit ? ` (${selected.unit})` : ""}`}>
                <Input
                  type="number" min={0} step="any" inputMode="decimal"
                  value={amount}
                  onChange={(e) => setAmount(e.target.value)}
                  disabled={notApplicable}
                  required={!notApplicable}
                />
              </Field>
            )}
          </div>
          {!isGoalsPlus ? (
            <label className="flex items-center gap-2 text-sm text-muted">
              <input type="checkbox" checked={notApplicable} onChange={(e) => setNotApplicable(e.target.checked)} />
              Not applicable this day
            </label>
          ) : null}
          <Field label="Notes">
            <Textarea value={notes} onChange={(e) => setNotes(e.target.value)} rows={2} />
          </Field>
          <div className="flex justify-end">
            <Button type="submit" variant="primary" disabled={saving}>
              {saving ? "Saving…" : "Log entry"}
            </Button>
          </div>
        </form>
      </Card>

      <Card>
        <CardTitle>Today&apos;s entries</CardTitle>
        {todaysEntries.length === 0 ? (
          <p className="text-sm text-muted">Nothing logged today yet.</p>
        ) : (
          <ul className="flex flex-col divide-y divide-border">
            {todaysEntries.map((e) => (
              <li key={e.id} className="flex items-center justify-between gap-3 py-2">
                <span className="text-sm">
                  <span className="font-medium">{goalName(e.trackerId)}</span>{" "}
                  <span className="text-muted">
                    {e.notApplicable ? "N/A" : formatAmount(e.amount)}
                    {e.notes ? ` — ${e.notes}` : ""}
                  </span>
                </span>
                <Button size="sm" variant="ghost" onClick={() => deleteEntry(e)}>Delete</Button>
              </li>
            ))}
          </ul>
        )}
      </Card>
    </div>
  );
}
