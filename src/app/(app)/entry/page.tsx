"use client";

import { useMemo, useState, type FormEvent } from "react";
import { useUserData } from "@/components/data/UserDataProvider";
import { entriesRepo } from "@/lib/firebase/repos";
import { newEntry } from "@/lib/domain/newEntry";
import { getDateKey, normalizeDate } from "@/lib/domain/dates";
import { isYesNoGoal, formatAmount } from "@/lib/domain/format";
import { Button } from "@/components/ui/Button";
import { Card, CardTitle } from "@/components/ui/Card";
import { Field } from "@/components/ui/Field";
import { Input, Select, Textarea } from "@/components/ui/Input";
import { EmptyState } from "@/components/ui/EmptyState";
import { useConfirm } from "@/components/ui/ConfirmDialog";
import { toast } from "@/components/ui/Toaster";

const todayKey = () => getDateKey(normalizeDate(new Date()));

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

  const selected = active.find((g) => g.id === trackerId) ?? active[0];
  const selectedId = selected?.id ?? "";
  const isYesNo = selected ? isYesNoGoal(selected.goalType) : false;

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
    const value = notApplicable ? 0 : isYesNo ? Number(yesNo) : Number(amount);
    if (!notApplicable && !isYesNo && !(value >= 0)) {
      toast.error("Enter a valid amount");
      return;
    }
    setSaving(true);
    try {
      await entriesRepo.set(
        uid,
        newEntry({ trackerId: selected.id, date, amount: value, notApplicable, notes: notes.trim() }),
      );
      toast.success(`Logged ${selected.name}`);
      setAmount("");
      setNotes("");
      setNotApplicable(false);
    } catch {
      toast.error("Could not save entry");
    } finally {
      setSaving(false);
    }
  }

  async function deleteEntry(id: string) {
    const ok = await confirm({ message: "Delete this entry?", confirmLabel: "Delete", danger: true });
    if (!ok) return;
    await entriesRepo.remove(uid, id);
    toast.success("Entry deleted");
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
            {isYesNo ? (
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
          <label className="flex items-center gap-2 text-sm text-muted">
            <input type="checkbox" checked={notApplicable} onChange={(e) => setNotApplicable(e.target.checked)} />
            Not applicable this day
          </label>
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
                <Button size="sm" variant="ghost" onClick={() => deleteEntry(e.id)}>Delete</Button>
              </li>
            ))}
          </ul>
        )}
      </Card>
    </div>
  );
}
