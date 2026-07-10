import type { EChartsOption } from "echarts";

export interface TrendColors {
  accent: string;
  text: string;
  muted: string;
  grid: string;
  surface: string;
  border: string;
}

export interface TrendPoint {
  date: string;
  value: number;
}

/** 30-day activity: entries logged per day (rounded 4px bar ends, hover total). */
export function activityTrendOption(points: TrendPoint[], colors: TrendColors): EChartsOption {
  return {
    grid: { top: 20, right: 12, bottom: 28, left: 32 },
    tooltip: {
      trigger: "axis",
      axisPointer: { type: "shadow" },
      backgroundColor: colors.surface,
      borderColor: colors.border,
      textStyle: { color: colors.text },
      formatter: (params: unknown) => {
        const list = params as Array<{ name: string; value: number }>;
        if (!list.length) return "";
        return `${list[0].name}<br/><strong>${list[0].value} ${list[0].value === 1 ? "entry" : "entries"}</strong>`;
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
      minInterval: 1,
      axisLabel: { color: colors.muted },
      splitLine: { lineStyle: { color: colors.grid } },
    },
    series: [
      {
        type: "bar",
        data: points.map((p) => p.value),
        itemStyle: { color: colors.accent, borderRadius: [4, 4, 0, 0] },
        barMaxWidth: 18,
      },
    ],
  };
}
