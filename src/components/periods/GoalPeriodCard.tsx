"use client";

import { useMemo, useState } from "react";
import type { Goal, PeriodKind, Vacation } from "@/types/models";
import type { DailyTotals } from "@/lib/domain/progress";
import type { DateRange } from "@/lib/domain/dates";
import { computePace, getCumulativeSeries, paceTone, sumRange } from "@/lib/domain/progress";
import { getTargetForPeriod, type PeriodGoalOverrides } from "@/lib/domain/targets";
import { formatAmount } from "@/lib/domain/format";
import type { WeekStart } from "@/types/models";
import { STRETCH_GOALS, deleteMetaValue, setMetaValue } from "@/lib/firebase/repos/meta";
import { Card } from "@/components/ui/Card";
import { Badge } from "@/components/ui/Badge";
import { Button } from "@/components/ui/Button";
import { Input } from "@/components/ui/Input";
import { ProgressBar } from "@/components/ui/ProgressBar";
import { toast } from "@/components/ui/Toaster";
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
  overrides,
  vacations,
  uid,
  stretchKey,
  stretchTarget,
  now,
}: {
  goal: Goal;
  totals: DailyTotals;
  period: PeriodKind;
  range: DateRange;
  weekStart: WeekStart;
  overrides?: PeriodGoalOverrides;
  vacations?: Vacation[];
  uid: string;
  /** meta/stretchGoals key for this goal+period, or null when unavailable (quarter) */
  stretchKey: string | null;
  stretchTarget?: number;
  now: Date;
}) {
  const [open, setOpen] = useState(false);
  const [stretchEditing, setStretchEditing] = useState(false);
  const [stretchInput, setStretchInput] = useState("");
  const [stretchSaving, setStretchSaving] = useState(false);

  const { progress, target, pace, tone } = useMemo(() => {
    const progress = sumRange(totals, goal.id, range);
    const target = getTargetForPeriod(goal, period, range, { weekStart, overrides, vacations });
    const pace = computePace(progress, target, range, now);
    return { progress, target, pace, tone: paceTone(pace) };
  }, [totals, goal, period, range, weekStart, overrides, vacations, now]);

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

  const stretchHit = stretchTarget !== undefined && stretchTarget > 0 && progress >= stretchTarget;

  function openStretchEditor() {
    setStretchInput(stretchTarget !== undefined ? String(stretchTarget) : "");
    setStretchEditing(true);
  }

  async function saveStretch() {
    if (!stretchKey) return;
    const value = Number(stretchInput);
    if (!(value > 0)) {
      toast.error("Enter a stretch target above 0");
      return;
    }
    setStretchSaving(true);
    try {
      await setMetaValue(uid, STRETCH_GOALS, stretchKey, value);
      setStretchEditing(false);
    } catch {
      toast.error("Could not save stretch goal");
    } finally {
      setStretchSaving(false);
    }
  }

  async function clearStretch() {
    if (!stretchKey) return;
    setStretchSaving(true);
    try {
      await deleteMetaValue(uid, STRETCH_GOALS, stretchKey);
      setStretchEditing(false);
    } catch {
      toast.error("Could not clear stretch goal");
    } finally {
      setStretchSaving(false);
    }
  }

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
      <ProgressBar
        percent={pace.completion}
        tone={tone}
        projectedPercent={target > 0 ? (pace.projected / target) * 100 : undefined}
      />
      <div className="flex items-center justify-between text-xs text-muted">
        <span>
          {target > 0 ? `${pace.completion}% · ` : ""}
          projected {formatAmount(pace.projected)} {goal.unit}
        </span>
        <div className="flex items-center gap-1">
          {stretchKey ? (
            <Button size="sm" variant="ghost" onClick={stretchEditing ? () => setStretchEditing(false) : openStretchEditor} aria-expanded={stretchEditing}>
              {stretchTarget !== undefined ? "Edit stretch" : "Stretch"}
            </Button>
          ) : null}
          <Button size="sm" variant="ghost" onClick={() => setOpen((v) => !v)} aria-expanded={open}>
            {open ? "Hide graph" : "Graph"}
          </Button>
        </div>
      </div>

      {stretchTarget !== undefined && !stretchEditing ? (
        <div className="flex items-center justify-between rounded-lg bg-bg-soft px-3 py-1.5 text-xs">
          <span className="text-muted">
            Stretch: {formatAmount(progress)} / {formatAmount(stretchTarget)} {goal.unit}
          </span>
          {stretchHit ? <Badge tone="hit">Stretch hit</Badge> : null}
        </div>
      ) : null}

      {stretchEditing ? (
        <div className="flex flex-wrap items-center gap-2 rounded-lg bg-bg-soft px-3 py-2">
          <span className="text-xs text-muted">Stretch target</span>
          <Input
            type="number" min={0} step="any" inputMode="decimal"
            className="w-24 py-1"
            value={stretchInput}
            onChange={(e) => setStretchInput(e.target.value)}
            onKeyDown={(e) => { if (e.key === "Enter") saveStretch(); }}
            aria-label={`Stretch target for ${goal.name}`}
            autoFocus
          />
          <span className="text-xs text-muted">{goal.unit}</span>
          <div className="ml-auto flex gap-1">
            {stretchTarget !== undefined ? (
              <Button size="sm" variant="ghost" onClick={clearStretch} disabled={stretchSaving}>Clear</Button>
            ) : null}
            <Button size="sm" variant="primary" onClick={saveStretch} disabled={stretchSaving}>Save</Button>
          </div>
        </div>
      ) : null}

      {open && chartOption ? <EChart option={chartOption} height={220} /> : null}
    </Card>
  );
}
