import type { EChartsOption } from "echarts";
import type { TrendColors } from "./activityTrend";
import type { TagWeeklySeries } from "@/lib/domain/tags";

/** One line per tag: entries logged under it each week. */
export function tagTrendOption(
  data: TagWeeklySeries,
  palette: string[],
  colors: TrendColors,
): EChartsOption {
  return {
    grid: { top: 30, right: 14, bottom: 28, left: 36 },
    legend: {
      top: 0,
      textStyle: { color: colors.muted },
      inactiveColor: colors.border,
    },
    tooltip: {
      trigger: "axis",
      backgroundColor: colors.surface,
      borderColor: colors.border,
      textStyle: { color: colors.text },
      formatter: (params: unknown) => {
        const list = params as Array<{ seriesName: string; value: number; marker: string }>;
        if (!list.length) return "";
        const rows = list
          .filter((p) => p.value > 0)
          .map((p) => `${p.marker}${p.seriesName} <strong>${p.value}</strong>`)
          .join("<br/>");
        return `Week of ${(list[0] as unknown as { name: string }).name}<br/>${rows || "nothing logged"}`;
      },
    },
    xAxis: {
      type: "category",
      data: data.weekKeys,
      axisLine: { lineStyle: { color: colors.border } },
      axisLabel: {
        color: colors.muted,
        interval: Math.max(Math.floor(data.weekKeys.length / 6) - 1, 0),
        formatter: (v: string) => String(v).slice(5),
      },
    },
    yAxis: {
      type: "value",
      min: 0,
      minInterval: 1,
      axisLabel: { color: colors.muted },
      splitLine: { lineStyle: { color: colors.grid } },
    },
    series: data.series.map((s, i) => ({
      type: "line",
      name: s.tag,
      data: s.counts,
      smooth: true,
      showSymbol: data.weekKeys.length <= 14,
      lineStyle: { color: palette[i % palette.length], width: 2 },
      itemStyle: { color: palette[i % palette.length] },
    })),
  };
}
