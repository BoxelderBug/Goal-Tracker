"use client";

import { useMemo, useState } from "react";
import { useSettings, useUserData } from "@/components/data/UserDataProvider";
import { computeWeeklyTrends } from "@/lib/domain/trends";
import { computeGoalRecords } from "@/lib/domain/records";
import { formatAmount } from "@/lib/domain/format";
import { Card, CardTitle } from "@/components/ui/Card";
import { Button } from "@/components/ui/Button";
import { EmptyState } from "@/components/ui/EmptyState";
import { EChart, themeColor } from "@/components/charts/EChart";
import { weeklyTrendOption, type TrendMetric } from "@/lib/charts/options/weeklyTrend";

const WINDOWS = [8, 12, 26] as const;
const METRICS: { key: TrendMetric; label: string }[] = [
  { key: "hitRate", label: "Hit rate" },
  { key: "consistency", label: "Consistency" },
  { key: "volume", label: "Volume" },
];

export default function TrendsPage() {
  const { goals, entries } = useUserData();
  const settings = useSettings();
  const now = useMemo(() => new Date(), []);

  const [weeks, setWeeks] = useState<(typeof WINDOWS)[number]>(12);
  const [metric, setMetric] = useState<TrendMetric>("hitRate");

  const points = useMemo(
    () => computeWeeklyTrends(goals, entries, weeks, settings.weekStart, now),
    [goals, entries, weeks, settings.weekStart, now],
  );

  const chartColors = () => ({
    accent: themeColor("--accent", "#009f94"),
    text: themeColor("--text", "#222"),
    muted: themeColor("--muted", "#888"),
    grid: themeColor("--border", "#ddd"),
    surface: themeColor("--surface", "#fff"),
    border: themeColor("--border", "#ddd"),
  });

  const option = useMemo(() => weeklyTrendOption(points, metric, chartColors()), [points, metric]);

  const latest = points[points.length - 1];
  const avg = points.length
    ? Math.round(points.reduce((s, p) => s + p[metric], 0) / points.length)
    : 0;

  const hasData = entries.length > 0 && goals.some((g) => !g.archived);

  return (
    <div className="flex flex-col gap-4">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <h1 className="font-display text-2xl">Trends</h1>
        <div className="flex items-center gap-1">
          {WINDOWS.map((w) => (
            <Button key={w} size="sm" variant={weeks === w ? "primary" : "default"} onClick={() => setWeeks(w)}>
              {w}w
            </Button>
          ))}
        </div>
      </div>

      <div className="flex flex-wrap gap-1">
        {METRICS.map((m) => (
          <Button key={m.key} size="sm" variant={metric === m.key ? "primary" : "default"} onClick={() => setMetric(m.key)}>
            {m.label}
          </Button>
        ))}
      </div>

      {!hasData ? (
        <EmptyState>No trend data yet — add goals and log some entries.</EmptyState>
      ) : (
        <>
          <div className="grid gap-3 sm:grid-cols-2">
            <Card>
              <span className="text-xs uppercase tracking-wide text-muted">Latest week</span>
              <div className="font-display text-3xl">
                {latest ? latest[metric] : 0}{metric === "volume" ? "" : "%"}
              </div>
            </Card>
            <Card>
              <span className="text-xs uppercase tracking-wide text-muted">{weeks}-week average</span>
              <div className="font-display text-3xl">{avg}{metric === "volume" ? "" : "%"}</div>
            </Card>
          </div>
          <Card>
            <CardTitle>{METRICS.find((m) => m.key === metric)?.label} · last {weeks} weeks</CardTitle>
            <EChart option={option} height={260} />
          </Card>
          <RecordsCard />
        </>
      )}
    </div>
  );
}

function RecordsCard() {
  const { goals, entries } = useUserData();
  const settings = useSettings();
  const active = goals.filter((g) => !g.archived);
  const records = useMemo(
    () => computeGoalRecords(goals, entries, settings.weekStart),
    [goals, entries, settings.weekStart],
  );
  const rows = records.filter((r) => r.bestDay || r.bestWeek);
  if (rows.length === 0) return null;

  const byId = new Map(active.map((g) => [g.id, g]));
  return (
    <Card>
      <CardTitle>Personal records <span aria-hidden>🏆</span></CardTitle>
      <ul className="flex flex-col divide-y divide-border">
        {rows.map((r) => {
          const g = byId.get(r.goalId);
          if (!g) return null;
          return (
            <li key={r.goalId} className="flex flex-wrap items-center justify-between gap-2 py-2">
              <span className="text-sm font-medium">{g.name}</span>
              <span className="text-xs text-muted">
                {r.bestDay ? `best day ${formatAmount(r.bestDay.amount)} ${g.unit} (${r.bestDay.date.slice(5)})` : ""}
                {r.bestDay && r.bestWeek ? " · " : ""}
                {r.bestWeek ? `best week ${formatAmount(r.bestWeek.amount)} ${g.unit} (wk of ${r.bestWeek.weekStartKey.slice(5)})` : ""}
              </span>
            </li>
          );
        })}
      </ul>
    </Card>
  );
}
