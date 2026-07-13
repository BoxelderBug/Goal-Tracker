import type { EChartsOption } from "echarts";

export interface HeatmapColors {
  accent: string;
  text: string;
  muted: string;
  surface: string;
  border: string;
}

/** Parse "#rrggbb" or "rgb(r, g, b)" into channels; null for anything else. */
function parseColor(c: string): [number, number, number] | null {
  const hex = /^#([0-9a-f]{6})$/i.exec(c.trim());
  if (hex) {
    const h = hex[1];
    return [parseInt(h.slice(0, 2), 16), parseInt(h.slice(2, 4), 16), parseInt(h.slice(4, 6), 16)];
  }
  const rgb = /^rgba?\(\s*(\d+)\s*,\s*(\d+)\s*,\s*(\d+)/i.exec(c.trim());
  if (rgb) return [Number(rgb[1]), Number(rgb[2]), Number(rgb[3])];
  return null;
}

/** Linear mix of two colors (t=0 → a, t=1 → b). Enough for a two-step
 *  sequential ramp; hue is constant so the light→dark rule holds. */
function lerpHex(a: string, b: string, t: number): string {
  const ca = parseColor(a);
  const cb = parseColor(b);
  if (!ca || !cb) return b;
  const mix = (i: number) => Math.round(ca[i] + (cb[i] - ca[i]) * t).toString(16).padStart(2, "0");
  return `#${mix(0)}${mix(1)}${mix(2)}`;
}

/**
 * Calendar heatmap of entries-per-day (count, not amount — counts are safe
 * across mixed goal units). Sequential ramp: surface-tinted accent → accent,
 * one hue, light→dark; zero days stay near-surface so gaps read as gaps.
 */
export function activityHeatmapOption(
  data: [string, number][],
  range: [string, string],
  maxCount: number,
  colors: HeatmapColors,
): EChartsOption {
  return {
    tooltip: {
      backgroundColor: colors.surface,
      borderColor: colors.border,
      textStyle: { color: colors.text },
      formatter: (params: unknown) => {
        const v = (params as { value: [string, number] }).value;
        return `${v[0]}<br/><strong>${v[1]} ${v[1] === 1 ? "entry" : "entries"}</strong>`;
      },
    },
    visualMap: {
      show: false,
      min: 0,
      max: Math.max(maxCount, 1),
      inRange: { color: [lerpHex(colors.accent, colors.surface, 0.92), colors.accent] },
    },
    calendar: {
      range,
      cellSize: ["auto", 14],
      left: 28,
      right: 8,
      top: 24,
      bottom: 4,
      splitLine: { show: false },
      // transparent base — callers emit every day (zeros included) so the
      // sequential ramp paints all cells and no theme-hostile default shows
      itemStyle: { color: "transparent", borderColor: colors.surface, borderWidth: 2, borderRadius: 3 },
      dayLabel: { color: colors.muted, firstDay: 1, nameMap: ["S", "M", "T", "W", "T", "F", "S"] },
      monthLabel: { color: colors.muted },
      yearLabel: { show: false },
    },
    series: [
      {
        type: "heatmap",
        coordinateSystem: "calendar",
        data,
        emphasis: { itemStyle: { borderColor: colors.text, borderWidth: 1 } },
      },
    ],
  };
}
