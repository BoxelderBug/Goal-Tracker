"use client";

import { useMemo, useState } from "react";
import Link from "next/link";
import { useSettings, useUserData } from "@/components/data/UserDataProvider";
import { computeTagStats, computeTagWeeklyCounts, type TagStat } from "@/lib/domain/tags";
import { addDays, getDateKey, normalizeDate } from "@/lib/domain/dates";
import { formatAmount } from "@/lib/domain/format";
import { Card, CardTitle } from "@/components/ui/Card";
import { Button } from "@/components/ui/Button";
import { EmptyState } from "@/components/ui/EmptyState";
import { EChart, resolveThemeColor, themeColor } from "@/components/charts/EChart";
import { tagTrendOption } from "@/lib/charts/options/tagTrend";

const WINDOWS = [4, 12, 26] as const;
/** how many tags the chart draws before it turns into spaghetti */
const CHARTED_TAGS = 5;

export default function TagsPage() {
  const { goals, entries } = useUserData();
  const settings = useSettings();
  const now = useMemo(() => new Date(), []);

  const [weeks, setWeeks] = useState<(typeof WINDOWS)[number]>(12);
  const [expanded, setExpanded] = useState<string | null>(null);

  const fromKey = useMemo(
    () => getDateKey(addDays(normalizeDate(now), -7 * weeks + 1)),
    [now, weeks],
  );

  const stats = useMemo(
    () => computeTagStats(entries, goals, { fromKey }),
    [entries, goals, fromKey],
  );

  const charted = useMemo(() => stats.slice(0, CHARTED_TAGS).map((s) => s.label), [stats]);
  const weekly = useMemo(
    () => computeTagWeeklyCounts(entries, charted, weeks, settings.weekStart, now),
    [entries, charted, weeks, settings.weekStart, now],
  );

  const option = useMemo(
    () =>
      tagTrendOption(
        weekly,
        [1, 2, 3, 5, 6].map((n) => resolveThemeColor(`--chart-${n}`, "#2a78d6")),
        {
          accent: themeColor("--accent", "#009f94"),
          text: themeColor("--text", "#222"),
          muted: themeColor("--muted", "#888"),
          grid: themeColor("--border", "#ddd"),
          surface: themeColor("--surface", "#fff"),
          border: themeColor("--border", "#ddd"),
        },
      ),
    [weekly],
  );

  const taggedEntries = stats.reduce((sum, s) => sum + s.entries, 0);

  return (
    <div className="flex flex-col gap-4">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <h1 className="font-display text-2xl">Tags</h1>
        <div className="flex items-center gap-1">
          {WINDOWS.map((w) => (
            <Button key={w} size="sm" variant={weeks === w ? "primary" : "default"} onClick={() => setWeeks(w)}>
              {w}w
            </Button>
          ))}
        </div>
      </div>

      {stats.length === 0 ? (
        <EmptyState
          action={
            <Link href="/entry">
              <Button size="sm" variant="primary">Add an entry</Button>
            </Link>
          }
        >
          No tagged entries in this window. Add a tag while logging — &ldquo;treadmill&rdquo;,
          &ldquo;morning&rdquo;, &ldquo;with Sam&rdquo; — and they group here across every goal.
        </EmptyState>
      ) : (
        <>
          <div className="grid gap-3 sm:grid-cols-3">
            <Card>
              <span className="text-xs uppercase tracking-wide text-muted">Tags used</span>
              <div className="font-display text-3xl">{stats.length}</div>
            </Card>
            <Card>
              <span className="text-xs uppercase tracking-wide text-muted">Tagged entries</span>
              <div className="font-display text-3xl">{taggedEntries}</div>
            </Card>
            <Card>
              <span className="text-xs uppercase tracking-wide text-muted">Most used</span>
              <div className="truncate font-display text-3xl">{stats[0].label}</div>
              <span className="text-xs text-muted">{stats[0].entries} entries</span>
            </Card>
          </div>

          <Card>
            <CardTitle>Weekly activity{charted.length < stats.length ? ` — top ${CHARTED_TAGS}` : ""}</CardTitle>
            <EChart option={option} height={260} />
          </Card>

          <Card className="p-0">
            <ul className="flex flex-col divide-y divide-border">
              {stats.map((stat) => (
                <TagRow
                  key={stat.key}
                  stat={stat}
                  open={expanded === stat.key}
                  onToggle={() => setExpanded((prev) => (prev === stat.key ? null : stat.key))}
                />
              ))}
            </ul>
          </Card>
        </>
      )}
    </div>
  );
}

function TagRow({ stat, open, onToggle }: { stat: TagStat; open: boolean; onToggle: () => void }) {
  return (
    <li className="px-4 py-3">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <button type="button" onClick={onToggle} aria-expanded={open} className="min-w-0 text-left">
          <span className="rounded-full bg-accent-soft px-2.5 py-0.5 text-sm font-medium text-accent-strong">
            {stat.label}
          </span>
          <span className="ml-2 text-sm text-muted">
            {stat.entries} {stat.entries === 1 ? "entry" : "entries"} · {stat.days}{" "}
            {stat.days === 1 ? "day" : "days"}
            {stat.total === null
              ? " · mixed units"
              : ` · ${formatAmount(stat.total)}${stat.unit ? ` ${stat.unit}` : ""}`}
          </span>
        </button>
        <div className="flex shrink-0 items-center gap-3">
          <span className="text-xs text-muted">last {stat.lastDate}</span>
          <Link href={`/entries?tag=${encodeURIComponent(stat.label)}`}>
            <Button size="sm" variant="ghost">Entries →</Button>
          </Link>
        </div>
      </div>
      {open ? (
        <ul className="mt-2 flex flex-col gap-1 border-l border-border pl-3">
          {stat.goals.map((g) => (
            <li key={g.goalId} className="flex items-baseline justify-between gap-3 text-sm">
              <span className="truncate">{g.goalName}</span>
              <span className="shrink-0 text-muted">
                {g.entries}× · {formatAmount(g.total)}{g.unit ? ` ${g.unit}` : ""}
              </span>
            </li>
          ))}
        </ul>
      ) : null}
    </li>
  );
}
