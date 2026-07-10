"use client";

import { useMemo, useState } from "react";
import type { PeriodKind } from "@/types/models";
import { useSettings, useUserData } from "@/components/data/UserDataProvider";
import { addDays, addMonths, addYears, getDateKey, normalizeDate } from "@/lib/domain/dates";
import { getPeriodRange } from "@/lib/domain/periods";
import { buildDailyTotals, computePace, sumRange } from "@/lib/domain/progress";
import { getTargetForPeriod } from "@/lib/domain/targets";
import { formatAmount } from "@/lib/domain/format";
import { Button } from "@/components/ui/Button";
import { Card } from "@/components/ui/Card";
import { Select } from "@/components/ui/Input";
import { EmptyState } from "@/components/ui/EmptyState";
import { GoalPeriodCard } from "./GoalPeriodCard";

const TITLES: Record<PeriodKind, string> = {
  week: "Week",
  month: "Month",
  quarter: "Quarter",
  year: "Year",
};

function shiftAnchor(anchor: Date, period: PeriodKind, dir: number): Date {
  if (period === "week") return addDays(anchor, 7 * dir);
  if (period === "month") return addMonths(anchor, dir);
  if (period === "quarter") return addMonths(anchor, 3 * dir);
  return addYears(anchor, dir);
}

export function PeriodView({ period }: { period: PeriodKind }) {
  const { goals, entries } = useUserData();
  const settings = useSettings();
  const now = useMemo(() => new Date(), []);
  const [anchor, setAnchor] = useState(() => normalizeDate(new Date()));
  const [statusFilter, setStatusFilter] = useState<"active" | "all">("active");
  const [tagFilter, setTagFilter] = useState("all");

  const range = useMemo(
    () => getPeriodRange(period, anchor, settings.weekStart),
    [period, anchor, settings.weekStart],
  );
  const totals = useMemo(() => buildDailyTotals(entries), [entries]);

  const allTags = useMemo(() => {
    const set = new Set<string>();
    goals.forEach((g) => g.tags.forEach((t) => set.add(t)));
    return Array.from(set).sort();
  }, [goals]);

  const visibleGoals = useMemo(
    () =>
      goals.filter((g) => {
        if (statusFilter === "active" && g.archived) return false;
        if (tagFilter !== "all" && !g.tags.includes(tagFilter)) return false;
        return true;
      }),
    [goals, statusFilter, tagFilter],
  );

  const summary = useMemo(() => {
    let totalProgress = 0;
    let totalTarget = 0;
    let hitCount = 0;
    for (const goal of visibleGoals) {
      const progress = sumRange(totals, goal.id, range);
      const target = getTargetForPeriod(goal, period, range, { weekStart: settings.weekStart });
      totalProgress += progress;
      totalTarget += target;
      if (computePace(progress, target, range, now).goalHit) hitCount += 1;
    }
    const completion = totalTarget > 0 ? Math.round((totalProgress / totalTarget) * 100) : 0;
    return { totalProgress, totalTarget, hitCount, completion };
  }, [visibleGoals, totals, range, period, settings.weekStart, now]);

  const rangeLabel = `${getDateKey(range.start)} → ${getDateKey(range.end)}`;

  return (
    <div className="flex flex-col gap-4">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <h1 className="font-display text-2xl">{TITLES[period]}</h1>
        <div className="flex items-center gap-2">
          <Button size="sm" onClick={() => setAnchor((d) => shiftAnchor(d, period, -1))}>← Prev</Button>
          <Button size="sm" onClick={() => setAnchor(normalizeDate(new Date()))}>Today</Button>
          <Button size="sm" onClick={() => setAnchor((d) => shiftAnchor(d, period, 1))}>Next →</Button>
        </div>
      </div>
      <p className="text-sm text-muted">{rangeLabel}</p>

      <Card className="grid grid-cols-2 gap-4 sm:grid-cols-4">
        <Stat label="Completion" value={`${summary.completion}%`} />
        <Stat label="Progress" value={formatAmount(summary.totalProgress)} />
        <Stat label="Target" value={formatAmount(summary.totalTarget)} />
        <Stat label="Goals hit" value={`${summary.hitCount}/${visibleGoals.length}`} />
      </Card>

      <div className="flex flex-wrap gap-3">
        <label className="flex items-center gap-2 text-sm text-muted">
          Status
          <Select className="w-auto py-1" value={statusFilter} onChange={(e) => setStatusFilter(e.target.value as "active" | "all")}>
            <option value="active">Active</option>
            <option value="all">All</option>
          </Select>
        </label>
        {allTags.length > 0 ? (
          <label className="flex items-center gap-2 text-sm text-muted">
            Tag
            <Select className="w-auto py-1" value={tagFilter} onChange={(e) => setTagFilter(e.target.value)}>
              <option value="all">All</option>
              {allTags.map((t) => (
                <option key={t} value={t}>{t}</option>
              ))}
            </Select>
          </label>
        ) : null}
      </div>

      {visibleGoals.length === 0 ? (
        <EmptyState>No goals match these filters.</EmptyState>
      ) : (
        <div className="grid gap-3">
          {visibleGoals.map((goal) => (
            <GoalPeriodCard
              key={goal.id}
              goal={goal}
              totals={totals}
              period={period}
              range={range}
              weekStart={settings.weekStart}
              now={now}
            />
          ))}
        </div>
      )}
    </div>
  );
}

function Stat({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex flex-col">
      <span className="text-xs uppercase tracking-wide text-muted">{label}</span>
      <span className="font-display text-xl">{value}</span>
    </div>
  );
}
