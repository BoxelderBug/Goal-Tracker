"use client";

import { useState, type FormEvent } from "react";
import { orderBy } from "firebase/firestore";
import type { IdeaEntry, IdeaType } from "@/types/models";
import { useUserData } from "@/components/data/UserDataProvider";
import { ideasRepo } from "@/lib/firebase/repos";
import { getDateKey, normalizeDate } from "@/lib/domain/dates";
import { useCollection } from "@/hooks/useCollection";
import { createId } from "@/lib/id";
import { Button } from "@/components/ui/Button";
import { Card } from "@/components/ui/Card";
import { Field } from "@/components/ui/Field";
import { Select, Textarea } from "@/components/ui/Input";
import { Badge } from "@/components/ui/Badge";
import { EmptyState } from "@/components/ui/EmptyState";
import { EntryModeTabs } from "@/components/entries/EntryModeTabs";
import { useConfirm } from "@/components/ui/ConfirmDialog";
import { toast } from "@/components/ui/Toaster";

export default function IdeasPage() {
  const { uid } = useUserData();
  const confirm = useConfirm();
  const { data: ideas } = useCollection<IdeaEntry>(() => ideasRepo.query(uid, orderBy("createdAt", "desc")), [uid]);

  const [type, setType] = useState<IdeaType>("idea");
  const [content, setContent] = useState("");
  const [saving, setSaving] = useState(false);

  async function add(event: FormEvent) {
    event.preventDefault();
    if (!content.trim()) {
      toast.error("Write something first");
      return;
    }
    setSaving(true);
    try {
      await ideasRepo.set(uid, {
        id: createId(),
        date: getDateKey(normalizeDate(new Date())),
        type,
        content: content.trim(),
        createdAt: new Date().toISOString(),
      });
      setContent("");
      toast.success("Saved");
    } catch {
      toast.error("Could not save");
    } finally {
      setSaving(false);
    }
  }

  async function remove(idea: IdeaEntry) {
    const ok = await confirm({ message: "Delete this?", confirmLabel: "Delete", danger: true });
    if (!ok) return;
    await ideasRepo.remove(uid, idea.id);
    toast.success("Deleted");
  }

  return (
    <div className="flex flex-col gap-4">
      <EntryModeTabs />
      <h1 className="font-display text-2xl">Ideas &amp; questions</h1>

      <Card>
        <form onSubmit={add} className="flex flex-col gap-3">
          <div className="flex flex-wrap items-end gap-3">
            <Field label="Type" className="w-40">
              <Select value={type} onChange={(e) => setType(e.target.value as IdeaType)}>
                <option value="idea">Idea</option>
                <option value="question">Question</option>
              </Select>
            </Field>
          </div>
          <Field label="Content"><Textarea value={content} onChange={(e) => setContent(e.target.value)} rows={2} /></Field>
          <div className="flex justify-end">
            <Button type="submit" variant="primary" disabled={saving}>{saving ? "Saving…" : "Add"}</Button>
          </div>
        </form>
      </Card>

      {ideas.length === 0 ? (
        <EmptyState>No ideas or questions yet.</EmptyState>
      ) : (
        <div className="flex flex-col gap-2">
          {ideas.map((i) => (
            <Card key={i.id} className="flex items-start justify-between gap-3">
              <div className="flex items-start gap-2">
                <Badge tone={i.type === "question" ? "onpace" : "accent"}>{i.type}</Badge>
                <p className="whitespace-pre-wrap text-sm">{i.content}</p>
              </div>
              <Button size="sm" variant="ghost" onClick={() => remove(i)}>Delete</Button>
            </Card>
          ))}
        </div>
      )}
    </div>
  );
}
