"use client";

import { useMemo, useState } from "react";
import Link from "next/link";
import type { Entry, Goal } from "@/types/models";
import { useUserData } from "@/components/data/UserDataProvider";
import { formatAmount } from "@/lib/domain/format";
import { GOLF_TYPE_LABELS, formatPace } from "@/lib/domain/goalsplus";
import { Card, CardTitle } from "@/components/ui/Card";
import { Button } from "@/components/ui/Button";
import { EmptyState } from "@/components/ui/EmptyState";
import { EChart, themeColor } from "@/components/charts/EChart";
import { dateLineOption, type DatePoint } from "@/lib/charts/options/dateLine";

type RunMetric = "pace" | "vo2" | "distance";

export default function GoalsPlusPage() {
  const { goals, entries } = useUserData();
  const gpGoals = useMemo(() => goals.filter((g) => g.goalsPlus.mode !== "standard"), [goals]);
  const [goalId, setGoalId] = useState("");
  const [runMetric, setRunMetric] = useState<RunMetric>("pace");

  const goal = gpGoals.find((g) => g.id === goalId) ?? gpGoals[0];

  const goalEntries = useMemo(
    () =>
      entries
        .filter((e) => e.trackerId === goal?.id)
        .sort((a, b) => a.date.localeCompare(b.date)),
    [entries, goal?.id],
  );

  if (gpGoals.length === 0) {
    return (
      <EmptyState>
        No Goals+ goals yet. Create one with a running, golf, or weight mode under{" "}
        <Link href="/settings/goals/new" className="text-accent-strong underline">Goals</Link>.
      </EmptyState>
    );
  }

  return (
    <div className="flex flex-col gap-4">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <h1 className="font-display text-2xl">Goals+ stats</h1>
        <label className="flex items-center gap-2 text-sm text-muted">
          Goal
          <select
            className="rounded-xl border border-border bg-surface px-3 py-1 text-text"
            value={goal?.id ?? ""}
            onChange={(e) => setGoalId(e.target.value)}
          >
            {gpGoals.map((g) => (
              <option key={g.id} value={g.id}>{g.name}</option>
            ))}
          </select>
        </label>
      </div>

      {goal ? (
        goal.goalsPlus.mode === "goalsplus-running" ? (
          <RunningStats goal={goal} entries={goalEntries} metric={runMetric} onMetric={setRunMetric} />
        ) : goal.goalsPlus.mode === "goalsplus-golf" ? (
          <GolfStats goal={goal} entries={goalEntries} />
        ) : (
          <WeightStats goal={goal} entries={goalEntries} />
        )
      ) : null}
    </div>
  );
}

function chartColors() {
  return {
    accent: themeColor("--accent", "#009f94"),
    text: themeColor("--text", "#222"),
    muted: themeColor("--muted", "#888"),
    grid: themeColor("--border", "#ddd"),
    surface: themeColor("--surface", "#fff"),
    border: themeColor("--border", "#ddd"),
  };
}

function Stat({ label, value }: { label: string; value: string }) {
  return (
    <Card>
      <span className="text-xs uppercase tracking-wide text-muted">{label}</span>
      <div className="font-display text-2xl">{value}</div>
    </Card>
  );
}

