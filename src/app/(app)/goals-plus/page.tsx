"use client";

import { useMemo, useState } from "react";
import Link from "next/link";
import type { Entry, Goal, GoalsPlusReadingEntry, GoalsPlusRunningEntry, RunningWorkout } from "@/types/models";
import { useUserData } from "@/components/data/UserDataProvider";
import { formatAmount } from "@/lib/domain/format";
import {
  GOLF_TYPE_LABELS,
  RUNNING_WORKOUT_LABELS,
  computeRaceAttempts,
  computeRunTypeBreakdown,
  formatMinutes,
  formatPace,
} from "@/lib/domain/goalsplus";
import { Card, CardTitle } from "@/components/ui/Card";
import { Button } from "@/components/ui/Button";
import { EmptyState } from "@/components/ui/EmptyState";
import { EChart, themeColor } from "@/components/charts/EChart";
import { dateLineOption, type DatePoint } from "@/lib/charts/options/dateLine";

type RunMetric = "pace" | "vo2" | "distance" | "incline";

export default function GoalsPlusPage() {
  const { goals, entries } = useUserData();
  const gpGoals = useMemo(() => goals.filter((g) => g.goalsPlus.mode !== "standard"), [goals]);
  const [goalId, setGoalId] = useState("");

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
        No Goals+ goals yet. Create one with a running, golf, weight, or reading mode under{" "}
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
          <RunningStats key={goal.id} goal={goal} entries={goalEntries} />
        ) : goal.goalsPlus.mode === "goalsplus-golf" ? (
          <GolfStats goal={goal} entries={goalEntries} />
        ) : goal.goalsPlus.mode === "goalsplus-reading" ? (
          <ReadingStats goal={goal} entries={goalEntries} />
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

const RUN_METRIC_LABELS: Record<RunMetric, { button: string; title: string; suffix: string }> = {
  pace: { button: "Pace", title: "Pace (min/mi)", suffix: "" },
  vo2: { button: "VO₂", title: "Est. VO₂", suffix: "" },
  distance: { button: "Distance", title: "Distance (mi)", suffix: "" },
  incline: { button: "Incline", title: "Avg incline (%)", suffix: "%" },
};

function RunningStats({ goal, entries }: { goal: Goal; entries: Entry[] }) {
  const [metric, setMetric] = useState<RunMetric>("pace");
  const [typeFilter, setTypeFilter] = useState<RunningWorkout | "all">("all");

  const allRuns = useMemo(
    () =>
      entries
        .filter((e) => e.goalsPlus?.mode === "goalsplus-running")
        .map((e) => ({ date: e.date, run: e.goalsPlus as GoalsPlusRunningEntry })),
    [entries],
  );
  const typesPresent = useMemo(
    () => [...new Set(allRuns.map((r) => r.run.runningWorkout))],
    [allRuns],
  );
  const runs = typeFilter === "all" ? allRuns : allRuns.filter((r) => r.run.runningWorkout === typeFilter);

  const totalDistance = runs.reduce((s, r) => s + r.run.distance, 0);
  const totalDuration = runs.reduce((s, r) => s + r.run.durationMinutes, 0);
  const avgPace = totalDistance > 0 && totalDuration > 0 ? totalDuration / totalDistance : 0;
  const bestPace = runs.reduce(
    (b, r) => (r.run.paceMinutesPerMile > 0 && (b === 0 || r.run.paceMinutesPerMile < b) ? r.run.paceMinutesPerMile : b),
    0,
  );
  const bestVo2 = runs.reduce((b, r) => Math.max(b, r.run.estimatedVo2), 0);
  const inclines = runs.map((r) => r.run.avgInclinePct ?? 0).filter((v) => v > 0);
  const avgIncline = inclines.length ? inclines.reduce((s, v) => s + v, 0) / inclines.length : 0;
  const hasIncline = allRuns.some((r) => (r.run.avgInclinePct ?? 0) > 0);

  const metrics = (["pace", "vo2", "distance", ...(hasIncline ? (["incline"] as RunMetric[]) : [])] as RunMetric[]);
  const points: DatePoint[] = runs.map(({ date, run }) => {
    const value =
      metric === "pace" ? run.paceMinutesPerMile
      : metric === "vo2" ? run.estimatedVo2
      : metric === "incline" ? (run.avgInclinePct ?? 0)
      : run.distance;
    return { date, value: Math.round(value * 100) / 100 };
  });

  const breakdown = useMemo(() => computeRunTypeBreakdown(allRuns.map((r) => r.run)), [allRuns]);

  // Race goal (config-level): best equivalent time over runs ≥ the race distance.
  const config = goal.goalsPlus.mode === "goalsplus-running" ? goal.goalsPlus : null;
  const raceDistance = config?.raceDistance ?? 0;
  const raceTarget = config?.raceTargetMinutes ?? 0;
  const attempts = useMemo(
    () => (raceDistance > 0 ? computeRaceAttempts(allRuns, raceDistance) : []),
    [allRuns, raceDistance],
  );
  const bestAttempt = attempts.reduce((b, a) => (b === 0 || a.minutes < b ? a.minutes : b), 0);

  return (
    <>
      <div className="flex flex-wrap gap-1">
        <Button size="sm" variant={typeFilter === "all" ? "primary" : "default"} onClick={() => setTypeFilter("all")}>
          All types
        </Button>
        {typesPresent.map((w) => (
          <Button key={w} size="sm" variant={typeFilter === w ? "primary" : "default"} onClick={() => setTypeFilter(w)}>
            {RUNNING_WORKOUT_LABELS[w]}
          </Button>
        ))}
      </div>
      <div className="grid grid-cols-2 gap-3 sm:grid-cols-3">
        <Stat label="Runs" value={String(runs.length)} />
        <Stat label="Total distance" value={`${formatAmount(Math.round(totalDistance * 100) / 100)} mi`} />
        <Stat label="Avg pace" value={formatPace(avgPace)} />
        <Stat label="Best pace" value={formatPace(bestPace)} />
        <Stat label="Best VO₂" value={bestVo2 > 0 ? String(bestVo2) : "—"} />
        <Stat label="Avg incline" value={avgIncline > 0 ? `${Math.round(avgIncline * 10) / 10}%` : "—"} />
      </div>

      {raceDistance > 0 && raceTarget > 0 ? (
        <Card>
          <CardTitle>
            Race goal · {formatAmount(raceDistance)} mi in {formatMinutes(raceTarget)}
          </CardTitle>
          <div className="mb-3 grid grid-cols-3 gap-3">
            <div>
              <span className="text-xs uppercase tracking-wide text-muted">Best attempt</span>
              <div className="font-display text-2xl">{formatMinutes(bestAttempt)}</div>
            </div>
            <div>
              <span className="text-xs uppercase tracking-wide text-muted">Gap to target</span>
              <div className={`font-display text-2xl ${bestAttempt > 0 && bestAttempt <= raceTarget ? "text-success" : ""}`}>
                {bestAttempt > 0
                  ? bestAttempt <= raceTarget
                    ? `−${formatMinutes(raceTarget - bestAttempt)} 🎉`
                    : `+${formatMinutes(bestAttempt - raceTarget)}`
                  : "—"}
              </div>
            </div>
            <div>
              <span className="text-xs uppercase tracking-wide text-muted">Attempts</span>
              <div className="font-display text-2xl">{attempts.length}</div>
            </div>
          </div>
          {attempts.length === 0 ? (
            <p className="text-sm text-muted">
              Runs of at least {formatAmount(raceDistance)} mi count as attempts, timed at that run&apos;s pace.
            </p>
          ) : (
            <>
              <EChart
                option={dateLineOption(
                  attempts.map((a) => ({ date: a.date, value: a.minutes })),
                  { suffix: " min", targetLine: raceTarget },
                  chartColors(),
                )}
                height={200}
              />
              <p className="mt-1 text-center text-xs text-muted">
                Equivalent {formatAmount(raceDistance)}-mile time of each qualifying run · dashed line = target.
              </p>
            </>
          )}
        </Card>
      ) : null}

      <div className="flex flex-wrap gap-1">
        {metrics.map((m) => (
          <Button key={m} size="sm" variant={metric === m ? "primary" : "default"} onClick={() => setMetric(m)}>
            {RUN_METRIC_LABELS[m].button}
          </Button>
        ))}
      </div>
      <Card>
        <CardTitle>
          {goal.name} · {RUN_METRIC_LABELS[metric].title}
          {typeFilter !== "all" ? ` · ${RUNNING_WORKOUT_LABELS[typeFilter]}` : ""}
        </CardTitle>
        {points.length === 0 ? (
          <EmptyState>No runs logged yet.</EmptyState>
        ) : (
          <EChart option={dateLineOption(points, { suffix: RUN_METRIC_LABELS[metric].suffix }, chartColors())} height={260} />
        )}
      </Card>

      {breakdown.length > 0 ? (
        <Card>
          <CardTitle>By run type</CardTitle>
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="text-left text-xs uppercase tracking-wide text-muted">
                  <th className="py-1.5 pr-3 font-medium">Type</th>
                  <th className="py-1.5 pr-3 font-medium">Runs</th>
                  <th className="py-1.5 pr-3 font-medium">Miles</th>
                  <th className="py-1.5 pr-3 font-medium">Avg pace</th>
                  <th className="py-1.5 pr-3 font-medium">Best pace</th>
                  <th className="py-1.5 font-medium">Avg incline</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-border">
                {breakdown.map((row) => (
                  <tr key={row.workout}>
                    <td className="py-1.5 pr-3 font-medium">{RUNNING_WORKOUT_LABELS[row.workout]}</td>
                    <td className="py-1.5 pr-3">{row.runs}</td>
                    <td className="py-1.5 pr-3">{formatAmount(row.totalDistance)}</td>
                    <td className="py-1.5 pr-3">{formatPace(row.avgPace)}</td>
                    <td className="py-1.5 pr-3">{formatPace(row.bestPace)}</td>
                    <td className="py-1.5">{row.avgInclinePct !== null ? `${row.avgInclinePct}%` : "—"}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </Card>
      ) : null}
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

function ReadingStats({ goal, entries }: { goal: Goal; entries: Entry[] }) {
  const books = entries
    .filter((e) => e.goalsPlus?.mode === "goalsplus-reading")
    .map((e) => ({ id: e.id, date: e.date, book: e.goalsPlus as GoalsPlusReadingEntry }));
  const pages = books.reduce((s, b) => s + b.book.pages, 0);
  const rated = books.filter((b) => b.book.rating > 0);
  const avgRating = rated.length ? rated.reduce((s, b) => s + b.book.rating, 0) / rated.length : 0;

  // entries arrive date-ascending → running count is the reading curve
  let running = 0;
  const points: DatePoint[] = books.map((b) => ({ date: b.date, value: ++running }));

  const displayDate = (b: { date: string; book: GoalsPlusReadingEntry }) =>
    b.book.dateResolution === "year" ? b.date.slice(0, 4) : b.date;

  return (
    <>
      <div className="grid grid-cols-3 gap-3">
        <Stat label="Books" value={String(books.length)} />
        <Stat label="Pages logged" value={pages > 0 ? formatAmount(pages) : "—"} />
        <Stat label="Avg rating" value={avgRating > 0 ? `${Math.round(avgRating * 10) / 10} ★` : "—"} />
      </div>
      <Card>
        <CardTitle>{goal.name} · books over time</CardTitle>
        {points.length === 0 ? (
          <EmptyState>No books logged yet.</EmptyState>
        ) : (
          <EChart option={dateLineOption(points, {}, chartColors())} height={220} />
        )}
      </Card>
      {books.length > 0 ? (
        <Card>
          <CardTitle>Book log</CardTitle>
          <ul className="flex flex-col divide-y divide-border">
            {[...books].reverse().map((b) => (
              <li key={b.id} className="flex flex-wrap items-center justify-between gap-2 py-2 text-sm">
                <span>
                  <span className="font-medium">{b.book.bookTitle || "Untitled"}</span>
                  {b.book.author ? <span className="text-muted"> — {b.book.author}</span> : null}
                </span>
                <span className="flex items-center gap-3 text-xs text-muted">
                  {b.book.rating > 0 ? (
                    <span aria-label={`${b.book.rating} of 5 stars`}>
                      {"★".repeat(b.book.rating)}{"☆".repeat(5 - b.book.rating)}
                    </span>
                  ) : null}
                  {b.book.pages > 0 ? <span>{formatAmount(b.book.pages)} pages</span> : null}
                  <span className="w-20 text-right">{displayDate(b)}</span>
                </span>
              </li>
            ))}
          </ul>
        </Card>
      ) : null}
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
