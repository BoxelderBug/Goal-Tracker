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
import { Input, Select, Textarea } from "@/components/ui/Input";
import { Badge } from "@/components/ui/Badge";
import { EmptyState } from "@/components/ui/EmptyState";
import { EntryModeTabs } from "@/components/entries/EntryModeTabs";
import { useConfirm } from "@/components/ui/ConfirmDialog";
import { toast } from "@/components/ui/Toaster";

/** Split details into paragraph / bullet-list blocks ("- " or "* " lines). */
function contentBlocks(content: string): { kind: "p" | "ul"; lines: string[] }[] {
  const blocks: { kind: "p" | "ul"; lines: string[] }[] = [];
  for (const raw of content.split("\n")) {
    const bullet = /^\s*[-*•]\s+(.*)$/.exec(raw);
    const kind = bullet ? "ul" : "p";
    const text = bullet ? bullet[1] : raw;
    const last = blocks[blocks.length - 1];
    if (last && last.kind === kind) last.lines.push(text);
    else blocks.push({ kind, lines: [text] });
  }
  return blocks;
}

function IdeaBody({ content }: { content: string }) {
  if (!content) return null;
  return (
    <div className="flex flex-col gap-1 text-sm">
      {contentBlocks(content).map((block, i) =>
        block.kind === "ul" ? (
          <ul key={i} className="list-disc pl-5">
            {block.lines.map((line, j) => (
              <li key={j}>{line}</li>
            ))}
          </ul>
        ) : (
          <p key={i} className="whitespace-pre-wrap">{block.lines.join("\n")}</p>
        ),
      )}
    </div>
  );
}

export default function IdeasPage() {
  const { uid } = useUserData();
  const confirm = useConfirm();
  const { data: ideas } = useCollection<IdeaEntry>(() => ideasRepo.query(uid, orderBy("createdAt", "desc")), [uid]);

  const [type, setType] = useState<IdeaType>("idea");
  const [title, setTitle] = useState("");
  const [content, setContent] = useState("");
  const [saving, setSaving] = useState(false);

  async function add(event: FormEvent) {
    event.preventDefault();
    if (!title.trim() && !content.trim()) {
      toast.error("Write something first");
      return;
    }
    setSaving(true);
    try {
      await ideasRepo.set(uid, {
        id: createId(),
        date: getDateKey(normalizeDate(new Date())),
        type,
        title: title.trim(),
        content: content.trim(),
        createdAt: new Date().toISOString(),
      });
      setTitle("");
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
      <h1 className="font-display text-2xl">Questions &amp; ideas</h1>

      <Card>
        <form onSubmit={add} className="flex flex-col gap-3">
          <div className="flex flex-wrap items-end gap-3">
            <Field label="Type" className="w-40">
              <Select value={type} onChange={(e) => setType(e.target.value as IdeaType)}>
                <option value="idea">Idea</option>
                <option value="question">Question</option>
              </Select>
            </Field>
            <Field label={type === "question" ? "Question" : "Title"} className="min-w-56 flex-1">
              <Input
                value={title}
                onChange={(e) => setTitle(e.target.value)}
                placeholder={type === "question" ? "What do I want to figure out?" : "Name the idea"}
              />
            </Field>
          </div>
          <Field
            label={type === "question" ? "Answer / details" : "Details"}
            hint={'Start a line with "- " for a bullet point.'}
          >
            <Textarea value={content} onChange={(e) => setContent(e.target.value)} rows={3} />
          </Field>
          <div className="flex justify-end">
            <Button type="submit" variant="primary" disabled={saving}>{saving ? "Saving…" : "Add"}</Button>
          </div>
        </form>
      </Card>

      {ideas.length === 0 ? (
        <EmptyState>No questions or ideas yet.</EmptyState>
      ) : (
        <div className="flex flex-col gap-2">
          {ideas.map((i) => (
            <Card key={i.id} className="flex items-start justify-between gap-3">
              <div className="flex min-w-0 flex-col gap-1">
                <div className="flex items-center gap-2">
                  <Badge tone={i.type === "question" ? "onpace" : "accent"}>{i.type}</Badge>
                  {i.title ? <span className="font-medium">{i.title}</span> : null}
                  <span className="text-xs text-muted">{i.date}</span>
                </div>
                <IdeaBody content={i.content} />
              </div>
              <Button size="sm" variant="ghost" onClick={() => remove(i)}>Delete</Button>
            </Card>
          ))}
        </div>
      )}
    </div>
  );
}
