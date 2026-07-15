import type { EChartsOption } from "echarts";
import type { TrendColors } from "./activityTrend";
import { nearestGrade } from "@/lib/domain/grades";

export interface GradeTrendPoint {
  /** dateKey */
  date: string;
  /** GPA-style score for the day (average or single criterion), null = ungraded */
  score: number | null;
}

/** y-axis tick letters at the whole-number scores */
const TICK_LETTERS: Record<number, string> = { 0: "F", 1: "D", 2: "C", 3: "B", 4: "A" };

/**
 * Daily grades across the recent window as a line or bar, one series at a
 * time (the selector above the chart names it). Ungraded days stay on the
 * axis: the line bridges them, bars leave them empty.
 */
export function gradesTrendOption(
  points: GradeTrendPoint[],
  mode: "line" | "bar",
  colors: TrendColors,
): EChartsOption {
  const values = points.map((p) => p.score);
  return {
    grid: { top: 20, right: 14, bottom: 28, left: 36 },
    tooltip: {
      trigger: "axis",
      backgroundColor: colors.surface,
      borderColor: colors.border,
      textStyle: { color: colors.text },
      formatter: (params: unknown) => {
        const list = (params as Array<{ name: string; value: number | null | undefined }>)
          .filter((p) => typeof p.value === "number");
        if (!list.length) return "";
        const score = list[0].value as number;
        return `${list[0].name}<br/><strong>${nearestGrade(score)}</strong> (${Math.round(score * 100) / 100})`;
      },
    },
    xAxis: {
      type: "category",
      data: points.map((p) => p.date),
      axisLine: { lineStyle: { color: colors.border } },
      axisLabel: {
        color: colors.muted,
        interval: Math.max(Math.floor(points.length / 6) - 1, 0),
        formatter: (v: string) => String(v).slice(5),
      },
    },
    yAxis: {
      type: "value",
      min: 0,
      // A+ sits at 4.3; whole-number ticks carry the letters
      max: 4.3,
      interval: 1,
      axisLabel: { color: colors.muted, formatter: (v: number) => TICK_LETTERS[v] ?? "" },
      splitLine: { lineStyle: { color: colors.grid } },
    },
    series: [
      mode === "bar"
        ? {
            type: "bar",
            data: values,
            itemStyle: { color: colors.accent, borderRadius: [4, 4, 0, 0] },
            barMaxWidth: 22,
          }
        : {
            type: "line",
            data: values,
            connectNulls: true,
            showSymbol: true,
            symbolSize: 8,
            lineStyle: { color: colors.accent, width: 2 },
            itemStyle: { color: colors.accent },
          },
    ],
  };
}
