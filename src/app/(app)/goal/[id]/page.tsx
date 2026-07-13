"use client";

import { useMemo } from "react";
import Link from "next/link";
import { useParams } from "next/navigation";
import { useSettings, useUserData } from "@/components/data/UserDataProvider";
import { getPeriodRange } from "@/lib/domain/periods";
import { buildDailyTotals, computePace, neededPerDay, paceTone, sumRange } from "@/lib/domain/progress";
import { getTargetForPeriod } from "@/lib/domain/targets";
import { computeStreaks } from "@/lib/domain/streaks";
import { computeGoalRecords } from "@/lib/domain/records";
import { formatAmount, GOAL_TYPE_LABELS } from "@/lib/domain/format";
import { Card, CardTitle } from "@/components/ui/Card";
import { Badge } from "@/components/ui/Badge";
import { Button } from "@/components/ui/Button";
import { EmptyState } from "@/components/ui/EmptyState";
import { ProgressBar } from "@/components/ui/ProgressBar";

const PERIODS = [
  { kind: "week", label: "This week" },
  { kind: "month", label: "This month" },
  { kind: "year", label: "This year" },
] as const;

export default function GoalDetailPage() {
  const { id } = useParams<{ id: string }>();
  const { goals, entries } = useUserData();
  const settings = useSettings();
  const now = useMemo(() => new Date(), []);

  const goal = goals.find((g) => g.id === id);
  const totals = useMemo(() => buildDailyTotals(entries), [entries]);

  const periods = useMemo(() => {
    if (!goal) return [];
    return PERIODS.map(({ kind, label }) => {
      const range = getPeriodRange(kind, now, settings.weekStart);
      const progress = sumRange(totals, goal.id, range);
      const target = getTargetForPeriod(goal, kind, range, { weekStart: settings.weekStart });
      const pace = computePace(progress, target, range, now);
      return { kind, label, range, progress, target, pace, tone: paceTone(pace), need: neededPerDay(progress, target, range, now) };
    });
  }, [goal, totals, now, settings.weekStart]);

  const streak = useMemo(
    () => (goal ? computeStreaks(entries, now, goal.id) : null),
    [entries, now, goal],
  );
  const records = useMemo(
    () => (goal ? computeGoalRecords([goal], entries, settings.weekStart)[0] : null),
    [goal, entries, settings.weekStart],
  );
  const recent = useMemo(
    () =>
      goal
        ? entries
            .filter((e) => e.trackerId === goal.id)
            .sort((a, b) => b.date.localeCompare(a.date) || b.createdAt.localeCompare(a.createdAt))
            .slice(0, 10)
        : [],
    [entries, goal],
  );

  if (!goal) {
    return <EmptyState>Goal not found — it may have been deleted.</EmptyState>;
  }

  return (
    <div className="flex flex-col gap-4">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div className="flex flex-wrap items-center gap-2">
          <h1 className="font-display text-2xl">{goal.name}</h1>
          <Badge tone="neutral">{GOAL_TYPE_LABELS[goal.goalType]}</Badge>
          {goal.archived ? <Badge tone="missed">Archived</Badge> : null}
          {streak && streak.current >= 2 ? (
            <Badge tone="accent"><span aria-hidden>🔥</span>{streak.current}</Badge>
          ) : null}
        </div>
        <div className="flex gap-2">
          <Link href={`/entry?goal=${goal.id}`}><Button size="sm" variant="primary">Log entry</Button></Link>
          <Link href={`/settings/goals/${goal.id}`}><Button size="sm">Edit</Button></Link>
        </div>
      </div>

      <div className="grid gap-3 md:grid-cols-3">
        {periods.map((p) => (
          <Card key={p.kind} className="flex flex-col gap-2">
            <div className="flex items-center justify-between">
              <span className="text-xs uppercase tracking-wide text-muted">{p.label}</span>
              <Badge tone={p.tone}>{p.pace.completion}%</Badge>
            </div>
            <div className="font-display text-2xl">
              {formatAmount(p.progress)}
              {p.target > 0 ? <span className="text-base text-muted"> / {formatAmount(p.target)}</span> : null}
              <span className="text-sm text-muted"> {goal.unit}</span>
            </div>
            <ProgressBar percent={p.pace.completion} tone={p.tone} />
            <span className="text-xs text-muted">
              projected {formatAmount(p.pace.projected)}
              {p.need > 0 ? ` · need ${formatAmount(p.need)}/day` : ""}
            </span>
          </Card>
        ))}
      </div>

      <div className="grid gap-3 md:grid-cols-2">
        <Card>
          <CardTitle>Streak</CardTitle>
          <p className="text-sm text-muted">
            Current <span className="font-medium text-text">{streak?.current ?? 0} days</span>
            {" · "}longest <span className="font-medium text-text">{streak?.longest ?? 0} days</span>
            {streak && streak.current > 0 && !streak.countedToday ? " — log today to keep it going" : ""}
          </p>
        </Card>
        <Card>
          <CardTitle>Records <span aria-hidden>🏆</span></CardTitle>
          {records?.bestDay || records?.bestWeek ? (
            <p className="text-sm text-muted">
              {records.bestDay ? (
                <>Best day <span className="font-medium text-text">{formatAmount(records.bestDay.amount)} {goal.unit}</span> ({records.bestDay.date})</>
              ) : null}
              {records.bestDay && records.bestWeek ? " · " : ""}
              {records.bestWeek ? (
                <>best week <span className="font-medium text-text">{formatAmount(records.bestWeek.amount)} {goal.unit}</span> (wk of {records.bestWeek.weekStartKey})</>
              ) : null}
            </p>
          ) : (
            <p className="text-sm text-muted">No entries yet.</p>
          )}
        </Card>
      </div>

      <Card>
        <div className="mb-1 flex items-center justify-between">
          <CardTitle>Recent entries</CardTitle>
          <Link href="/entries" className="text-xs text-muted hover:text-text">All entries →</Link>
        </div>
        {recent.length === 0 ? (
          <p className="text-sm text-muted">Nothing logged in the current window.</p>
        ) : (
          <ul className="flex flex-col divide-y divide-border">
            {recent.map((e) => (
              <li key={e.id} className="flex items-center justify-between gap-3 py-2 text-sm">
                <span className="text-muted">{e.date}</span>
                <span className="font-medium">{e.notApplicable ? "N/A" : `${formatAmount(e.amount)} ${goal.unit}`}</span>
              </li>
            ))}
          </ul>
        )}
      </Card>
    </div>
  );
}
