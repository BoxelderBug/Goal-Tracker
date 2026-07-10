import type { EChartsOption } from "echarts";
import type { TrendColors } from "./activityTrend";

export interface DatePoint {
  date: string;
  value: number;
}

/** Simple date-indexed line series (Goals+ stat history). `invert` flips the
 *  y-axis so lower-is-better metrics (pace, golf score) trend upward when
 *  improving is not needed — we just render raw with an optional target line. */
export function dateLineOption(
  points: DatePoint[],
  opts: { suffix?: string; targetLine?: number | null },
  colors: TrendColors,
): EChartsOption {
  const suffix = opts.suffix ?? "";
  return {
    grid: { top: 20, right: 14, bottom: 28, left: 40 },
    tooltip: {
      trigger: "axis",
      backgroundColor: colors.surface,
      borderColor: colors.border,
      textStyle: { color: colors.text },
      formatter: (params: unknown) => {
        const list = params as Array<{ name: string; value: number }>;
        if (!list.length) return "";
        return `${list[0].name}<br/><strong>${list[0].value}${suffix}</strong>`;
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
      scale: true,
      axisLabel: { color: colors.muted, formatter: (v: number) => `${v}${suffix}` },
      splitLine: { lineStyle: { color: colors.grid } },
    },
    series: [
      {
        type: "line",
        data: points.map((p) => p.value),
        smooth: true,
        showSymbol: points.length <= 20,
        lineStyle: { color: colors.accent, width: 2 },
        itemStyle: { color: colors.accent },
        areaStyle: { color: colors.accent, opacity: 0.1 },
        markLine:
          opts.targetLine != null
            ? {
                silent: true,
                symbol: "none",
                lineStyle: { color: colors.muted, type: "dashed" },
                data: [{ yAxis: opts.targetLine }],
              }
            : undefined,
      },
    ],
  };
}
