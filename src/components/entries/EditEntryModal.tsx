"use client";

import { useState, type FormEvent } from "react";
import type { Entry, Goal, RunningWorkout } from "@/types/models";
import { isYesNoGoal } from "@/lib/domain/format";
import {
  GOLF_TYPE_LABELS,
  RUNNING_WORKOUT_LABELS,
  buildGolfEntry,
  buildReadingEntry,
  editRunningEntry,
  estimatedRunningVo2,
  formatPace,
  paceMinutesPerMile,
  resolveReadingDate,
  runningEntryAmount,
} from "@/lib/domain/goalsplus";
import { entryTags, normalizeTags } from "@/lib/domain/tags";
import { TagInput } from "@/components/entries/TagInput";
import { Button } from "@/components/ui/Button";
import { Field } from "@/components/ui/Field";
import { Input, Select, Textarea } from "@/components/ui/Input";
import { Modal } from "@/components/ui/Modal";
import { toast } from "@/components/ui/Toaster";

const RUNNING_WORKOUTS = Object.keys(RUNNING_WORKOUT_LABELS) as RunningWorkout[];

export type EntryPatch = Pick<Entry, "date" | "amount" | "notApplicable" | "notes" | "goalsPlus" | "tags">;

export function EditEntryModal({
  entry,
  goal,
  suggestions = [],
  onClose,
  onSave,
}: {
  entry: Entry;
  goal: Goal | undefined;
  /** known tag names for the tag input's datalist */
  suggestions?: string[];
  onClose: () => void;
  onSave: (patch: EntryPatch) => Promise<void>;
}) {
  // The entry's own data wins over the goal's current config, so an entry
  // logged before the goal was reconfigured still edits as what it is.
  const mode = entry.goalsPlus?.mode ?? goal?.goalsPlus.mode ?? "standard";
  const isYesNo = mode === "standard" && goal ? isYesNoGoal(goal.goalType) : false;
  const run = entry.goalsPlus?.mode === "goalsplus-running" ? entry.goalsPlus : null;
  const golf = entry.goalsPlus?.mode === "goalsplus-golf" ? entry.goalsPlus : null;
  const book = entry.goalsPlus?.mode === "goalsplus-reading" ? entry.goalsPlus : null;

  const [date, setDate] = useState(entry.date);
  const [amount, setAmount] = useState(String(entry.amount));
  const [yesNo, setYesNo] = useState(entry.amount ? "1" : "0");
  const [notApplicable, setNotApplicable] = useState(entry.notApplicable);
  const [notes, setNotes] = useState(entry.notes);
  const [tags, setTags] = useState<string[]>(entryTags(entry));
  const [saving, setSaving] = useState(false);

  const [distance, setDistance] = useState(run ? String(run.distance) : "");
  const [duration, setDuration] = useState(run ? String(run.durationMinutes) : "");
  const [incline, setIncline] = useState(run?.avgInclinePct ? String(run.avgInclinePct) : "");
  const [workout, setWorkout] = useState<RunningWorkout>(run?.runningWorkout ?? "easy");
  const [score, setScore] = useState(golf ? String(golf.score) : "");
  const [bookTitle, setBookTitle] = useState(book?.bookTitle ?? "");
  const [bookAuthor, setBookAuthor] = useState(book?.author ?? "");
  const [bookPages, setBookPages] = useState(book?.pages ? String(book.pages) : "");
  const [bookRating, setBookRating] = useState(String(book?.rating ?? 0));
  const [bookYearOnly, setBookYearOnly] = useState(book?.dateResolution === "year");

  // "Not applicable" only exists for plain goals — a Goals+ entry always has a value.
  const naActive = mode === "standard" && notApplicable;
  const runPace = paceMinutesPerMile(Number(distance), Number(duration));
  const runVo2 = estimatedRunningVo2(Number(distance), Number(duration));

  /** Compute the saved {date, amount, goalsPlus} for this mode, or null if invalid. */
  function buildPatch(): Pick<EntryPatch, "date" | "amount" | "goalsPlus"> | null {
    if (mode === "goalsplus-running") {
      const d = Number(distance);
      const t = Number(duration);
      if (!(d > 0) || !(t > 0)) return null;
      const edited = editRunningEntry(run, {
        runningWorkout: workout,
        distance: d,
        durationMinutes: t,
        avgInclinePct: Number(incline) || 0,
      });
      // amount follows the goal's primary metric (miles, or 1/0 for run counts)
      const value =
        goal?.goalsPlus.mode === "goalsplus-running" ? runningEntryAmount(goal.goalsPlus, edited) : d;
      return { date, amount: value, goalsPlus: edited };
    }
    if (mode === "goalsplus-golf") {
      const s = Number(score);
      if (!(s > 0)) return null;
      const golfType = golf?.golfType ?? (goal?.goalsPlus.mode === "goalsplus-golf" ? goal.goalsPlus.golfType : "golf");
      return { date, amount: s, goalsPlus: buildGolfEntry({ golfType, score: s }) };
    }
    if (mode === "goalsplus-reading") {
      if (!bookTitle.trim()) return null;
      return {
        date: resolveReadingDate(date, bookYearOnly),
        amount: 1,
        goalsPlus: buildReadingEntry({
          bookTitle,
          author: bookAuthor,
          pages: Number(bookPages) || 0,
          rating: Number(bookRating) || 0,
          yearOnly: bookYearOnly,
        }),
      };
    }
    // standard, yes/no and weight goals all just carry an amount
    if (naActive) return { date, amount: 0, goalsPlus: null };
    const value = isYesNo ? Number(yesNo) : Number(amount);
    if (!isYesNo && !(value >= 0)) return null;
    return { date, amount: value, goalsPlus: entry.goalsPlus };
  }

  async function handleSubmit(event: FormEvent) {
    event.preventDefault();
    const built = buildPatch();
    if (!built) {
      toast.error("Enter a valid value");
      return;
    }
    setSaving(true);
    // always sent, so clearing the last tag actually clears it on the doc
    await onSave({ ...built, notApplicable: naActive, notes: notes.trim(), tags: normalizeTags(tags) });
    setSaving(false);
  }

  const amountLabel = `${mode === "goalsplus-weight" ? "Weight" : "Amount"}${goal?.unit ? ` (${goal.unit})` : ""}`;

  return (
    <Modal open onClose={onClose} title={`Edit — ${goal?.name ?? "entry"}`}>
      <form onSubmit={handleSubmit} className="flex flex-col gap-4">
        <Field label="Date">
          <Input type="date" value={date} onChange={(e) => setDate(e.target.value)} />
        </Field>

        {mode === "goalsplus-running" ? (
          <div className="grid gap-4 sm:grid-cols-2">
            <Field label="Distance (miles)">
              <Input type="number" min={0} step="any" inputMode="decimal" value={distance}
                onChange={(e) => setDistance(e.target.value)} required />
            </Field>
            <Field label="Duration (minutes)">
              <Input type="number" min={0} step="any" inputMode="decimal" value={duration}
                onChange={(e) => setDuration(e.target.value)} required />
            </Field>
            <Field label="Workout">
              <Select value={workout} onChange={(e) => setWorkout(e.target.value as RunningWorkout)}>
                {RUNNING_WORKOUTS.map((w) => (
                  <option key={w} value={w}>{RUNNING_WORKOUT_LABELS[w]}</option>
                ))}
              </Select>
            </Field>
            <Field label="Avg incline (%)" hint="Optional">
              <Input type="number" min={0} step="any" inputMode="decimal" value={incline}
                onChange={(e) => setIncline(e.target.value)} />
            </Field>
            <div className="flex flex-col justify-end text-sm text-muted sm:col-span-2">
              <span>Pace {formatPace(runPace)}</span>
              <span>Est. VO₂ {runVo2 > 0 ? runVo2 : "—"}</span>
            </div>
          </div>
        ) : mode === "goalsplus-golf" ? (
          <Field label={`Score (${GOLF_TYPE_LABELS[golf?.golfType ?? "golf"]})`}>
            <Input type="number" min={0} step={1} inputMode="numeric" value={score}
              onChange={(e) => setScore(e.target.value)} required />
          </Field>
        ) : mode === "goalsplus-reading" ? (
          <div className="grid gap-4 sm:grid-cols-2">
            <Field label="Book title">
              <Input value={bookTitle} onChange={(e) => setBookTitle(e.target.value)} maxLength={200} required />
            </Field>
            <Field label="Author" hint="Optional">
              <Input value={bookAuthor} onChange={(e) => setBookAuthor(e.target.value)} maxLength={120} />
            </Field>
            <Field label="Pages" hint="Optional">
              <Input type="number" min={0} step={1} inputMode="numeric" value={bookPages}
                onChange={(e) => setBookPages(e.target.value)} />
            </Field>
            <Field label="Rating" hint="Optional">
              <Select value={bookRating} onChange={(e) => setBookRating(e.target.value)}>
                <option value="0">—</option>
                {[1, 2, 3, 4, 5].map((r) => (
                  <option key={r} value={r}>{"★".repeat(r)}{"☆".repeat(5 - r)}</option>
                ))}
              </Select>
            </Field>
            <label className="flex items-center gap-2 text-sm text-muted sm:col-span-2">
              <input type="checkbox" checked={bookYearOnly} onChange={(e) => setBookYearOnly(e.target.checked)} />
              Counts for {date.slice(0, 4)} without a specific date
            </label>
          </div>
        ) : isYesNo ? (
          <Field label="Done?">
            <Select value={yesNo} onChange={(e) => setYesNo(e.target.value)} disabled={naActive}>
              <option value="1">Yes</option>
              <option value="0">No</option>
            </Select>
          </Field>
        ) : (
          <Field label={amountLabel}>
            <Input
              type="number" min={0} step="any" inputMode="decimal"
              value={amount}
              onChange={(e) => setAmount(e.target.value)}
              disabled={naActive}
              required={!naActive}
            />
          </Field>
        )}

        {mode === "standard" ? (
          <label className="flex items-center gap-2 text-sm text-muted">
            <input type="checkbox" checked={notApplicable} onChange={(e) => setNotApplicable(e.target.checked)} />
            Not applicable this day
          </label>
        ) : null}
        <Field label="Tags" hint="Optional">
          <TagInput value={tags} onChange={setTags} suggestions={suggestions} />
        </Field>
        <Field label="Notes">
          <Textarea value={notes} onChange={(e) => setNotes(e.target.value)} rows={2} />
        </Field>
        <div className="flex justify-end gap-2">
          <Button type="button" onClick={onClose}>Cancel</Button>
          <Button type="submit" variant="primary" disabled={saving}>
            {saving ? "Saving…" : "Save"}
          </Button>
        </div>
      </form>
    </Modal>
  );
}
