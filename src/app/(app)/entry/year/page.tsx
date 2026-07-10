"use client";

import { useMemo, useState } from "react";
import type { Goal } from "@/types/models";
import { useSettings, useUserData } from "@/components/data/UserDataProvider";
import { addDays, getDateKey, type DateRange } from "@/lib/domain/dates";
import { getMonthRange, getWeekRange } from "@/lib/domain/periods";
import { buildDailyTotals, sumRange } from "@/lib/domain/progress";
import { getTargetForPeriod } from "@/lib/domain/targets";
import { formatAmount } from "@/lib/domain/format";
import { entriesRepo } from "@/lib/firebase/repos";
import { newEntry } from "@/lib/domain/newEntry";
import { Button } from "@/components/ui/Button";
import { Card } from "@/components/ui/Card";
import { Input, Select } from "@/components/ui/Input";
import { EmptyState } from "@/components/ui/EmptyState";
import { toast } from "@/components/ui/Toaster";

type Granularity = "month" | "week";

const MONTH_NAMES = [
  "January", "February", "March", "April", "May", "June",
  "July", "August", "September", "October", "November", "December",
];

interface PeriodRow {
  label: string;
  range: DateRange;
}

export default function EntryYearPage() {
  const { uid, goals, entries } = useUserData();
  const settings = useSettings();
  const active = useMemo(() => goals.filter((g) => !g.archived), [goals]);
  const currentYear = useMemo(() => new Date().getFullYear(), []);

  const [goalId, setGoalId] = useState("");
  const [granularity, setGranularity] = useState<Granularity>("month");
  const [year, setYear] = useState(currentYear);

  const goal = active.find((g) => g.id === goalId) ?? active[0];
  const totals = useMemo(() => buildDailyTotals(entries), [entries]);

  const rows = useMemo<PeriodRow[]>(() => {
    if (granularity === "month") {
      return MONTH_NAMES.map((name, m) => ({
        label: `${name} ${year}`,
        range: getMonthRange(new Date(year, m, 1)),
      }));
    }
    const out: PeriodRow[] = [];
    let start = getWeekRange(new Date(year, 0, 1), settings.weekStart).start;
    for (let i = 0; i < 52; i += 1) {
      const range = getWeekRange(start, settings.weekStart);
      out.push({ label: `Week ${i + 1} · ${getDateKey(range.start)}`, range });
      start = addDays(range.start, 7);
    }
    return out;
  }, [granularity, year, settings.weekStart]);

  if (active.length === 0) {
    return <EmptyState>No active goals yet — create one under Settings → Goals.</EmptyState>;
  }

  return (
    <div className="flex flex-col gap-4">
      <h1 className="font-display text-2xl">Year update</h1>
      <p className="text-sm text-muted">
        Log one goal across a whole year. Each amount you add creates an entry dated at that period&apos;s
        start. Totals reflect currently-loaded entries.
      </p>

      <div className="flex flex-wrap items-end gap-3">
        <label className="flex flex-col gap-1 text-sm font-medium">
          Goal
          <Select className="w-auto py-1" value={goal?.id ?? ""} onChange={(e) => setGoalId(e.target.value)}>
            {active.map((g) => (
              <option key={g.id} value={g.id}>{g.name}</option>
            ))}
          </Select>
        </label>
        <label className="flex flex-col gap-1 text-sm font-medium">
          By
          <Select className="w-auto py-1" value={granularity} onChange={(e) => setGranularity(e.target.value as Granularity)}>
            <option value="month">Month</option>
            <option value="week">Week</option>
          </Select>
        </label>
        <div className="flex items-center gap-2">
          <Button size="sm" onClick={() => setYear((y) => y - 1)}>← {year - 1}</Button>
          <span className="font-display text-lg">{year}</span>
          <Button size="sm" onClick={() => setYear((y) => y + 1)}>{year + 1} →</Button>
        </div>
      </div>

      {goal ? (
        <Card className="p-0">
          <ul className="flex flex-col divide-y divide-border">
            {rows.map((row) => (
              <PeriodEntryRow
                key={row.label}
                uid={uid}
                goal={goal}
                granularity={granularity}
                row={row}
                total={sumRange(totals, goal.id, row.range)}
                target={getTargetForPeriod(goal, granularity, row.range, { weekStart: settings.weekStart })}
              />
            ))}
          </ul>
        </Card>
      ) : null}
    </div>
  );
}

function PeriodEntryRow({
  uid,
  goal,
  granularity,
  row,
  total,
  target,
}: {
  uid: string;
  goal: Goal;
  granularity: Granularity;
  row: PeriodRow;
  total: number;
  target: number;
}) {
  const [amount, setAmount] = useState("");
  const [saving, setSaving] = useState(false);

  async function add() {
    const value = Number(amount);
    if (!(value > 0)) {
      toast.error("Enter an amount above 0");
      return;
    }
    setSaving(true);
    try {
      await entriesRepo.set(
        uid,
        newEntry({
          trackerId: goal.id,
          date: getDateKey(row.range.start),
          amount: value,
          notes: `Year update (${granularity})`,
        }),
      );
      setAmount("");
      toast.success(`Added ${formatAmount(value)} to ${row.label}`);
    } catch {
      toast.error("Could not add entry");
    } finally {
      setSaving(false);
    }
  }

  const met = target > 0 && total >= target;

  return (
    <li className="flex items-center justify-between gap-3 px-4 py-2.5">
      <div className="min-w-0">
        <div className="text-sm font-medium">{row.label}</div>
        <div className="text-xs text-muted">
          <span className={met ? "text-tone-hit" : undefined}>{formatAmount(total)}</span>
          {target > 0 ? ` / ${formatAmount(target)}` : ""} {goal.unit}
        </div>
      </div>
      <div className="flex shrink-0 items-center gap-2">
        <Input
          type="number" min={0} step="any" inputMode="decimal"
          className="w-24 py-1"
          placeholder="add"
          value={amount}
          onChange={(e) => setAmount(e.target.value)}
          onKeyDown={(e) => { if (e.key === "Enter") add(); }}
          aria-label={`Add amount for ${row.label}`}
        />
        <Button size="sm" variant="primary" onClick={add} disabled={saving || amount === ""}>Add</Button>
      </div>
    </li>
  );
}
