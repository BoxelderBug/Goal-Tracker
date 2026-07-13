import type { EChartsOption } from "echarts";
import type { CumulativePoint } from "@/lib/domain/progress";
import { formatAmount } from "@/lib/domain/format";

export interface ScrubColors {
  accent: string;
  projected: string;
  /** area fill under the dashed projection segment (transparent white) */
  projectedFill: string;
  target: string;
  text: string;
  muted: string;
  grid: string;
  surface: string;
  border: string;
}

/**
 * Cumulative line with a solid "actual" segment and a dashed "projected"
 * segment that share a boundary point at today, so scrubbing (ECharts axis
 * tooltip + crosshair) reads the running total on the actual side and the
 * projected total on the future side without a seam. A target markLine shows
 * the goal line for the period.
 */
export function cumulativeScrubOption(
  points: CumulativePoint[],
  target: number,
  unit: string,
  colors: ScrubColors,
  pinnedIndex: number | null = null,
): EChartsOption {
  const dates = points.map((p) => p.date);
  const firstProjectedIndex = points.findIndex((p) => p.projected);
  const boundaryIndex = firstProjectedIndex === -1 ? points.length - 1 : firstProjectedIndex - 1;

  const pinned =
    pinnedIndex !== null && pinnedIndex >= 0 && pinnedIndex < points.length ? points[pinnedIndex] : null;
  const pinnedValue = pinned ? (pinned.projected ? pinned.projectedCumulative ?? 0 : pinned.cumulative) : 0;

  const actualData = points.map((p) => (p.projected ? null : p.cumulative));
  const projectedData = points.map((p, i) => {
    if (p.projected) return p.projectedCumulative;
    if (i === boundaryIndex) return p.cumulative; // anchor the dashed line to the last actual point
    return null;
  });

  const unitSuffix = unit ? ` ${unit}` : "";

  return {
    grid: { top: 24, right: 16, bottom: 28, left: 40 },
    tooltip: {
      trigger: "axis",
      axisPointer: { type: "line", snap: true, lineStyle: { color: colors.muted } },
      backgroundColor: colors.surface,
      borderColor: colors.border,
      textStyle: { color: colors.text },
      formatter: (params: unknown) => {
        const list = params as Array<{ dataIndex: number }>;
        if (!list.length) return "";
        const idx = list[0].dataIndex;
        const point = points[idx];
        const value = point.projected ? point.projectedCumulative ?? 0 : point.cumulative;
        const label = point.projected ? "Projected total" : "Total";
        return `${point.date}<br/><strong>${label}: ${formatAmount(value)}${unitSuffix}</strong>`;
      },
    },
    xAxis: {
      type: "category",
      data: dates,
      boundaryGap: false,
      axisLine: { lineStyle: { color: colors.border } },
      axisLabel: { color: colors.muted, formatter: (v: string) => String(v).slice(5) },
    },
    yAxis: {
      type: "value",
      // Keep the target line on-screen even when actual + projection stay below
      // it (i.e. when behind pace), so the goal you're aiming for is always shown.
      max: target > 0 ? (value: { max: number }) => Math.max(value.max, target) : undefined,
      axisLabel: { color: colors.muted },
      splitLine: { lineStyle: { color: colors.grid } },
    },
    series: [
      {
        name: "Actual",
        type: "line",
        data: actualData,
        smooth: false,
        symbol: "circle",
        symbolSize: 7,
        showSymbol: false,
        // keep both segments fully drawn while scrubbing (no hover blur/fade)
        emphasis: { disabled: true },
        lineStyle: { width: 2, color: colors.accent },
        itemStyle: { color: colors.accent },
        areaStyle: { color: colors.accent, opacity: 0.08 },
        markLine:
          target > 0
            ? {
                symbol: "none",
                data: [{ yAxis: target }],
                lineStyle: { color: colors.target, type: "dashed", width: 1.5 },
                label: { formatter: `Target ${formatAmount(target)}`, color: colors.muted, position: "insideEndTop" },
              }
            : undefined,
        // Frozen marker at the clicked point (see GoalPeriodCard pin).
        markPoint: pinned
          ? {
              symbol: "circle",
              symbolSize: 9,
              data: [{ name: pinned.date, coord: [dates[pinnedIndex as number], pinnedValue] as [string, number] }],
              itemStyle: { color: pinned.projected ? colors.projected : colors.accent, borderColor: colors.surface, borderWidth: 2 },
              label: { show: false },
            }
          : undefined,
      },
      {
        name: "Projected",
        type: "line",
        data: projectedData,
        smooth: false,
        showSymbol: false,
        connectNulls: true,
        emphasis: { disabled: true },
        lineStyle: { width: 2, color: colors.projected, type: "dashed" },
        itemStyle: { color: colors.projected },
        // Transparent-white fill under the projection, mirroring the teal fill
        // beneath the actual line.
        areaStyle: { color: colors.projectedFill, opacity: 0.08 },
      },
    ],
  };
}
