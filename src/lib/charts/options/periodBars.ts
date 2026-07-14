import type { EChartsOption } from "echarts";
import { formatAmount } from "@/lib/domain/format";

export interface PeriodBarPoint {
  /** week-start dateKey or first-of-month dateKey */
  startKey: string;
  total: number;
  /** effective target for this bucket; 0/absent = no target */
  target: number;
}

export interface PeriodBarsColors {
  accent: string;
  target: string;
  text: string;
  muted: string;
  grid: string;
  surface: string;
  border: string;
}

const MONTH_LABELS = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];

function bucketLabel(startKey: string, granularity: "week" | "month"): string {
  if (granularity === "month") return MONTH_LABELS[Number(startKey.slice(5, 7)) - 1] ?? startKey;
  return startKey.slice(5); // MM-DD of the week start
}

/**
 * Year view "By week" / "By month": one bar per bucket total, hit buckets at
 * full strength, plus a dashed step line at each bucket's effective target
 * (custom grids / overrides make it vary).
 */
export function periodBarsOption(
  points: PeriodBarPoint[],
  granularity: "week" | "month",
  unit: string,
  colors: PeriodBarsColors,
): EChartsOption {
  const hasTarget = points.some((p) => p.target > 0);
  const maxTarget = Math.max(0, ...points.map((p) => p.target));
  const noun = granularity === "month" ? "" : "Week of ";
  return {
    grid: { top: 20, right: 14, bottom: 28, left: 40 },
    tooltip: {
      trigger: "axis",
      backgroundColor: colors.surface,
      borderColor: colors.border,
      textStyle: { color: colors.text },
      formatter: (params: unknown) => {
        const list = params as Array<{ dataIndex: number }>;
        if (!list.length) return "";
        const p = points[list[0].dataIndex];
        if (!p) return "";
        const label = granularity === "month" ? p.startKey.slice(0, 7) : `${noun}${p.startKey}`;
        const targetPart = p.target > 0 ? ` / ${formatAmount(p.target)}` : "";
        return `${label}<br/><strong>${formatAmount(p.total)}${targetPart}</strong> ${unit}`;
      },
    },
    xAxis: {
      type: "category",
      data: points.map((p) => bucketLabel(p.startKey, granularity)),
      axisLine: { lineStyle: { color: colors.border } },
      axisLabel: {
        color: colors.muted,
        interval: granularity === "month" ? 0 : Math.max(Math.floor(points.length / 8) - 1, 0),
      },
    },
    yAxis: {
      type: "value",
      // Keep the target line on-screen even when every bar falls short.
      max: maxTarget > 0 ? (value: { max: number }) => Math.max(value.max, maxTarget) : undefined,
      axisLabel: { color: colors.muted },
      splitLine: { lineStyle: { color: colors.grid } },
    },
    series: [
      {
        type: "bar",
        data: points.map((p) => ({
          value: p.total,
          itemStyle: {
            color: colors.accent,
            opacity: p.target > 0 && p.total < p.target ? 0.4 : 1,
            borderRadius: [4, 4, 0, 0],
          },
        })),
        barMaxWidth: granularity === "month" ? 34 : 16,
      },
      ...(hasTarget
        ? [
            {
              type: "line" as const,
              step: "middle" as const,
              data: points.map((p) => (p.target > 0 ? p.target : null)),
              showSymbol: false,
              lineStyle: { color: colors.target, type: "dashed" as const, width: 1.5 },
              itemStyle: { color: colors.target },
              tooltip: { show: false },
            },
          ]
        : []),
    ],
  };
}
