"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import Link from "next/link";
import type { EChartsType } from "echarts";
import { cn } from "@/lib/cn";
import type { Goal, PeriodKind, Vacation } from "@/types/models";
import type { DailyTotals } from "@/lib/domain/progress";
import type { DateRange } from "@/lib/domain/dates";
import {
  aggregateCumulativePoints,
  bucketRangeTotals,
  computePace,
  getCumulativeSeries,
  neededPerDay,
  paceTone,
  sumRange,
  type SeriesGranularity,
} from "@/lib/domain/progress";
import { getPeriodRange } from "@/lib/domain/periods";
import { addDays, getDateKey } from "@/lib/domain/dates";
import { useUserData } from "@/components/data/UserDataProvider";
import { getTargetForPeriod, type PeriodGoalOverrides } from "@/lib/domain/targets";
import { formatAmount } from "@/lib/domain/format";
import { cumulativeSeriesToCsv } from "@/lib/domain/csv";
import { downloadDataUrl, downloadFile } from "@/lib/download";
import type { CumulativePoint } from "@/lib/domain/progress";
import type { WeekStart } from "@/types/models";
import { STRETCH_GOALS, deleteMetaValue, setMetaValue } from "@/lib/firebase/repos/meta";
import { Card } from "@/components/ui/Card";
import { Badge } from "@/components/ui/Badge";
import { Button } from "@/components/ui/Button";
import { Input, Select } from "@/components/ui/Input";
import { ProgressBar } from "@/components/ui/ProgressBar";
import { toast } from "@/components/ui/Toaster";
import { EChart, themeColor } from "@/components/charts/EChart";
import { cumulativeScrubOption } from "@/lib/charts/options/cumulativeScrub";
import { periodBarsOption } from "@/lib/charts/options/periodBars";

const TONE_LABEL: Record<"hit" | "onpace" | "behind" | "missed", string> = {
  hit: "Goal hit",
  onpace: "On pace",
  behind: "Behind",
  missed: "Off pace",
};

const TONE_BORDER: Record<"hit" | "onpace" | "behind" | "missed", string> = {
  hit: "border-l-tone-hit",
  onpace: "border-l-tone-onpace",
  behind: "border-l-tone-behind",
  missed: "border-l-tone-missed",
};

