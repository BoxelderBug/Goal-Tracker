import type { EChartsOption } from "echarts";
import type { MomentumGrid } from "@/lib/domain/momentum";

export interface MomentumColors {
  accent: string;
  accentStrong: string;
  text: string;
  muted: string;
  surface: string;
  border: string;
}

/**
 * A goal × week × completion% bar landscape (echarts-gl `bar3D`). Taller/brighter
 * bars = more of that week's target met, so the surface reads as momentum over
 * time per goal. Returned as EChartsOption via cast — the 3D component types
 * (xAxis3D/zAxis3D/bar3D) are contributed at runtime by echarts-gl, not the base
 * echarts typings.
 */
export function momentum3DOption(grid: MomentumGrid, unit: string, colors: MomentumColors): EChartsOption {
  const weekLabels = grid.weekKeys.map((k) => k.slice(5)); // MM-DD
  const goalLabels = grid.goals.map((g) => g.name);
  const axisCommon = {
    axisLine: { lineStyle: { color: colors.border } },
    axisLabel: { color: colors.muted },
    nameTextStyle: { color: colors.muted },
    splitLine: { lineStyle: { color: colors.border } },
  };

  const option = {
    tooltip: {
      backgroundColor: colors.surface,
      borderColor: colors.border,
      textStyle: { color: colors.text },
      formatter: (params: { value?: [number, number, number] }) => {
        const v = params.value;
        if (!v) return "";
        const [wi, gi, pct] = v;
        return `${goalLabels[gi]}<br/>${grid.weekKeys[wi]}<br/><strong>${pct}%</strong> of target${unit ? ` (${unit})` : ""}`;
      },
    },
    visualMap: {
      show: false,
      min: 0,
      max: Math.max(100, grid.maxValue),
      dimension: 2,
      inRange: { color: [colors.muted, colors.accent, colors.accentStrong] },
    },
    xAxis3D: { type: "category", data: weekLabels, name: "Week", ...axisCommon },
    yAxis3D: { type: "category", data: goalLabels, name: "Goal", ...axisCommon },
    zAxis3D: { type: "value", name: "% target", min: 0, max: Math.max(100, grid.maxValue), ...axisCommon },
    grid3D: {
      boxWidth: 100,
      boxDepth: Math.max(30, Math.min(100, goalLabels.length * 18)),
      axisPointer: { lineStyle: { color: colors.muted } },
      light: {
        main: { intensity: 1.1, shadow: true },
        ambient: { intensity: 0.3 },
      },
      viewControl: { autoRotate: false, distance: 200, alpha: 20, beta: 40 },
    },
    series: [
      {
        type: "bar3D",
        data: grid.cells,
        shading: "lambert",
        bevelSize: 0.2,
        emphasis: { label: { show: false } },
        label: { show: false },
      },
    ],
  };

  return option as unknown as EChartsOption;
}
