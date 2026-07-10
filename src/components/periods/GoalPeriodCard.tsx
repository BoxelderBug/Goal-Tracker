"use client";

import { useMemo, useState } from "react";
import type { Goal, PeriodKind } from "@/types/models";
import type { DailyTotals } from "@/lib/domain/progress";
import type { DateRange } from "@/lib/domain/dates";
import { computePace, getCumulativeSeries, paceTone, sumRange } from "@/lib/domain/progress";
import { getTargetForPeriod } from "@/lib/domain/targets";
import { formatAmount } from "@/lib/domain/format";
import type { WeekStart } from "@/types/models";
import { Card } from "@/components/ui/Card";
import { Badge } from "@/components/ui/Badge";
import { Button } from "@/components/ui/Button";
import { ProgressBar } from "@/components/ui/ProgressBar";
import { EChart, themeColor } from "@/components/charts/EChart";
import { cumulativeScrubOption } from "@/lib/charts/options/cumulativeScrub";

const TONE_LABEL: Record<"hit" | "onpace" | "behind" | "missed", string> = {
  hit: "Goal hit",
  onpace: "On pace",
  behind: "Behind",
  missed: "Off pace",
};

export function GoalPeriodCard({
  goal,
  totals,
  period,
  range,
  weekStart,
  now,
}: {
  goal: Goal;
  totals: DailyTotals;
  period: PeriodKind;
  range: DateRange;
  weekStart: WeekStart;
  now: Date;
}) {
  const [open, setOpen] = useState(false);

  const { progress, target, pace, tone } = useMemo(() => {
    const progress = sumRange(totals, goal.id, range);
    const target = getTargetForPeriod(goal, period, range, { weekStart });
    const pace = computePace(progress, target, range, now);
    return { progress, target, pace, tone: paceTone(pace) };
  }, [totals, goal, period, range, weekStart, now]);

  const chartOption = useMemo(() => {
    if (!open) return null;
    const points = getCumulativeSeries(totals, goal.id, range, now);
    return cumulativeScrubOption(points, target, goal.unit, {
      accent: themeColor("--accent", "#009f94"),
      projected: themeColor("--muted", "#888"),
      target: themeColor("--tone-behind", "#be7f24"),
      text: themeColor("--text", "#222"),
      muted: themeColor("--muted", "#888"),
      grid: themeColor("--border", "#ddd"),
      surface: themeColor("--surface", "#fff"),
      border: themeColor("--border", "#ddd"),
    });
  }, [open, totals, goal.id, goal.unit, range, now, target]);

  return (
    <Card className="flex flex-col gap-3">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <div className="flex items-center gap-2">
          <span className="font-medium">{goal.name}</span>
          <Badge tone={tone}>{TONE_LABEL[tone]}</Badge>
        </div>
        <span className="text-sm text-muted">
          {formatAmount(progress)}
          {target > 0 ? ` / ${formatAmount(target)}` : ""} {goal.unit}
        </span>
      </div>
      <ProgressBar percent={pace.completion} tone={tone} />
      <div className="flex items-center justify-between text-xs text-muted">
        <span>
          {target > 0 ? `${pace.completion}% · ` : ""}
          projected {formatAmount(pace.projected)} {goal.unit}
        </span>
        <Button size="sm" variant="ghost" onClick={() => setOpen((v) => !v)} aria-expanded={open}>
          {open ? "Hide graph" : "Graph"}
        </Button>
      </div>
      {open && chartOption ? <EChart option={chartOption} height={220} /> : null}
    </Card>
  );
}
