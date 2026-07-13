"use client";

import { useMemo, useState } from "react";
import { useUserData, useSettings } from "@/components/data/UserDataProvider";
import { entriesRepo } from "@/lib/firebase/repos";
import { newEntry } from "@/lib/domain/newEntry";
import { addDays, getDateKey, normalizeDate } from "@/lib/domain/dates";
import { getWeekRange } from "@/lib/domain/periods";
import { buildDailyTotals } from "@/lib/domain/progress";
import { formatAmount, isYesNoGoal } from "@/lib/domain/format";
import { Button } from "@/components/ui/Button";
import { Card } from "@/components/ui/Card";
import { EmptyState } from "@/components/ui/EmptyState";
import { EntryModeTabs } from "@/components/entries/EntryModeTabs";
import { toast } from "@/components/ui/Toaster";

const DOW = ["Mon", "Tue", "Wed", "Thu", "Fri", "Sat", "Sun"];

export default function WeekUpdatePage() {
  const { uid, goals, entries } = useUserData();
  const settings = useSettings();
  const active = useMemo(() => goals.filter((g) => !g.archived), [goals]);

  const [anchor, setAnchor] = useState(() => normalizeDate(new Date()));
  const range = useMemo(() => getWeekRange(anchor, settings.weekStart), [anchor, settings.weekStart]);
  const days = useMemo(
    () => Array.from({ length: 7 }, (_, i) => getDateKey(addDays(range.start, i))),
    [range],
  );
  const dowLabels = settings.weekStart === "sunday" ? ["Sun", ...DOW.slice(0, 6)] : DOW;

  const totals = useMemo(() => buildDailyTotals(entries), [entries]);
  // edits keyed by `goalId|date`
  const [edits, setEdits] = useState<Record<string, string>>({});
  const [saving, setSaving] = useState(false);

  const cellValue = (goalId: string, date: string): string => {
    const key = `${goalId}|${date}`;
    if (key in edits) return edits[key];
    const total = totals.get(key);
    return total ? formatAmount(total) : "";
  };

  async function save() {
    const keys = Object.keys(edits);
    if (keys.length === 0) {
      toast.info("No changes to save");
      return;
    }
    setSaving(true);
    try {
      for (const key of keys) {
        const [goalId, date] = key.split("|");
        const raw = edits[key].trim();
        // Replace the day's entries for this goal with a single value.
        const existing = entries.filter((e) => e.trackerId === goalId && e.date === date);
        for (const e of existing) await entriesRepo.remove(uid, e.id);
        if (raw !== "") {
          const amount = Number(raw);
          if (Number.isFinite(amount) && amount >= 0) {
            await entriesRepo.set(uid, newEntry({ trackerId: goalId, date, amount, notes: "Week Update" }));
          }
        }
      }
      setEdits({});
      toast.success("Week saved");
    } catch {
      toast.error("Could not save the week");
    } finally {
      setSaving(false);
    }
  }

  if (active.length === 0) {
    return <EmptyState>No active goals yet — create one under Settings → Goals.</EmptyState>;
  }

  const rangeLabel = `${getDateKey(range.start)} → ${getDateKey(range.end)}`;

  return (
    <div className="flex flex-col gap-4">
      <EntryModeTabs />
      <div className="flex flex-wrap items-center justify-between gap-3">
        <h1 className="font-display text-2xl">Week update</h1>
        <div className="flex items-center gap-2">
          <Button size="sm" onClick={() => setAnchor((d) => addDays(d, -7))}>← Prev</Button>
          <Button size="sm" onClick={() => setAnchor(normalizeDate(new Date()))}>This week</Button>
          <Button size="sm" onClick={() => setAnchor((d) => addDays(d, 7))}>Next →</Button>
        </div>
      </div>
      <p className="text-sm text-muted">{rangeLabel}</p>

      <Card className="overflow-x-auto p-0">
        <table className="w-full border-collapse text-sm">
          <thead>
            <tr className="border-b border-border">
              <th className="sticky left-0 bg-surface p-3 text-left font-medium">Goal</th>
              {days.map((d, i) => (
                <th key={d} className="p-2 text-center font-medium">
                  <div>{dowLabels[i]}</div>
                  <div className="text-xs font-normal text-muted">{d.slice(5)}</div>
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {active.map((goal) => {
              const yesNo = isYesNoGoal(goal.goalType);
              return (
                <tr key={goal.id} className="border-b border-border last:border-0">
                  <td className="sticky left-0 bg-surface p-3 font-medium">{goal.name}</td>
                  {days.map((date) => (
                    <td key={date} className="p-1.5">
                      {yesNo ? (
                        <select
                          className="w-16 rounded-lg border border-border bg-surface px-1 py-1 text-center"
                          value={cellValue(goal.id, date) === "" ? "" : cellValue(goal.id, date) === "0" ? "0" : "1"}
                          onChange={(e) =>
                            setEdits((prev) => ({ ...prev, [`${goal.id}|${date}`]: e.target.value }))
                          }
                        >
                          <option value="">–</option>
                          <option value="1">Y</option>
                          <option value="0">N</option>
                        </select>
                      ) : (
                        <input
                          type="number" min={0} step="any" inputMode="decimal"
                          className="w-16 rounded-lg border border-border bg-surface px-1.5 py-1 text-center"
                          value={cellValue(goal.id, date)}
                          onChange={(e) =>
                            setEdits((prev) => ({ ...prev, [`${goal.id}|${date}`]: e.target.value }))
                          }
                        />
                      )}
                    </td>
                  ))}
                </tr>
              );
            })}
          </tbody>
        </table>
      </Card>

      <div className="flex justify-end">
        <Button variant="primary" onClick={save} disabled={saving || Object.keys(edits).length === 0}>
          {saving ? "Saving…" : `Save week${Object.keys(edits).length ? ` (${Object.keys(edits).length})` : ""}`}
        </Button>
      </div>
    </div>
  );
}
