"use client";

import { useMemo, useState } from "react";
import { orderBy, query, where } from "firebase/firestore";
import type { GradeCriterion, GradeEntry } from "@/types/models";
import { useUserData } from "@/components/data/UserDataProvider";
import { gradeCriteriaRepo, gradeEntriesRepo } from "@/lib/firebase/repos";
import { gradeScore, isGradeLetter, type GradeLetter } from "@/lib/domain/grades";
import { addDays, getDateKey, normalizeDate, parseDateKey } from "@/lib/domain/dates";
import { useCollection } from "@/hooks/useCollection";
import { Button } from "@/components/ui/Button";
import { Card, CardTitle } from "@/components/ui/Card";
import { Select } from "@/components/ui/Input";
import { EChart, themeColor } from "@/components/charts/EChart";
import { gradesTrendOption, type GradeTrendPoint } from "@/lib/charts/options/gradesTrend";

/** grade entries are loaded a year back so the chart can cover week/month/year */
const CHART_DAYS = 365;

type ChartRange = "week" | "month" | "year";
type ChartGroup = "date" | "criterion";
type DayFilter = "all" | "weekday" | "weekend" | "best" | "worst";

const RANGE_DAYS: Record<ChartRange, number> = { week: 7, month: 30, year: 365 };
const DOW_NAMES = ["Sunday", "Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday"];

/**
 * Grade history chart: line/bar over week/month/year, grouped by date or by
 * criterion, with weekday/weekend/best/worst day filters. Self-contained
 * (subscribes to criteria + a year of grade entries) so it can sit on both
 * the Grades capture tab and the Grades review view. Renders nothing until
 * a criterion exists.
 */
