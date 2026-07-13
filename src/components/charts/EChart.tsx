"use client";

import { useEffect, useRef } from "react";
import type { EChartsOption, EChartsType } from "echarts";

/**
 * The single chart wrapper. ECharts is dynamically imported so it stays out of
 * the initial bundle; the instance is disposed on unmount and resized with a
 * ResizeObserver. Options are pure (built by lib/charts/options/*) and rebuilt
 * whenever `option` changes.
 */
export function EChart({
  option,
  height = 280,
  className,
  onReady,
  gl = false,
}: {
  option: EChartsOption;
  height?: number;
  className?: string;
  onReady?: (chart: EChartsType) => void;
  /** also load echarts-gl so 3D series (bar3D/surface) register. Off by default
   *  so the heavy WebGL bundle only loads on pages that opt in. */
  gl?: boolean;
}) {
  const containerRef = useRef<HTMLDivElement>(null);
  const chartRef = useRef<EChartsType | null>(null);

  useEffect(() => {
    let disposed = false;
    let observer: ResizeObserver | undefined;

    (async () => {
      try {
        const echarts = await import("echarts");
        // echarts-gl (3D) registers onto the echarts singleton at import; keep
        // it here so a load/registration failure degrades to an empty chart
        // rather than an unhandled rejection.
        if (gl) await import("echarts-gl");
        if (disposed || !containerRef.current) return;
        const chart = echarts.init(containerRef.current, undefined, { renderer: "canvas" });
        chartRef.current = chart;
        chart.setOption(option);
        onReady?.(chart);
        observer = new ResizeObserver(() => chart.resize());
        observer.observe(containerRef.current);
      } catch (err) {
        if (!disposed) console.error("Chart failed to initialize", err);
      }
    })();

    return () => {
      disposed = true;
      observer?.disconnect();
      chartRef.current?.dispose();
      chartRef.current = null;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // Push option updates to an already-initialized chart.
  useEffect(() => {
    chartRef.current?.setOption(option, { notMerge: true });
  }, [option]);

  return <div ref={containerRef} className={className} style={{ height, width: "100%" }} />;
}

/** Read a theme token from CSS custom properties (charts follow the theme). */
export function themeColor(name: string, fallback = "#888"): string {
  if (typeof window === "undefined") return fallback;
  const value = getComputedStyle(document.documentElement).getPropertyValue(name).trim();
  return value || fallback;
}

/**
 * Resolve any CSS color expression (e.g. the dark theme's color-mix tokens) to
 * a concrete rgb()/hex string via a probe element. Needed wherever ECharts must
 * numerically interpolate colors (visualMap ramps) — zrender can't parse
 * color-mix, even though canvas fillStyle can.
 */
export function resolveThemeColor(name: string, fallback = "#888"): string {
  const raw = themeColor(name, fallback);
  if (typeof window === "undefined" || raw.startsWith("#") || raw.startsWith("rgb")) return raw;
  const probe = document.createElement("span");
  probe.style.color = raw;
  document.body.appendChild(probe);
  const resolved = getComputedStyle(probe).color;
  probe.remove();
  return resolved || fallback;
}
