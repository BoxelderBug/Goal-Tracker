"use client";

import { useMemo, useState } from "react";
import Link from "next/link";
import { useSettings, useUserData } from "@/components/data/UserDataProvider";
import { addDays, getDateKey, normalizeDate } from "@/lib/domain/dates";
import { getWeekRange } from "@/lib/domain/periods";
import { buildDailyTotals, computePace, sumRange, latestEntryDateInRange } from "@/lib/domain/progress";
import { getTargetForPeriod } from "@/lib/domain/targets";
import { computeWeeklyTrends } from "@/lib/domain/trends";
import { Card, CardTitle } from "@/components/ui/Card";
import { EmptyState } from "@/components/ui/EmptyState";
import { Badge } from "@/components/ui/Badge";
import { Button } from "@/components/ui/Button";
import { EChart, themeColor } from "@/components/charts/EChart";
import { activityTrendOption } from "@/lib/charts/options/activityTrend";
import { volumeByGoalOption } from "@/lib/charts/options/volumeByGoal";
import { weeklyTrendOption } from "@/lib/charts/options/weeklyTrend";

type ChartView = "activity" | "volume" | "hitRate";

export default function HomePage() {
  const { goals, entries } = useUserData();
  const settings = useSettings();
  const now = useMemo(() => new Date(), []);
  const active = useMemo(() => goals.filter((g) => !g.archived), [goals]);
  const totals = useMemo(() => buildDailyTotals(entries), [entries]);
  const week = useMemo(() => getWeekRange(now, settings.weekStart), [now, settings.weekStart]);
  const [chartView, setChartView] = useState<ChartView>("activity");

  const weekSummary = useMemo(() => {
    let progress = 0;
    let target = 0;
    let hit = 0;
    for (const goal of active) {
      const p = sumRange(totals, goal.id, week);
      const t = getTargetForPeriod(goal, "week", week, { weekStart: settings.weekStart });
      progress += p;
      target += t;
      if (computePace(p, t, week, now).goalHit) hit += 1;
    }
    return { completion: target > 0 ? Math.round((progress / target) * 100) : 0, hit };
  }, [active, totals, week, settings.weekStart, now]);

  const trendPoints = useMemo(() => {
    const counts = new Map<string, number>();
    for (const e of entries) counts.set(e.date, (counts.get(e.date) ?? 0) + 1);
    const start = addDays(normalizeDate(now), -29);
    return Array.from({ length: 30 }, (_, i) => {
      const date = getDateKey(addDays(start, i));
      return { date, value: counts.get(date) ?? 0 };
    });
  }, [entries, now]);

  const colors = () => ({
    accent: themeColor("--accent", "#009f94"),
    text: themeColor("--text", "#222"),
    muted: themeColor("--muted", "#888"),
    grid: themeColor("--border", "#ddd"),
    surface: themeColor("--surface", "#fff"),
    border: themeColor("--border", "#ddd"),
  });

  const volumeRows = useMemo(
    () =>
      active
        .map((goal) => ({
          name: goal.name,
          progress: Math.round(sumRange(totals, goal.id, week) * 100) / 100,
          target: getTargetForPeriod(goal, "week", week, { weekStart: settings.weekStart }),
        }))
        .sort((a, b) => b.progress - a.progress)
        .slice(0, 8),
    [active, totals, week, settings.weekStart],
  );

  const hitRatePoints = useMemo(
    () => computeWeeklyTrends(goals, entries, 8, settings.weekStart, now),
    [goals, entries, settings.weekStart, now],
  );

  const chartOption = useMemo(() => {
    if (chartView === "volume") return volumeByGoalOption(volumeRows, colors());
    if (chartView === "hitRate") return weeklyTrendOption(hitRatePoints, "hitRate", colors());
    return activityTrendOption(trendPoints, colors());
  }, [chartView, volumeRows, hitRatePoints, trendPoints]);

  const missed = useMemo(() => {
    const threshold = settings.missedEntryDays;
    const cutoff = getDateKey(addDays(normalizeDate(now), -threshold));
    const lookback = { start: addDays(normalizeDate(now), -60), end: normalizeDate(now) };
    return active
      .map((goal) => {
        const latest = latestEntryDateInRange(entries, goal.id, lookback);
        return { goal, latest };
      })
      .filter(({ latest }) => latest === null || latest < cutoff)
      .slice(0, 8);
  }, [active, entries, now, settings.missedEntryDays]);

  return (
    <div className="flex flex-col gap-4">
      <h1 className="font-display text-2xl">Dashboard</h1>

      <div className="grid gap-3 sm:grid-cols-3">
        <Card>
          <span className="text-xs uppercase tracking-wide text-muted">This week</span>
          <div className="font-display text-3xl">{weekSummary.completion}%</div>
          <span className="text-sm text-muted">completion across {active.length} goals</span>
        </Card>
        <Card>
          <span className="text-xs uppercase tracking-wide text-muted">Goals hit</span>
          <div className="font-display text-3xl">{weekSummary.hit}</div>
          <span className="text-sm text-muted">this week</span>
        </Card>
        <Card>
          <span className="text-xs uppercase tracking-wide text-muted">Quick log</span>
          <div className="mt-2 flex gap-2">
            <Link href="/entry"><Button size="sm" variant="primary">Add entry</Button></Link>
            <Link href="/entry/week"><Button size="sm">Week</Button></Link>
          </div>
        </Card>
      </div>

      <Card>
        <div className="mb-2 flex flex-wrap items-center justify-between gap-2">
          <CardTitle>Overview</CardTitle>
          <div className="flex gap-1">
            {([
              ["activity", "Activity"],
              ["volume", "This week"],
              ["hitRate", "Hit rate"],
            ] as [ChartView, string][]).map(([v, label]) => (
              <Button key={v} size="sm" variant={chartView === v ? "primary" : "default"} onClick={() => setChartView(v)}>
                {label}
              </Button>
            ))}
          </div>
        </div>
        {entries.length === 0 ? (
          <EmptyState>No entries yet — log your first one.</EmptyState>
        ) : (
          <EChart option={chartOption} height={240} />
        )}
      </Card>

      <Card>
        <CardTitle>Needs attention</CardTitle>
        {missed.length === 0 ? (
          <p className="text-sm text-muted">Every active goal has a recent entry. Nice.</p>
        ) : (
          <ul className="flex flex-col divide-y divide-border">
            {missed.map(({ goal, latest }) => (
              <li key={goal.id} className="flex items-center justify-between gap-3 py-2">
                <span className="text-sm font-medium">{goal.name}</span>
                <div className="flex items-center gap-2">
                  <Badge tone="missed">{latest ? `last ${latest.slice(5)}` : "no entries"}</Badge>
                  <Link href={`/entry?goal=${goal.id}`}><Button size="sm" variant="ghost">Log</Button></Link>
                </div>
              </li>
            ))}
          </ul>
        )}
      </Card>
    </div>
  );
}
