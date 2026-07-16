import type { EChartsOption } from "echarts";
import type { TrendColors } from "./activityTrend";
import { nearestGrade } from "@/lib/domain/grades";

export interface GradeTrendPoint {
  /** dateKey when xKind is "date", criterion name when "category" */
  label: string;
  /** GPA-style score, null = no grades behind this label */
  score: number | null;
}

/** y-axis tick letters at the whole-number scores */
const TICK_LETTERS: Record<number, string> = { 0: "F", 1: "D", 2: "C", 3: "B", 4: "A" };

/**
 * Grades as a line or bar, one series at a time (the selectors above the
 * chart name it). X axis is either a day-by-day date range (ungraded days
 * stay on the axis: the line bridges them, bars leave them empty) or one
 * slot per criterion.
 */
export function gradesTrendOption(
  points: GradeTrendPoint[],
  mode: "line" | "bar",
  xKind: "date" | "category",
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
      data: points.map((p) => p.label),
      axisLine: { lineStyle: { color: colors.border } },
      axisLabel:
        xKind === "date"
          ? {
              color: colors.muted,
              interval: Math.max(Math.floor(points.length / 6) - 1, 0),
              formatter: (v: string) => String(v).slice(5),
            }
          : { color: colors.muted, interval: 0, width: 90, overflow: "truncate" as const },
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
            showSymbol: points.length <= 60,
            symbolSize: 8,
            lineStyle: { color: colors.accent, width: 2 },
            itemStyle: { color: colors.accent },
          },
    ],
  };
}
