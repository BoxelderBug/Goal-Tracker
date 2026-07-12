"use client";

import { useState, type FormEvent } from "react";
import type { Entry, Goal } from "@/types/models";
import { isYesNoGoal } from "@/lib/domain/format";
import { Button } from "@/components/ui/Button";
import { Field } from "@/components/ui/Field";
import { Input, Select, Textarea } from "@/components/ui/Input";
import { Modal } from "@/components/ui/Modal";
import { toast } from "@/components/ui/Toaster";

export function EditEntryModal({
  entry,
  goal,
  onClose,
  onSave,
}: {
  entry: Entry;
  goal: Goal | undefined;
  onClose: () => void;
  onSave: (patch: Pick<Entry, "date" | "amount" | "notApplicable" | "notes">) => Promise<void>;
}) {
  const isYesNo = goal ? isYesNoGoal(goal.goalType) : false;
  const [date, setDate] = useState(entry.date);
  const [amount, setAmount] = useState(String(entry.amount));
  const [yesNo, setYesNo] = useState(entry.amount ? "1" : "0");
  const [notApplicable, setNotApplicable] = useState(entry.notApplicable);
  const [notes, setNotes] = useState(entry.notes);
  const [saving, setSaving] = useState(false);

  async function handleSubmit(event: FormEvent) {
    event.preventDefault();
    const value = notApplicable ? 0 : isYesNo ? Number(yesNo) : Number(amount);
    if (!notApplicable && !isYesNo && !(value >= 0)) {
      toast.error("Enter a valid amount");
      return;
    }
    setSaving(true);
    await onSave({ date, amount: value, notApplicable, notes: notes.trim() });
    setSaving(false);
  }

  return (
    <Modal open onClose={onClose} title={`Edit — ${goal?.name ?? "entry"}`}>
      <form onSubmit={handleSubmit} className="flex flex-col gap-4">
        <Field label="Date">
          <Input type="date" value={date} onChange={(e) => setDate(e.target.value)} />
        </Field>
        {isYesNo ? (
          <Field label="Done?">
            <Select value={yesNo} onChange={(e) => setYesNo(e.target.value)} disabled={notApplicable}>
              <option value="1">Yes</option>
              <option value="0">No</option>
            </Select>
          </Field>
        ) : (
          <Field label={`Amount${goal?.unit ? ` (${goal.unit})` : ""}`}>
            <Input
              type="number" min={0} step="any" inputMode="decimal"
              value={amount}
              onChange={(e) => setAmount(e.target.value)}
              disabled={notApplicable}
              required={!notApplicable}
            />
          </Field>
        )}
        <label className="flex items-center gap-2 text-sm text-muted">
          <input type="checkbox" checked={notApplicable} onChange={(e) => setNotApplicable(e.target.checked)} />
          Not applicable this day
        </label>
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
