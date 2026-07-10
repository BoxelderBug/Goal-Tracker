import type { EChartsOption } from "echarts";
import type { TrendColors } from "./activityTrend";
import type { WeekTrendPoint } from "@/lib/domain/trends";

export type TrendMetric = "hitRate" | "volume" | "consistency";

const META: Record<TrendMetric, { label: string; suffix: string; asBar: boolean }> = {
  hitRate: { label: "Hit rate", suffix: "%", asBar: false },
  consistency: { label: "Consistency", suffix: "%", asBar: false },
  volume: { label: "Volume", suffix: "", asBar: true },
};

/** One-metric weekly trend across the trailing window. */
export function weeklyTrendOption(
  points: WeekTrendPoint[],
  metric: TrendMetric,
  colors: TrendColors,
): EChartsOption {
  const meta = META[metric];
  const values = points.map((p) => p[metric]);
  const isPct = metric !== "volume";
  return {
    grid: { top: 20, right: 14, bottom: 28, left: 36 },
    tooltip: {
      trigger: "axis",
      backgroundColor: colors.surface,
      borderColor: colors.border,
      textStyle: { color: colors.text },
      formatter: (params: unknown) => {
        const list = params as Array<{ name: string; value: number }>;
        if (!list.length) return "";
        return `Week of ${list[0].name}<br/><strong>${list[0].value}${meta.suffix}</strong> ${meta.label.toLowerCase()}`;
      },
    },
    xAxis: {
      type: "category",
      data: points.map((p) => p.weekStartKey),
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
      max: isPct ? 100 : undefined,
      minInterval: isPct ? undefined : 1,
      axisLabel: { color: colors.muted, formatter: (v: number) => `${v}${meta.suffix}` },
      splitLine: { lineStyle: { color: colors.grid } },
    },
    series: [
      meta.asBar
        ? {
            type: "bar",
            data: values,
            itemStyle: { color: colors.accent, borderRadius: [4, 4, 0, 0] },
            barMaxWidth: 22,
          }
        : {
            type: "line",
            data: values,
            smooth: true,
            showSymbol: points.length <= 14,
            lineStyle: { color: colors.accent, width: 2 },
            itemStyle: { color: colors.accent },
            areaStyle: { color: colors.accent, opacity: 0.12 },
          },
    ],
  };
}