function RunningStats({
  goal, entries, metric, onMetric,
}: {
  goal: Goal;
  entries: Entry[];
  metric: RunMetric;
  onMetric: (m: RunMetric) => void;
}) {
  const runs = entries.filter((e) => e.goalsPlus?.mode === "goalsplus-running");
  const points: DatePoint[] = runs.map((e) => {
    const gp = e.goalsPlus as Extract<NonNullable<Entry["goalsPlus"]>, { mode: "goalsplus-running" }>;
    const value = metric === "pace" ? gp.paceMinutesPerMile : metric === "vo2" ? gp.estimatedVo2 : gp.distance;
    return { date: e.date, value: Math.round(value * 100) / 100 };
  });

  const bestPace = runs.reduce((b, e) => {
    const p = (e.goalsPlus as { paceMinutesPerMile: number }).paceMinutesPerMile;
    return p > 0 && (b === 0 || p < b) ? p : b;
  }, 0);
  const totalDistance = runs.reduce((s, e) => s + (e.goalsPlus as { distance: number }).distance, 0);
  const bestVo2 = runs.reduce((b, e) => Math.max(b, (e.goalsPlus as { estimatedVo2: number }).estimatedVo2), 0);
  const suffix = metric === "vo2" ? "" : metric === "distance" ? "" : "";

  return (
    <>
      <div className="grid grid-cols-2 gap-3 sm:grid-cols-3">
        <Stat label="Runs" value={String(runs.length)} />
        <Stat label="Best pace" value={formatPace(bestPace)} />
        <Stat label="Total distance" value={`${formatAmount(totalDistance)} mi`} />
        <Stat label="Best VO₂" value={bestVo2 > 0 ? String(bestVo2) : "—"} />
      </div>
      <div className="flex flex-wrap gap-1">
        {(["pace", "vo2", "distance"] as RunMetric[]).map((m) => (
          <Button key={m} size="sm" variant={metric === m ? "primary" : "default"} onClick={() => onMetric(m)}>
            {m === "pace" ? "Pace" : m === "vo2" ? "VO₂" : "Distance"}
          </Button>
        ))}
      </div>
      <Card>
        <CardTitle>{goal.name} · {metric === "pace" ? "Pace (min/mi)" : metric === "vo2" ? "Est. VO₂" : "Distance (mi)"}</CardTitle>
        {points.length === 0 ? <EmptyState>No runs logged yet.</EmptyState> : <EChart option={dateLineOption(points, { suffix }, chartColors())} height={260} />}
      </Card>
    </>
  );
}

function GolfStats({ goal, entries }: { goal: Goal; entries: Entry[] }) {
  const rounds = entries.filter((e) => e.goalsPlus?.mode === "goalsplus-golf");
  const points: DatePoint[] = rounds.map((e) => ({ date: e.date, value: (e.goalsPlus as { score: number }).score }));
  const scores = points.map((p) => p.value).filter((v) => v > 0);
  const best = scores.length ? Math.min(...scores) : 0;
  const avg = scores.length ? Math.round(scores.reduce((s, v) => s + v, 0) / scores.length) : 0;
  const golfType = goal.goalsPlus.mode === "goalsplus-golf" ? goal.goalsPlus.golfType : "golf";

  return (
    <>
      <div className="grid grid-cols-3 gap-3">
        <Stat label="Rounds" value={String(rounds.length)} />
        <Stat label="Best" value={best ? String(best) : "—"} />
        <Stat label="Average" value={avg ? String(avg) : "—"} />
      </div>
      <Card>
        <CardTitle>{goal.name} · {GOLF_TYPE_LABELS[golfType]} scores</CardTitle>
        {points.length === 0 ? <EmptyState>No rounds logged yet.</EmptyState> : <EChart option={dateLineOption(points, {}, chartColors())} height={260} />}
      </Card>
    </>
  );
}

function WeightStats({ goal, entries }: { goal: Goal; entries: Entry[] }) {
  const points: DatePoint[] = entries
    .filter((e) => !e.notApplicable)
    .map((e) => ({ date: e.date, value: e.amount }));
  const target = goal.goalsPlus.mode === "goalsplus-weight" ? goal.goalsPlus.targetWeight : null;
  const latest = points.length ? points[points.length - 1].value : 0;

  return (
    <>
      <div className="grid grid-cols-2 gap-3 sm:grid-cols-3">
        <Stat label="Entries" value={String(points.length)} />
        <Stat label="Latest" value={latest ? `${formatAmount(latest)} ${goal.unit}` : "—"} />
        <Stat label="Target" value={target ? `${formatAmount(target)} ${goal.unit}` : "—"} />
      </div>
      <Card>
        <CardTitle>{goal.name} · weight</CardTitle>
        {points.length === 0 ? <EmptyState>No weigh-ins logged yet.</EmptyState> : <EChart option={dateLineOption(points, { targetLine: target }, chartColors())} height={260} />}
      </Card>
    </>
  );
}
