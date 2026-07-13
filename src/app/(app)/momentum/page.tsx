"use client";

import { useMemo, useState } from "react";
import { useSettings, useUserData } from "@/components/data/UserDataProvider";
import { computeMomentumGrid } from "@/lib/domain/momentum";
import { Card, CardTitle } from "@/components/ui/Card";
import { Button } from "@/components/ui/Button";
import { EmptyState } from "@/components/ui/EmptyState";
import { EChart, themeColor } from "@/components/charts/EChart";
import { momentum3DOption } from "@/lib/charts/options/momentum3d";

const WINDOWS = [8, 12, 26] as const;

export default function MomentumPage() {
  const { goals, entries } = useUserData();
  const settings = useSettings();
  const now = useMemo(() => new Date(), []);
  const [weeks, setWeeks] = useState<(typeof WINDOWS)[number]>(12);

  const grid = useMemo(
    () => computeMomentumGrid(goals, entries, weeks, settings.weekStart, now),
    [goals, entries, weeks, settings.weekStart, now],
  );

  const option = useMemo(
    () =>
      momentum3DOption(grid, "% of weekly target", {
        accent: themeColor("--accent", "#009f94"),
        accentStrong: themeColor("--accent-strong", "#007a71"),
        text: themeColor("--text", "#222"),
        muted: themeColor("--muted", "#888"),
        surface: themeColor("--surface", "#fff"),
        border: themeColor("--border", "#ddd"),
      }),
    [grid],
  );

  const hasData = grid.cells.length > 0;

  return (
    <div className="flex flex-col gap-4">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h1 className="font-display text-2xl">Momentum</h1>
          <p className="text-sm text-muted">Each goal&apos;s weekly target completion over time — drag to rotate.</p>
        </div>
        <div className="flex items-center gap-1">
          {WINDOWS.map((w) => (
            <Button key={w} size="sm" variant={weeks === w ? "primary" : "default"} onClick={() => setWeeks(w)}>
              {w}w
            </Button>
          ))}
        </div>
      </div>

      {!hasData ? (
        <EmptyState>No momentum yet — add goals with weekly targets and log some entries.</EmptyState>
      ) : (
        <Card>
          <CardTitle>Goal × week × completion · last {weeks} weeks</CardTitle>
          <EChart option={option} height={420} gl />
        </Card>
      )}
    </div>
  );
}
