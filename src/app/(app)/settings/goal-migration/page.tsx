"use client";

import { useMemo, useState } from "react";
import Link from "next/link";
import { where } from "firebase/firestore";
import { useUserData } from "@/components/data/UserDataProvider";
import { entriesRepo } from "@/lib/firebase/repos";
import { Button } from "@/components/ui/Button";
import { Card } from "@/components/ui/Card";
import { Field } from "@/components/ui/Field";
import { Select } from "@/components/ui/Input";
import { EmptyState } from "@/components/ui/EmptyState";
import { useConfirm } from "@/components/ui/ConfirmDialog";
import { toast } from "@/components/ui/Toaster";

export default function GoalMigrationPage() {
  const { uid, goals } = useUserData();
  const confirm = useConfirm();
  const [fromId, setFromId] = useState("");
  const [toId, setToId] = useState("");
  const [running, setRunning] = useState(false);

  const sorted = useMemo(() => [...goals].sort((a, b) => a.name.localeCompare(b.name)), [goals]);
  const nameOf = (id: string) => goals.find((g) => g.id === id)?.name ?? "—";

  async function migrate() {
    if (!fromId || !toId || fromId === toId) {
      toast.error("Pick two different goals");
      return;
    }
    const ok = await confirm({
      title: "Move entries",
      message: `Reassign every entry from "${nameOf(fromId)}" to "${nameOf(toId)}"? This updates the entries in place.`,
      confirmLabel: "Move entries",
    });
    if (!ok) return;
    setRunning(true);
    try {
      const entries = await entriesRepo.list(uid, where("trackerId", "==", fromId));
      if (entries.length === 0) {
        toast.success("No entries to move");
        return;
      }
      const moved = entries.map((e) => ({ ...e, trackerId: toId }));
      await entriesRepo.setMany(uid, moved);
      toast.success(`Moved ${moved.length} entries to ${nameOf(toId)}`);
      setFromId(""); setToId("");
    } catch {
      toast.error("Could not move entries");
    } finally {
      setRunning(false);
    }
  }

  if (goals.length < 2) {
    return (
      <EmptyState>
        You need at least two goals to migrate entries.{" "}
        <Link href="/settings/goals/new" className="text-accent-strong underline">Create a goal</Link>.
      </EmptyState>
    );
  }

  return (
    <div className="flex flex-col gap-4">
      <h1 className="font-display text-2xl">Move entries between goals</h1>
      <p className="text-sm text-muted">
        Reassign all of one goal&apos;s entries to another — handy when you split or merge goals. The source
        goal keeps its settings; only its entries move.
      </p>

      <Card className="flex flex-col gap-4">
        <div className="grid gap-4 sm:grid-cols-2">
          <Field label="From goal">
            <Select value={fromId} onChange={(e) => setFromId(e.target.value)}>
              <option value="">Select…</option>
              {sorted.map((g) => (
                <option key={g.id} value={g.id}>{g.name}</option>
              ))}
            </Select>
          </Field>
          <Field label="To goal">
            <Select value={toId} onChange={(e) => setToId(e.target.value)}>
              <option value="">Select…</option>
              {sorted.filter((g) => g.id !== fromId).map((g) => (
                <option key={g.id} value={g.id}>{g.name}</option>
              ))}
            </Select>
          </Field>
        </div>
        <div className="flex justify-end">
          <Button variant="primary" onClick={migrate} disabled={running || !fromId || !toId}>
            {running ? "Moving…" : "Move entries"}
          </Button>
        </div>
      </Card>
    </div>
  );
}
