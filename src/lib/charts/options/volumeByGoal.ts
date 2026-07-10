import type { EChartsOption } from "echarts";
import type { TrendColors } from "./activityTrend";

export interface GoalVolume {
  name: string;
  progress: number;
  target: number;
}

/** Horizontal bars of progress per goal for the current period, with the
 *  target rendered as a faint background track. */
export function volumeByGoalOption(rows: GoalVolume[], colors: TrendColors): EChartsOption {
  const ordered = [...rows].reverse(); // ECharts category axis renders bottom-up
  return {
    grid: { top: 10, right: 16, bottom: 24, left: 96 },
    tooltip: {
      trigger: "axis",
      axisPointer: { type: "shadow" },
      backgroundColor: colors.surface,
      borderColor: colors.border,
      textStyle: { color: colors.text },
      formatter: (params: unknown) => {
        const list = params as Array<{ name: string; value: number; seriesName: string }>;
        if (!list.length) return "";
        const progress = list.find((l) => l.seriesName === "Progress");
        const row = ordered.find((r) => r.name === list[0].name);
        return `${list[0].name}<br/><strong>${progress?.value ?? 0}</strong>${row && row.target > 0 ? ` / ${row.target}` : ""}`;
      },
    },
    xAxis: {
      type: "value",
      axisLabel: { color: colors.muted },
      splitLine: { lineStyle: { color: colors.grid } },
    },
    yAxis: {
      type: "category",
      data: ordered.map((r) => r.name),
      axisLine: { lineStyle: { color: colors.border } },
      axisLabel: { color: colors.muted, formatter: (v: string) => (v.length > 12 ? `${v.slice(0, 11)}…` : v) },
    },
    series: [
      {
        name: "Target",
        type: "bar",
        barGap: "-100%",
        data: ordered.map((r) => Math.max(r.target, r.progress)),
        itemStyle: { color: colors.grid, borderRadius: 4 },
        silent: true,
        z: 1,
      },
      {
        name: "Progress",
        type: "bar",
        data: ordered.map((r) => r.progress),
        itemStyle: { color: colors.accent, borderRadius: 4 },
        barMaxWidth: 16,
        z: 2,
      },
    ],
  };
}
