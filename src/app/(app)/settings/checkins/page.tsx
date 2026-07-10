"use client";

import { useState, type FormEvent } from "react";
import { orderBy } from "firebase/firestore";
import type { CheckIn, CheckInCadence } from "@/types/models";
import { useUserData } from "@/components/data/UserDataProvider";
import { checkInsRepo } from "@/lib/firebase/repos";
import { moveToTrash } from "@/lib/firebase/actions/trash";
import { useCollection } from "@/hooks/useCollection";
import { createId } from "@/lib/id";
import { Button } from "@/components/ui/Button";
import { Card } from "@/components/ui/Card";
import { Badge } from "@/components/ui/Badge";
import { Field } from "@/components/ui/Field";
import { Input, Select } from "@/components/ui/Input";
import { EmptyState } from "@/components/ui/EmptyState";
import { useConfirm } from "@/components/ui/ConfirmDialog";
import { toast } from "@/components/ui/Toaster";

const CADENCE_LABELS: Record<CheckInCadence, string> = {
  weekly: "Weekly",
  monthly: "Monthly",
  yearly: "Yearly",
};

const CADENCES = Object.keys(CADENCE_LABELS) as CheckInCadence[];

export default function CheckInsSettingsPage() {
  const { uid } = useUserData();
  const confirm = useConfirm();
  const { data: checkIns, loading } = useCollection<CheckIn>(
    () => checkInsRepo.query(uid, orderBy("name", "asc")),
    [uid],
  );

  const [name, setName] = useState("");
  const [cadence, setCadence] = useState<CheckInCadence>("weekly");
  const [saving, setSaving] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);

  async function add(event: FormEvent) {
    event.preventDefault();
    if (!name.trim()) {
      toast.error("Enter a name");
      return;
    }
    setSaving(true);
    try {
      await checkInsRepo.set(uid, { id: createId(), name: name.trim(), cadence });
      setName(""); setCadence("weekly");
      toast.success("Check-in added");
    } catch {
      toast.error("Could not add check-in");
    } finally {
      setSaving(false);
    }
  }

  async function saveEdit(checkIn: CheckIn, patch: Partial<CheckIn>) {
    try {
      await checkInsRepo.set(uid, { ...checkIn, ...patch });
    } catch {
      toast.error("Could not save changes");
    }
  }

  async function remove(checkIn: CheckIn) {
    const ok = await confirm({
      title: "Delete check-in",
      message: `Delete "${checkIn.name}"? You can restore it from Trash.`,
      confirmLabel: "Delete",
      danger: true,
    });
    if (!ok) return;
    try {
      await moveToTrash(uid, "checkin", checkIn, `${checkIn.name} (${CADENCE_LABELS[checkIn.cadence]})`);
      toast.success("Moved to trash");
    } catch {
      toast.error("Could not delete check-in");
    }
  }

  return (
    <div className="flex flex-col gap-4">
      <h1 className="font-display text-2xl">Check-ins</h1>
      <p className="text-sm text-muted">
        Recurring prompts to reflect on — track whether you completed each one per period.
      </p>

      <Card>
        <form onSubmit={add} className="flex flex-wrap items-end gap-3">
          <Field label="Name" className="flex-1 min-w-[10rem]">
            <Input value={name} onChange={(e) => setName(e.target.value)} placeholder="e.g. Weekly review" />
          </Field>
          <Field label="Cadence" className="w-40">
            <Select value={cadence} onChange={(e) => setCadence(e.target.value as CheckInCadence)}>
              {CADENCES.map((c) => (
                <option key={c} value={c}>{CADENCE_LABELS[c]}</option>
              ))}
            </Select>
          </Field>
          <Button type="submit" variant="primary" disabled={saving}>Add</Button>
        </form>
      </Card>

      {loading ? (
        <EmptyState>Loading check-ins…</EmptyState>
      ) : checkIns.length === 0 ? (
        <EmptyState>No check-ins yet — add your first above.</EmptyState>
      ) : (
        <div className="flex flex-col gap-3">
          {checkIns.map((checkIn) =>
            editingId === checkIn.id ? (
              <EditRow
                key={checkIn.id}
                checkIn={checkIn}
                onCancel={() => setEditingId(null)}
                onSave={async (patch) => {
                  await saveEdit(checkIn, patch);
                  setEditingId(null);
                }}
              />
            ) : (
              <Card key={checkIn.id} className="flex flex-wrap items-center justify-between gap-3">
                <div className="flex items-center gap-2">
                  <span className="font-medium">{checkIn.name}</span>
                  <Badge tone="neutral">{CADENCE_LABELS[checkIn.cadence]}</Badge>
                </div>
                <div className="flex gap-2">
                  <Button size="sm" onClick={() => setEditingId(checkIn.id)}>Edit</Button>
                  <Button size="sm" variant="danger" onClick={() => remove(checkIn)}>Delete</Button>
                </div>
              </Card>
            ),
          )}
        </div>
      )}
    </div>
  );
}

function EditRow({
  checkIn,
  onCancel,
  onSave,
}: {
  checkIn: CheckIn;
  onCancel: () => void;
  onSave: (patch: Partial<CheckIn>) => Promise<void>;
}) {
  const [name, setName] = useState(checkIn.name);
  const [cadence, setCadence] = useState<CheckInCadence>(checkIn.cadence);
  const [saving, setSaving] = useState(false);

  async function submit(event: FormEvent) {
    event.preventDefault();
    if (!name.trim()) {
      toast.error("Enter a name");
      return;
    }
    setSaving(true);
    await onSave({ name: name.trim(), cadence });
    setSaving(false);
  }

  return (
    <Card>
      <form onSubmit={submit} className="flex flex-wrap items-end gap-3">
        <Field label="Name" className="flex-1 min-w-[10rem]">
          <Input value={name} onChange={(e) => setName(e.target.value)} />
        </Field>
        <Field label="Cadence" className="w-40">
          <Select value={cadence} onChange={(e) => setCadence(e.target.value as CheckInCadence)}>
            {CADENCES.map((c) => (
              <option key={c} value={c}>{CADENCE_LABELS[c]}</option>
            ))}
          </Select>
        </Field>
        <div className="flex gap-2">
          <Button type="button" onClick={onCancel}>Cancel</Button>
          <Button type="submit" variant="primary" disabled={saving}>Save</Button>
        </div>
      </form>
    </Card>
  );
}
