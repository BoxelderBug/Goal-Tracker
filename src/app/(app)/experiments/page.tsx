"use client";

import { useMemo, useState, type FormEvent } from "react";
import { orderBy } from "firebase/firestore";
import type { ExperimentEntry } from "@/types/models";
import { useSettings, useUserData } from "@/components/data/UserDataProvider";
import { experimentsRepo } from "@/lib/firebase/repos";
import { isCaptureEnabled } from "@/lib/domain/capture";
import { getDateKey, isDateKey, normalizeDate } from "@/lib/domain/dates";
import { useCollection } from "@/hooks/useCollection";
import { createId } from "@/lib/id";
import { Badge } from "@/components/ui/Badge";
import { Button } from "@/components/ui/Button";
import { Card } from "@/components/ui/Card";
import { Field } from "@/components/ui/Field";
import { Input, Textarea } from "@/components/ui/Input";
import { EmptyState } from "@/components/ui/EmptyState";
import { EntryModeTabs } from "@/components/entries/EntryModeTabs";
import { CaptureDisabledNotice } from "@/components/capture/CaptureDisabledNotice";
import { CaptureTargetsStrip } from "@/components/capture/CaptureTargetsStrip";
import { IdeaBody } from "@/components/capture/IdeaCapture";
import { useConfirm } from "@/components/ui/ConfirmDialog";
import { toast } from "@/components/ui/Toaster";

/** Running experiments first (newest leading), concluded ones after. */
function compareExperiments(a: ExperimentEntry, b: ExperimentEntry): number {
  if (a.status !== b.status) return a.status === "running" ? -1 : 1;
  return b.date.localeCompare(a.date);
}

export default function ExperimentsPage() {
  const { uid } = useUserData();
  const settings = useSettings();
  const confirm = useConfirm();
  const now = useMemo(() => new Date(), []);
  const todayKey = useMemo(() => getDateKey(normalizeDate(new Date())), []);

  const { data: all } = useCollection<ExperimentEntry>(
    () => experimentsRepo.query(uid, orderBy("createdAt", "desc")),
    [uid],
  );
  const items = useMemo(() => [...all].sort(compareExperiments), [all]);

  const [title, setTitle] = useState("");
  const [content, setContent] = useState("");
  const [date, setDate] = useState(todayKey);
  const [saving, setSaving] = useState(false);

  // id of the experiment whose result is being written, plus its draft text
  const [concluding, setConcluding] = useState<string | null>(null);
  const [resultDraft, setResultDraft] = useState("");

  async function add(event: FormEvent) {
    event.preventDefault();
    if (!title.trim() && !content.trim()) {
      toast.error("Name the experiment first");
      return;
    }
    setSaving(true);
    try {
      await experimentsRepo.set(uid, {
        id: createId(),
        date: isDateKey(date) ? date : todayKey,
        title: title.trim(),
        content: content.trim(),
        status: "running",
        result: "",
        createdAt: new Date().toISOString(),
      });
      setTitle("");
      setContent("");
      setDate(todayKey);
      toast.success("Experiment started");
    } catch {
      toast.error("Could not save");
    } finally {
      setSaving(false);
    }
  }

  function openConclude(item: ExperimentEntry) {
    setConcluding(item.id);
    setResultDraft(item.result);
  }

  async function saveConclusion(item: ExperimentEntry) {
    try {
      await experimentsRepo.set(uid, {
        ...item,
        status: "concluded",
        result: resultDraft.trim(),
      });
      setConcluding(null);
      toast.success("Wrapped up");
    } catch {
      toast.error("Could not save");
    }
  }

  async function reopen(item: ExperimentEntry) {
    try {
      await experimentsRepo.set(uid, { ...item, status: "running" });
    } catch {
      toast.error("Could not reopen");
    }
  }

  async function remove(item: ExperimentEntry) {
    const ok = await confirm({ message: "Delete this experiment?", confirmLabel: "Delete", danger: true });
    if (!ok) return;
    await experimentsRepo.remove(uid, item.id);
    toast.success("Deleted");
  }

  return (
    <div className="flex flex-col gap-4">
      <EntryModeTabs />
      <h1 className="font-display text-2xl">Experiments</h1>

      {isCaptureEnabled(settings, "experiment") ? null : <CaptureDisabledNotice label="Experiments" />}

      <CaptureTargetsStrip kind="experiment" items={items} now={now} />

      <Card>
        <form onSubmit={add} className="flex flex-col gap-3">
          <div className="flex flex-wrap items-end gap-3">
            <Field label="Experiment" className="min-w-56 flex-1">
              <Input
                value={title}
                onChange={(e) => setTitle(e.target.value)}
                placeholder="What are you trying?"
              />
            </Field>
            <Field label="Started" className="w-44">
              <Input type="date" value={date} onChange={(e) => setDate(e.target.value)} />
            </Field>
          </div>
          <Field
            label="What you're doing"
            hint={'Start a line with "- " for a bullet point.'}
          >
            <Textarea value={content} onChange={(e) => setContent(e.target.value)} rows={3} />
          </Field>
          <div className="flex justify-end">
            <Button type="submit" variant="primary" disabled={saving}>{saving ? "Saving…" : "Start"}</Button>
          </div>
        </form>
      </Card>

      {items.length === 0 ? (
        <EmptyState>No experiments yet — start one above.</EmptyState>
      ) : (
        <div className="flex flex-col gap-2">
          {items.map((item) => (
            <Card key={item.id} className="flex flex-col gap-2">
              <div className="flex items-start justify-between gap-3">
                <div className="flex min-w-0 flex-col gap-1">
                  <div className="flex flex-wrap items-center gap-2">
                    <Badge tone={item.status === "running" ? "onpace" : "hit"}>
                      {item.status === "running" ? "running" : "concluded"}
                    </Badge>
                    {item.title ? <span className="font-medium">{item.title}</span> : null}
                    <span className="text-xs text-muted">{item.date}</span>
                  </div>
                  <IdeaBody content={item.content} />
                </div>
                <div className="flex shrink-0 gap-1">
                  {item.status === "running" ? (
                    <Button size="sm" onClick={() => openConclude(item)}>Conclude</Button>
                  ) : (
                    <Button size="sm" variant="ghost" onClick={() => reopen(item)}>Reopen</Button>
                  )}
                  <Button size="sm" variant="ghost" onClick={() => remove(item)}>Delete</Button>
                </div>
              </div>

              {item.status === "concluded" && item.result && concluding !== item.id ? (
                <div className="rounded-lg bg-bg-soft px-3 py-2 text-sm">
                  <span className="text-xs uppercase tracking-wide text-muted">Result</span>
                  <IdeaBody content={item.result} />
                </div>
              ) : null}

              {concluding === item.id ? (
                <div className="flex flex-col gap-2 rounded-lg bg-bg-soft px-3 py-2">
                  <Field label="What happened?">
                    <Textarea
                      value={resultDraft}
                      onChange={(e) => setResultDraft(e.target.value)}
                      rows={3}
                      autoFocus
                    />
                  </Field>
                  <div className="flex justify-end gap-1">
                    <Button size="sm" variant="ghost" onClick={() => setConcluding(null)}>Cancel</Button>
                    <Button size="sm" variant="primary" onClick={() => saveConclusion(item)}>Save</Button>
                  </div>
                </div>
              ) : null}
            </Card>
          ))}
        </div>
      )}
    </div>
  );
}
