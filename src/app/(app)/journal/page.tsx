"use client";

import { useState, type FormEvent } from "react";
import { orderBy } from "firebase/firestore";
import type { JournalEntry } from "@/types/models";
import { useUserData } from "@/components/data/UserDataProvider";
import { journalRepo } from "@/lib/firebase/repos";
import { getDateKey, normalizeDate } from "@/lib/domain/dates";
import { useCollection } from "@/hooks/useCollection";
import { createId } from "@/lib/id";
import { Button } from "@/components/ui/Button";
import { Card, CardTitle } from "@/components/ui/Card";
import { Field } from "@/components/ui/Field";
import { Input, Select, Textarea } from "@/components/ui/Input";
import { Badge } from "@/components/ui/Badge";
import { EmptyState } from "@/components/ui/EmptyState";
import { EntryModeTabs } from "@/components/entries/EntryModeTabs";
import { useConfirm } from "@/components/ui/ConfirmDialog";
import { toast } from "@/components/ui/Toaster";

export default function JournalPage() {
  const { uid, goals } = useUserData();
  const confirm = useConfirm();
  const { data: entries } = useCollection<JournalEntry>(
    () => journalRepo.query(uid, orderBy("createdAt", "desc")),
    [uid],
  );

  const [title, setTitle] = useState("");
  const [content, setContent] = useState("");
  const [trackerId, setTrackerId] = useState("");
  const [saving, setSaving] = useState(false);

  async function add(event: FormEvent) {
    event.preventDefault();
    if (!content.trim()) {
      toast.error("Write something first");
      return;
    }
    setSaving(true);
    try {
      await journalRepo.set(uid, {
        id: createId(),
        date: getDateKey(normalizeDate(new Date())),
        trackerId,
        goalName: goals.find((g) => g.id === trackerId)?.name ?? "",
        title: title.trim(),
        content: content.trim(),
        createdAt: new Date().toISOString(),
      });
      setTitle(""); setContent(""); setTrackerId("");
      toast.success("Journal entry saved");
    } catch {
      toast.error("Could not save entry");
    } finally {
      setSaving(false);
    }
  }

  async function remove(entry: JournalEntry) {
    const ok = await confirm({ message: "Delete this journal entry?", confirmLabel: "Delete", danger: true });
    if (!ok) return;
    await journalRepo.remove(uid, entry.id);
    toast.success("Deleted");
  }

  return (
    <div className="flex flex-col gap-4">
      <EntryModeTabs />
      <h1 className="font-display text-2xl">Journal</h1>

      <Card>
        <form onSubmit={add} className="flex flex-col gap-3">
          <div className="grid gap-3 sm:grid-cols-2">
            <Field label="Title (optional)"><Input value={title} onChange={(e) => setTitle(e.target.value)} /></Field>
            <Field label="Related goal (optional)">
              <Select value={trackerId} onChange={(e) => setTrackerId(e.target.value)}>
                <option value="">None</option>
                {goals.map((g) => <option key={g.id} value={g.id}>{g.name}</option>)}
              </Select>
            </Field>
          </div>
          <Field label="Entry"><Textarea value={content} onChange={(e) => setContent(e.target.value)} rows={3} /></Field>
          <div className="flex justify-end">
            <Button type="submit" variant="primary" disabled={saving}>{saving ? "Saving…" : "Save entry"}</Button>
          </div>
        </form>
      </Card>

      {entries.length === 0 ? (
        <EmptyState>No journal entries yet.</EmptyState>
      ) : (
        <div className="flex flex-col gap-3">
          {entries.map((e) => (
            <Card key={e.id} className="flex flex-col gap-1">
              <div className="flex items-start justify-between gap-3">
                <div className="flex items-center gap-2">
                  {e.title ? <CardTitle>{e.title}</CardTitle> : <span className="text-sm text-muted">{e.date}</span>}
                  {e.goalName ? <Badge tone="accent">{e.goalName}</Badge> : null}
                </div>
                <Button size="sm" variant="ghost" onClick={() => remove(e)}>Delete</Button>
              </div>
              <p className="whitespace-pre-wrap text-sm">{e.content}</p>
              <span className="text-xs text-muted">{e.date}</span>
            </Card>
          ))}
        </div>
      )}
    </div>
  );
}
