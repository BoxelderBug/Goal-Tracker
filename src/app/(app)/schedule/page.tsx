"use client";

import { useMemo, useState, type FormEvent } from "react";
import { orderBy } from "firebase/firestore";
import type { ScheduleBlock } from "@/types/models";
import { useUserData } from "@/components/data/UserDataProvider";
import { schedulesRepo } from "@/lib/firebase/repos";
import { getDateKey, normalizeDate } from "@/lib/domain/dates";
import { googleCalendarUrl, scheduleToIcs } from "@/lib/domain/calendar";
import { downloadFile } from "@/lib/download";
import { useCollection } from "@/hooks/useCollection";
import { createId } from "@/lib/id";
import { Button } from "@/components/ui/Button";
import { Card, CardTitle } from "@/components/ui/Card";
import { Field } from "@/components/ui/Field";
import { Input, Select } from "@/components/ui/Input";
import { EmptyState } from "@/components/ui/EmptyState";
import { useConfirm } from "@/components/ui/ConfirmDialog";
import { toast } from "@/components/ui/Toaster";

const todayKey = () => getDateKey(normalizeDate(new Date()));

export default function SchedulePage() {
  const { uid, goals } = useUserData();
  const confirm = useConfirm();
  const { data: blocks } = useCollection<ScheduleBlock>(
    () => schedulesRepo.query(uid, orderBy("date", "asc"), orderBy("startTime", "asc")),
    [uid],
  );

  const [trackerId, setTrackerId] = useState("");
  const [date, setDate] = useState(todayKey());
  const [startTime, setStartTime] = useState("09:00");
  const [endTime, setEndTime] = useState("10:00");
  const [notes, setNotes] = useState("");
  const [saving, setSaving] = useState(false);

  const active = useMemo(() => goals.filter((g) => !g.archived), [goals]);
  const nameOf = (id: string) => goals.find((g) => g.id === id)?.name ?? "General";

  // Group upcoming blocks (today onward) by date.
  const grouped = useMemo(() => {
    const today = todayKey();
    const map = new Map<string, ScheduleBlock[]>();
    for (const b of blocks) {
      if (b.date < today) continue;
      if (!map.has(b.date)) map.set(b.date, []);
      map.get(b.date)!.push(b);
    }
    return Array.from(map.entries());
  }, [blocks]);

  async function add(event: FormEvent) {
    event.preventDefault();
    if (startTime >= endTime) {
      toast.error("End time must be after start");
      return;
    }
    setSaving(true);
    try {
      await schedulesRepo.set(uid, {
        id: createId(), trackerId, date, startTime, endTime, notes: notes.trim(),
        createdAt: new Date().toISOString(),
      });
      setNotes("");
      toast.success("Block added");
    } catch {
      toast.error("Could not add block");
    } finally {
      setSaving(false);
    }
  }

  async function remove(block: ScheduleBlock) {
    const ok = await confirm({ message: "Delete this time block?", confirmLabel: "Delete", danger: true });
    if (!ok) return;
    await schedulesRepo.remove(uid, block.id);
    toast.success("Deleted");
  }

  function exportIcs() {
    const upcoming = grouped.flatMap(([, dayBlocks]) => dayBlocks);
    if (upcoming.length === 0) {
      toast.info("No upcoming blocks to export");
      return;
    }
    downloadFile(`goal-tracker-schedule-${todayKey()}.ics`, scheduleToIcs(upcoming, nameOf), "text/calendar");
    toast.success(`Exported ${upcoming.length} blocks — import the file in Google Calendar`);
  }

  return (
    <div className="flex flex-col gap-4">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <h1 className="font-display text-2xl">Schedule</h1>
        <Button size="sm" onClick={exportIcs} title="Download an .ics you can import into Google Calendar">
          Export to calendar (.ics)
        </Button>
      </div>

      <Card>
        <form onSubmit={add} className="flex flex-col gap-3">
          <div className="grid gap-3 sm:grid-cols-2">
            <Field label="Goal">
              <Select value={trackerId} onChange={(e) => setTrackerId(e.target.value)}>
                <option value="">General</option>
                {active.map((g) => <option key={g.id} value={g.id}>{g.name}</option>)}
              </Select>
            </Field>
            <Field label="Date"><Input type="date" value={date} onChange={(e) => setDate(e.target.value)} /></Field>
            <Field label="Start"><Input type="time" value={startTime} onChange={(e) => setStartTime(e.target.value)} /></Field>
            <Field label="End"><Input type="time" value={endTime} onChange={(e) => setEndTime(e.target.value)} /></Field>
          </div>
          <Field label="Notes (optional)"><Input value={notes} onChange={(e) => setNotes(e.target.value)} /></Field>
          <div className="flex justify-end">
            <Button type="submit" variant="primary" disabled={saving}>{saving ? "Saving…" : "Add block"}</Button>
          </div>
        </form>
      </Card>

      {grouped.length === 0 ? (
        <EmptyState>No upcoming time blocks.</EmptyState>
      ) : (
        <div className="flex flex-col gap-3">
          {grouped.map(([day, dayBlocks]) => (
            <Card key={day} className="flex flex-col gap-2">
              <CardTitle>{day}</CardTitle>
              <ul className="flex flex-col divide-y divide-border">
                {dayBlocks.map((b) => (
                  <li key={b.id} className="flex items-center justify-between gap-3 py-2 text-sm">
                    <span>
                      <span className="font-medium">{b.startTime}–{b.endTime}</span>{" "}
                      <span className="text-muted">{nameOf(b.trackerId)}{b.notes ? ` · ${b.notes}` : ""}</span>
                    </span>
                    <span className="flex shrink-0 items-center gap-1">
                      <a
                        href={googleCalendarUrl(b, nameOf(b.trackerId))}
                        target="_blank"
                        rel="noopener noreferrer"
                        title="Add to Google Calendar"
                        className="rounded-lg px-2 py-1 text-xs font-medium text-accent-strong transition hover:bg-accent-soft"
                      >
                        GCal
                      </a>
                      <Button size="sm" variant="ghost" onClick={() => remove(b)}>Delete</Button>
                    </span>
                  </li>
                ))}
              </ul>
            </Card>
          ))}
        </div>
      )}
    </div>
  );
}