export function GradeHistoryCard() {
  const { uid } = useUserData();
  const criteria = useCollection<GradeCriterion>(
    () => gradeCriteriaRepo.query(uid, orderBy("createdAt", "asc")),
    [uid],
  );
  const chartStartKey = useMemo(() => getDateKey(addDays(normalizeDate(new Date()), -CHART_DAYS)), []);
  const entries = useCollection<GradeEntry>(
    () => query(gradeEntriesRepo.ref(uid), where("date", ">=", chartStartKey), orderBy("date", "desc")),
    [uid, chartStartKey],
  );

  const [chartCriterion, setChartCriterion] = useState("avg");
  const [chartMode, setChartMode] = useState<"line" | "bar">("line");
  const [chartRange, setChartRange] = useState<ChartRange>("month");
  const [chartGroup, setChartGroup] = useState<ChartGroup>("date");
  const [dayFilter, setDayFilter] = useState<DayFilter>("all");

  // Chart pipeline: range → (criterion) → day filter → group by date or criterion.
  const chartData = useMemo(() => {
    const today = normalizeDate(new Date());
    const startKey = getDateKey(addDays(today, -(RANGE_DAYS[chartRange] - 1)));
    const inRange = entries.data.filter((e) => e.date >= startKey && isGradeLetter(e.grade));
    const forSeries =
      chartGroup === "date" && chartCriterion !== "avg"
        ? inRange.filter((e) => e.criterionId === chartCriterion)
        : inRange;

    // Average score per weekday, for the best/worst day filters.
    const byDow = new Map<number, number[]>();
    for (const e of forSeries) {
      const dow = parseDateKey(e.date).getDay();
      if (!byDow.has(dow)) byDow.set(dow, []);
      byDow.get(dow)!.push(gradeScore(e.grade as GradeLetter));
    }
    let bestDow: number | null = null;
    let worstDow: number | null = null;
    let bestAvg = -Infinity;
    let worstAvg = Infinity;
    for (const [dow, scores] of byDow) {
      const avg = scores.reduce((s, v) => s + v, 0) / scores.length;
      if (avg > bestAvg) { bestAvg = avg; bestDow = dow; }
      if (avg < worstAvg) { worstAvg = avg; worstDow = dow; }
    }

    const keepDay = (dateKey: string): boolean => {
      if (dayFilter === "all") return true;
      const dow = parseDateKey(dateKey).getDay();
      if (dayFilter === "weekday") return dow >= 1 && dow <= 5;
      if (dayFilter === "weekend") return dow === 0 || dow === 6;
      if (dayFilter === "best") return bestDow !== null && dow === bestDow;
      return worstDow !== null && dow === worstDow;
    };
    const filtered = forSeries.filter((e) => keepDay(e.date));

    let points: GradeTrendPoint[];
    if (chartGroup === "criterion") {
      points = criteria.data.map((c) => {
        const scores = filtered
          .filter((e) => e.criterionId === c.id)
          .map((e) => gradeScore(e.grade as GradeLetter));
        return {
          label: c.name,
          score: scores.length ? scores.reduce((s, v) => s + v, 0) / scores.length : null,
        };
      });
    } else {
      const byDate = new Map<string, number[]>();
      for (const e of filtered) {
        if (!byDate.has(e.date)) byDate.set(e.date, []);
        byDate.get(e.date)!.push(gradeScore(e.grade as GradeLetter));
      }
      points = [];
      for (let d = RANGE_DAYS[chartRange] - 1; d >= 0; d -= 1) {
        const key = getDateKey(addDays(today, -d));
        if (!keepDay(key)) continue; // day filters drop non-matching days from the axis
        const scores = byDate.get(key);
        points.push({
          label: key,
          score: scores ? scores.reduce((s, v) => s + v, 0) / scores.length : null,
        });
      }
    }
    return { points, bestDow, worstDow };
  }, [entries.data, criteria.data, chartRange, chartGroup, chartCriterion, dayFilter]);
  const hasChartData = chartData.points.some((p) => p.score !== null);

  const chartOption = useMemo(
    () =>
      gradesTrendOption(chartData.points, chartMode, chartGroup === "criterion" ? "category" : "date", {
        accent: themeColor("--accent", "#009f94"),
        text: themeColor("--text", "#222"),
        muted: themeColor("--muted", "#888"),
        grid: themeColor("--border", "#ddd"),
        surface: themeColor("--surface", "#fff"),
        border: themeColor("--border", "#ddd"),
      }),
    [chartData.points, chartMode, chartGroup],
  );

  if (criteria.data.length === 0) return null;

  return (
    <Card>
      <div className="mb-3 flex flex-wrap items-center justify-between gap-2">
        <CardTitle>Grade history</CardTitle>
        <div className="flex flex-wrap items-center gap-2">
          <Select
            className="w-auto py-1"
            value={chartRange}
            onChange={(e) => setChartRange(e.target.value as ChartRange)}
            aria-label="Chart range"
          >
            <option value="week">Week</option>
            <option value="month">Month</option>
            <option value="year">Year</option>
          </Select>
          <Select
            className="w-auto py-1"
            value={chartGroup}
            onChange={(e) => setChartGroup(e.target.value as ChartGroup)}
            aria-label="Chart grouping"
          >
            <option value="date">By date</option>
            <option value="criterion">By criterion</option>
          </Select>
          {chartGroup === "date" ? (
            <Select
              className="w-auto py-1"
              value={chartCriterion}
              onChange={(e) => setChartCriterion(e.target.value)}
              aria-label="Charted criterion"
            >
              <option value="avg">Daily average</option>
              {criteria.data.map((c) => (
                <option key={c.id} value={c.id}>{c.name}</option>
              ))}
            </Select>
          ) : null}
          <Select
            className="w-auto py-1"
            value={dayFilter}
            onChange={(e) => setDayFilter(e.target.value as DayFilter)}
            aria-label="Day filter"
          >
            <option value="all">All days</option>
            <option value="weekday">Weekdays</option>
            <option value="weekend">Weekends</option>
            <option value="best">Best day</option>
            <option value="worst">Worst day</option>
          </Select>
          <div className="flex items-center gap-1">
            <Button size="sm" variant={chartMode === "line" ? "primary" : "default"} onClick={() => setChartMode("line")}>
              Line
            </Button>
            <Button size="sm" variant={chartMode === "bar" ? "primary" : "default"} onClick={() => setChartMode("bar")}>
              Bar
            </Button>
          </div>
        </div>
      </div>
      {hasChartData ? (
        <>
          <EChart option={chartOption} height={220} />
          {dayFilter === "best" && chartData.bestDow !== null ? (
            <p className="mt-1 text-center text-xs text-muted">
              Best day this {chartRange}: {DOW_NAMES[chartData.bestDow]}
            </p>
          ) : dayFilter === "worst" && chartData.worstDow !== null ? (
            <p className="mt-1 text-center text-xs text-muted">
              Worst day this {chartRange}: {DOW_NAMES[chartData.worstDow]}
            </p>
          ) : null}
        </>
      ) : (
        <p className="text-sm text-muted">No grades match this view yet.</p>
      )}
    </Card>
  );
}