export function GoalPeriodCard({
  goal,
  totals,
  period,
  range,
  weekStart,
  overrides,
  vacations,
  uid,
  stretchKey,
  stretchTarget,
  streak = 0,
  now,
}: {
  goal: Goal;
  totals: DailyTotals;
  period: PeriodKind;
  range: DateRange;
  weekStart: WeekStart;
  overrides?: PeriodGoalOverrides;
  vacations?: Vacation[];
  uid: string;
  /** meta/stretchGoals key for this goal+period, or null when unavailable (quarter) */
  stretchKey: string | null;
  stretchTarget?: number;
  /** current consecutive-day logging streak for this goal (badge when ≥ 2) */
  streak?: number;
  now: Date;
}) {
  const [open, setOpen] = useState(false);
  const [stretchEditing, setStretchEditing] = useState(false);
  const [stretchInput, setStretchInput] = useState("");
  const [stretchSaving, setStretchSaving] = useState(false);
  // Index of the frozen scrub point (click-to-pin), or null when live.
  const [pinnedIndex, setPinnedIndex] = useState<number | null>(null);
  // year graphs can be viewed daily / weekly / monthly; daily (line) is the default
  const [granularity, setGranularity] = useState<SeriesGranularity>("day");
  const [showOverlay, setShowOverlay] = useState(false);
  const { windowStartKey } = useUserData();

  const { progress, target, pace, tone } = useMemo(() => {
    const progress = sumRange(totals, goal.id, range);
    const target = getTargetForPeriod(goal, period, range, { weekStart, overrides, vacations });
    const pace = computePace(progress, target, range, now);
    return { progress, target, pace, tone: paceTone(pace) };
  }, [totals, goal, period, range, weekStart, overrides, vacations, now]);

  // Year "By week" / "By month" are bar-chart views; "Daily" is the cumulative line.
  const barsMode = period === "year" && granularity !== "day";

  const points = useMemo<CumulativePoint[]>(
    () =>
      open && !barsMode
        ? aggregateCumulativePoints(getCumulativeSeries(totals, goal.id, range, now), granularity, weekStart)
        : [],
    [open, barsMode, totals, goal.id, range, now, granularity, weekStart],
  );

  const barPoints = useMemo(() => {
    if (!open || !barsMode) return [];
    const g = granularity as "week" | "month";
    return bucketRangeTotals(totals, goal.id, range, g, weekStart, now).map((b) => ({
      startKey: b.startKey,
      total: b.total,
      target: getTargetForPeriod(goal, g, b.range, { weekStart, overrides, vacations }),
    }));
  }, [open, barsMode, totals, goal, range, granularity, weekStart, overrides, vacations, now]);

  // Previous calendar period, offered only when it's inside the live window.
  const prevRange = useMemo(
    () => getPeriodRange(period, addDays(range.start, -1), weekStart),
    [period, range.start, weekStart],
  );
  const overlayAvailable = getDateKey(prevRange.start) >= windowStartKey;
  const overlayData = useMemo<(number | null)[] | undefined>(() => {
    if (!open || !showOverlay || !overlayAvailable) return undefined;
    const prev = aggregateCumulativePoints(
      getCumulativeSeries(totals, goal.id, prevRange, now),
      granularity,
      weekStart,
    );
    // index-aligned to the current period's points (periods can differ in length)
    return points.map((_, i) => (i < prev.length ? prev[i].cumulative : null));
  }, [open, showOverlay, overlayAvailable, totals, goal.id, prevRange, now, granularity, weekStart, points]);
  // Keep the latest points reachable from the once-attached click handler.
  const pointsRef = useRef(points);
  useEffect(() => {
    pointsRef.current = points;
  }, [points]);
  const chartRef = useRef<EChartsType | null>(null);

  const chartOption = useMemo(() => {
    if (!open) return null;
    if (barsMode) {
      return periodBarsOption(barPoints, granularity as "week" | "month", goal.unit, {
        accent: themeColor("--accent", "#009f94"),
        target: themeColor("--tone-behind", "#be7f24"),
        text: themeColor("--text", "#222"),
        muted: themeColor("--muted", "#888"),
        grid: themeColor("--border", "#ddd"),
        surface: themeColor("--surface", "#fff"),
        border: themeColor("--border", "#ddd"),
      });
    }
    return cumulativeScrubOption(
      points,
      target,
      goal.unit,
      {
        accent: themeColor("--accent", "#009f94"),
        projected: themeColor("--muted", "#888"),
        projectedFill: "#ffffff",
        target: themeColor("--tone-behind", "#be7f24"),
        overlay: themeColor("--chart-5", "#4a3aa7"),
        text: themeColor("--text", "#222"),
        muted: themeColor("--muted", "#888"),
        grid: themeColor("--border", "#ddd"),
        surface: themeColor("--surface", "#fff"),
        border: themeColor("--border", "#ddd"),
      },
      pinnedIndex,
      overlayData,
    );
  }, [open, barsMode, barPoints, granularity, points, goal.unit, target, pinnedIndex, overlayData]);

  // Clicking anywhere in the plot pins the nearest date; the readout freezes.
  const handleChartReady = useCallback((chart: EChartsType) => {
    chartRef.current = chart;
    chart.getZr().on("click", (event) => {
      const pixel = [event.offsetX, event.offsetY];
      if (!chart.containPixel("grid", pixel)) return;
      const axisValue = chart.convertFromPixel({ xAxisIndex: 0 }, event.offsetX);
      const idx = Math.round(Number(axisValue));
      if (idx >= 0 && idx < pointsRef.current.length) setPinnedIndex(idx);
    });
  }, []);

  const pinnedPoint = pinnedIndex !== null ? points[pinnedIndex] : undefined;

  function exportPng() {
    const chart = chartRef.current;
    if (!chart) return;
    const url = chart.getDataURL({ type: "png", pixelRatio: 2, backgroundColor: themeColor("--surface", "#fff") });
    downloadDataUrl(`${goal.name || "goal"}-${period}.png`, url);
  }

  function exportCsv() {
    downloadFile(`${goal.name || "goal"}-${period}.csv`, cumulativeSeriesToCsv(points), "text/csv");
  }

  const stretchHit = stretchTarget !== undefined && stretchTarget > 0 && progress >= stretchTarget;

  function openStretchEditor() {
    setStretchInput(stretchTarget !== undefined ? String(stretchTarget) : "");
    setStretchEditing(true);
  }

  async function saveStretch() {
    if (!stretchKey) return;
    const value = Number(stretchInput);
    if (!(value > 0)) {
      toast.error("Enter a stretch target above 0");
      return;
    }
    setStretchSaving(true);
    try {
      await setMetaValue(uid, STRETCH_GOALS, stretchKey, value);
      setStretchEditing(false);
    } catch {
      toast.error("Could not save stretch goal");
    } finally {
      setStretchSaving(false);
    }
  }

  async function clearStretch() {
    if (!stretchKey) return;
    setStretchSaving(true);
    try {
      await deleteMetaValue(uid, STRETCH_GOALS, stretchKey);
      setStretchEditing(false);
    } catch {
      toast.error("Could not clear stretch goal");
    } finally {
      setStretchSaving(false);
    }
  }

  return (
    <Card className={cn("flex flex-col gap-3 border-l-4", TONE_BORDER[tone])}>
      <div className="flex flex-wrap items-center justify-between gap-2">
        <div className="flex items-center gap-2">
          <Link href={`/goal/${goal.id}`} className="font-medium hover:underline">{goal.name}</Link>
          <Badge tone={tone}>{TONE_LABEL[tone]}</Badge>
          {streak >= 2 ? (
            <Badge tone="accent" className="gap-0.5">
              <span aria-hidden>🔥</span>
              {streak}
            </Badge>
          ) : null}
        </div>
        <span className="text-sm text-muted">
          {formatAmount(progress)}
          {target > 0 ? ` / ${formatAmount(target)}` : ""} {goal.unit}
        </span>
      </div>
      <ProgressBar
        percent={pace.completion}
        tone={tone}
        projectedPercent={target > 0 ? (pace.projected / target) * 100 : undefined}
      />
      <div className="flex items-center justify-between text-xs text-muted">
        <div className="flex items-center gap-2">
          {stretchKey ? (
            <Button
              size="sm"
              variant={stretchEditing ? "primary" : "ghost"}
              className="w-7 justify-center px-0 font-semibold"
              onClick={stretchEditing ? () => setStretchEditing(false) : openStretchEditor}
              aria-expanded={stretchEditing}
              aria-label={stretchTarget !== undefined ? "Edit stretch goal" : "Set stretch goal"}
              title={stretchTarget !== undefined ? "Edit stretch goal" : "Set stretch goal"}
            >
              S
            </Button>
          ) : null}
          <span>
            {target > 0 ? `${pace.completion}% · ` : ""}
            projected {formatAmount(pace.projected)} {goal.unit}
            {(() => {
              const need = neededPerDay(progress, target, range, now);
              return need > 0 ? ` · need ${formatAmount(need)}/day` : "";
            })()}
          </span>
        </div>
        <Button
          size="sm"
          variant={open ? "primary" : "ghost"}
          className="w-7 justify-center px-0 font-semibold"
          onClick={() => { setOpen((v) => !v); setPinnedIndex(null); }}
          aria-expanded={open}
          aria-label={open ? "Hide graph" : "Show graph"}
          title={open ? "Hide graph" : "Show graph"}
        >
          G
        </Button>
      </div>

      {stretchTarget !== undefined && !stretchEditing ? (
        <div className="flex items-center justify-between rounded-lg bg-bg-soft px-3 py-1.5 text-xs">
          <span className="text-muted">
            Stretch: {formatAmount(progress)} / {formatAmount(stretchTarget)} {goal.unit}
          </span>
          {stretchHit ? <Badge tone="hit">Stretch hit</Badge> : null}
        </div>
      ) : null}

      {stretchEditing ? (
        <div className="flex flex-wrap items-center gap-2 rounded-lg bg-bg-soft px-3 py-2">
          <span className="text-xs text-muted">Stretch target</span>
          <Input
            type="number" min={0} step="any" inputMode="decimal"
            className="w-24 py-1"
            value={stretchInput}
            onChange={(e) => setStretchInput(e.target.value)}
            onKeyDown={(e) => { if (e.key === "Enter") saveStretch(); }}
            aria-label={`Stretch target for ${goal.name}`}
            autoFocus
          />
          <span className="text-xs text-muted">{goal.unit}</span>
          <div className="ml-auto flex gap-1">
            {stretchTarget !== undefined ? (
              <Button size="sm" variant="ghost" onClick={clearStretch} disabled={stretchSaving}>Clear</Button>
            ) : null}
            <Button size="sm" variant="primary" onClick={saveStretch} disabled={stretchSaving}>Save</Button>
          </div>
        </div>
      ) : null}

      {open && chartOption ? (
        <div className="flex flex-col gap-2">
          <div className="flex flex-wrap items-center gap-3 text-xs text-muted">
            {period === "year" ? (
              <label className="flex items-center gap-1.5">
                View
                <Select
                  className="w-auto py-0.5 text-xs"
                  value={granularity}
                  onChange={(e) => { setGranularity(e.target.value as SeriesGranularity); setPinnedIndex(null); }}
                >
                  <option value="day">Daily</option>
                  <option value="week">By week</option>
                  <option value="month">By month</option>
                </Select>
              </label>
            ) : null}
            {overlayAvailable && !barsMode ? (
              <label className="flex items-center gap-1.5">
                <input
                  type="checkbox"
                  checked={showOverlay}
                  onChange={(e) => setShowOverlay(e.target.checked)}
                />
                Overlay last {period}
              </label>
            ) : null}
          </div>
          <EChart option={chartOption} height={220} onReady={handleChartReady} />
          {barsMode ? (
            <div className="flex items-center justify-between text-xs text-muted">
              <span>
                {granularity === "week" ? "Weekly" : "Monthly"} totals — solid bars hit their target.
              </span>
              <Button size="sm" variant="ghost" onClick={exportPng}>Export PNG</Button>
            </div>
          ) : pinnedPoint ? (
            <div className="flex flex-wrap items-center justify-between gap-2 rounded-lg bg-bg-soft px-3 py-2 text-xs">
              <span className="text-muted">
                <span className="font-medium text-text">{pinnedPoint.date}</span>
                {" · "}
                {pinnedPoint.projected ? "Projected" : "Total"}{" "}
                <span className="font-medium text-text">
                  {formatAmount(pinnedPoint.projected ? pinnedPoint.projectedCumulative ?? 0 : pinnedPoint.cumulative)} {goal.unit}
                </span>
              </span>
              <div className="flex items-center gap-1">
                <Button size="sm" variant="ghost" onClick={exportPng}>Export PNG</Button>
                <Button size="sm" variant="ghost" onClick={exportCsv}>Export CSV</Button>
                <Button size="sm" variant="ghost" onClick={() => setPinnedIndex(null)}>Unpin</Button>
              </div>
            </div>
          ) : (
            <p className="text-center text-xs text-muted">Click the graph to freeze a point and export it.</p>
          )}
        </div>
      ) : null}
    </Card>
  );
}
