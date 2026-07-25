"use client";

import { useMemo, useState, type FormEvent } from "react";
import { orderBy } from "firebase/firestore";
import type { IdeaEntry } from "@/types/models";
import { useSettings, useUserData } from "@/components/data/UserDataProvider";
import { ideasRepo } from "@/lib/firebase/repos";
import { captureKindMeta, isCaptureEnabled } from "@/lib/domain/capture";
import { getDateKey, normalizeDate } from "@/lib/domain/dates";
import { useCollection } from "@/hooks/useCollection";
import { createId } from "@/lib/id";
import { Button } from "@/components/ui/Button";
import { Card } from "@/components/ui/Card";
import { Field } from "@/components/ui/Field";
import { Input, Textarea } from "@/components/ui/Input";
import { EmptyState } from "@/components/ui/EmptyState";
import { EntryModeTabs } from "@/components/entries/EntryModeTabs";
import { useConfirm } from "@/components/ui/ConfirmDialog";
import { toast } from "@/components/ui/Toaster";
import { CaptureDisabledNotice } from "./CaptureDisabledNotice";
import { CaptureTargetsStrip } from "./CaptureTargetsStrip";

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

export function IdeaBody({ content }: { content: string }) {
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

const COPY = {
  question: {
    titleLabel: "Question",
    titlePlaceholder: "What do I want to figure out?",
    bodyLabel: "Answer / details",
    empty: "No questions yet.",
  },
  idea: {
    titleLabel: "Title",
    titlePlaceholder: "Name the idea",
    bodyLabel: "Details",
    empty: "No ideas yet.",
  },
} as const;

/**
 * Questions and ideas share the `ideas` collection (discriminated by `type`)
 * but get a page each, so either can be switched off on its own.
 */
export function IdeaCapture({ kind }: { kind: "question" | "idea" }) {
  const { uid } = useUserData();
  const settings = useSettings();
  const confirm = useConfirm();
  const meta = captureKindMeta(kind);
  const copy = COPY[kind];
  const now = useMemo(() => new Date(), []);

  const { data: all } = useCollection<IdeaEntry>(
    () => ideasRepo.query(uid, orderBy("createdAt", "desc")),
    [uid],
  );
  // Entries written before the Q/I split carry no explicit type: treat them as ideas.
  const items = useMemo(
    () => all.filter((i) => (i.type === "question") === (kind === "question")),
    [all, kind],
  );

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
        type: kind,
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

  async function remove(item: IdeaEntry) {
    const ok = await confirm({ message: "Delete this?", confirmLabel: "Delete", danger: true });
    if (!ok) return;
    await ideasRepo.remove(uid, item.id);
    toast.success("Deleted");
  }

  return (
    <div className="flex flex-col gap-4">
      <EntryModeTabs />
      <h1 className="font-display text-2xl">{meta.label}</h1>

      {isCaptureEnabled(settings, kind) ? null : <CaptureDisabledNotice label={meta.label} />}

      <CaptureTargetsStrip kind={kind} items={items} now={now} />

      <Card>
        <form onSubmit={add} className="flex flex-col gap-3">
          <Field label={copy.titleLabel}>
            <Input
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              placeholder={copy.titlePlaceholder}
            />
          </Field>
          <Field label={copy.bodyLabel} hint={'Start a line with "- " for a bullet point.'}>
            <Textarea value={content} onChange={(e) => setContent(e.target.value)} rows={3} />
          </Field>
          <div className="flex justify-end">
            <Button type="submit" variant="primary" disabled={saving}>{saving ? "Saving…" : "Add"}</Button>
          </div>
        </form>
      </Card>

      {items.length === 0 ? (
        <EmptyState>{copy.empty}</EmptyState>
      ) : (
        <div className="flex flex-col gap-2">
          {items.map((item) => (
            <Card key={item.id} className="flex items-start justify-between gap-3">
              <div className="flex min-w-0 flex-col gap-1">
                <div className="flex items-center gap-2">
                  {item.title ? <span className="font-medium">{item.title}</span> : null}
                  <span className="text-xs text-muted">{item.date}</span>
                </div>
                <IdeaBody content={item.content} />
              </div>
              <Button size="sm" variant="ghost" onClick={() => remove(item)}>Delete</Button>
            </Card>
          ))}
        </div>
      )}
    </div>
  );
}
