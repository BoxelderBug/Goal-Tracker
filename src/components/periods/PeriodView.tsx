"use client";

import { useMemo, useState } from "react";
import type { KeyedValueMapDoc, PeriodKind, TempPeriodGoal, Vacation } from "@/types/models";
import { useSettings, useUserData } from "@/components/data/UserDataProvider";
import { addDays, addMonths, addYears, getDateKey, normalizeDate } from "@/lib/domain/dates";
import { getPeriodKey, getPeriodRange } from "@/lib/domain/periods";
import { buildDailyTotals, computePace, sumRange } from "@/lib/domain/progress";
import { getTargetForPeriod, overrideKey, overridesFromFlatMap } from "@/lib/domain/targets";
import { formatAmount } from "@/lib/domain/format";
import { closeOutPeriod } from "@/lib/firebase/actions/snapshot";
import { tempPeriodGoalsRepo, vacationsRepo } from "@/lib/firebase/repos";
import { PERIOD_GOAL_OVERRIDES, STRETCH_GOALS, metaRef } from "@/lib/firebase/repos/meta";
import { useCollection } from "@/hooks/useCollection";
import { useDoc } from "@/hooks/useDoc";
import { Button } from "@/components/ui/Button";
import { Card } from "@/components/ui/Card";
import { Select } from "@/components/ui/Input";
import { EmptyState } from "@/components/ui/EmptyState";
import { useConfirm } from "@/components/ui/ConfirmDialog";
import { toast } from "@/components/ui/Toaster";
import { GoalPeriodCard } from "./GoalPeriodCard";
import { ViewSettingsModal } from "./ViewSettingsModal";

const TITLES: Record<PeriodKind, string> = {
  week: "Week",
  month: "Month",
  quarter: "Quarter",
  year: "Year",
};

const MONTH_NAMES = [
  "January", "February", "March", "April", "May", "June",
  "July", "August", "September", "October", "November", "December",
];

function shiftAnchor(anchor: Date, period: PeriodKind, dir: number): Date {
  if (period === "week") return addDays(anchor, 7 * dir);
  if (period === "month") return addMonths(anchor, dir);
  if (period === "quarter") return addMonths(anchor, 3 * dir);
  return addYears(anchor, dir);
}

function periodDisplayName(period: PeriodKind, start: Date): string {
  if (period === "month") return `${MONTH_NAMES[start.getMonth()]} ${start.getFullYear()}`;
  if (period === "year") return String(start.getFullYear());
  if (period === "quarter") return `Q${Math.floor(start.getMonth() / 3) + 1} ${start.getFullYear()}`;
  return `Week of ${getDateKey(start)}`;
}

export function PeriodView({ period }: { period: PeriodKind }) {
  const { uid, goals, entries } = useUserData();
  const settings = useSettings();
  const confirm = useConfirm();
  const now = useMemo(() => new Date(), []);
  const [anchor, setAnchor] = useState(() => normalizeDate(new Date()));
  const [statusFilter, setStatusFilter] = useState<"active" | "all">("active");
  const [tagFilter, setTagFilter] = useState("all");
  const [closing, setClosing] = useState(false);
  const [settingsOpen, setSettingsOpen] = useState(false);

  // Period adjustments (only needed on period views, so subscribed here).
  const vacations = useCollection<Vacation>(() => vacationsRepo.query(uid), [uid]);
  const tempGoals = useCollection<TempPeriodGoal>(() => tempPeriodGoalsRepo.query(uid), [uid]);
  const overridesDoc = useDoc<KeyedValueMapDoc>(() => metaRef(uid, PERIOD_GOAL_OVERRIDES), [uid]);
  const stretchDoc = useDoc<KeyedValueMapDoc>(() => metaRef(uid, STRETCH_GOALS), [uid]);

  const range = useMemo(
    () => getPeriodRange(period, anchor, settings.weekStart),
    [period, anchor, settings.weekStart],
  );
  const totals = useMemo(() => buildDailyTotals(entries), [entries]);

  // quarter has no per-period key in legacy (no overrides / temp goals).
  const periodKey = period === "quarter" ? null : getPeriodKey(period, range);
  const periodName = periodDisplayName(period, range.start);
  const overridesFlat = useMemo(() => overridesDoc.data?.values ?? {}, [overridesDoc.data]);
  const stretchFlat = useMemo(() => stretchDoc.data?.values ?? {}, [stretchDoc.data]);

  const targetContext = useMemo(
    () => ({
      weekStart: settings.weekStart,
      overrides: overridesFromFlatMap(overridesFlat),
      vacations: vacations.data,
    }),
    [settings.weekStart, overridesFlat, vacations.data],
  );

  const periodTempGoals = useMemo(
    () => (periodKey ? tempGoals.data.filter((t) => t.periodKey === periodKey) : []),
    [tempGoals.data, periodKey],
  );

  const allTags = useMemo(() => {
    const set = new Set<string>();
    goals.forEach((g) => g.tags.forEach((t) => set.add(t)));
    return Array.from(set).sort();
  }, [goals]);

  const visibleGoals = useMemo(
    () =>
      goals.filter((g) => {
        if (statusFilter === "active" && g.archived) return false;
        if (tagFilter !== "all" && !g.tags.includes(tagFilter)) return false;
        return true;
      }),
    [goals, statusFilter, tagFilter],
  );

  const summary = useMemo(() => {
    let totalProgress = 0;
    let totalTarget = 0;
    let hitCount = 0;
    for (const goal of visibleGoals) {
      const progress = sumRange(totals, goal.id, range);
      const target = getTargetForPeriod(goal, period, range, targetContext);
      totalProgress += progress;
      totalTarget += target;
      if (computePace(progress, target, range, now).goalHit) hitCount += 1;
    }
    const completion = totalTarget > 0 ? Math.round((totalProgress / totalTarget) * 100) : 0;
    return { totalProgress, totalTarget, hitCount, completion };
  }, [visibleGoals, totals, range, period, targetContext, now]);

  const rangeLabel = `${getDateKey(range.start)} → ${getDateKey(range.end)}`;

  async function handleCloseOut() {
    const ok = await confirm({
      message: `Close out this ${period} for ${visibleGoals.length} goal${visibleGoals.length === 1 ? "" : "s"}? This saves a snapshot of the current results.`,
      confirmLabel: "Close out",
    });
    if (!ok) return;
    setClosing(true);
    try {
      await closeOutPeriod(uid, {
        goals: visibleGoals,
        totals,
        period,
        range,
        now,
        weekStart: settings.weekStart,
        rewardPointsEnabled: settings.rewardPointsEnabled,
        overrides: targetContext.overrides,
        vacations: targetContext.vacations,
        filters: { type: "all", status: statusFilter, tag: tagFilter },
      });
      toast.success("Snapshot saved");
    } catch {
      toast.error("Could not close out period");
    } finally {
      setClosing(false);
    }
  }

  return (
    <div className="flex flex-col gap-4">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <h1 className="font-display text-2xl">{TITLES[period]}</h1>
        <div className="flex items-center gap-2">
          <Button size="sm" onClick={() => setAnchor((d) => shiftAnchor(d, period, -1))}>← Prev</Button>
          <Button size="sm" onClick={() => setAnchor(normalizeDate(new Date()))}>Today</Button>
          <Button size="sm" onClick={() => setAnchor((d) => shiftAnchor(d, period, 1))}>Next →</Button>
          <Button size="sm" onClick={() => setSettingsOpen(true)}>View settings</Button>
          <Button
            size="sm"
            variant="primary"
            onClick={handleCloseOut}
            disabled={closing || visibleGoals.length === 0}
          >
            {closing ? "Saving…" : "Close out"}
          </Button>
        </div>
      </div>
      <p className="text-sm text-muted">{rangeLabel}</p>

      <Card className="grid grid-cols-2 gap-4 sm:grid-cols-4">
        <Stat label="Completion" value={`${summary.completion}%`} />
        <Stat label="Progress" value={formatAmount(summary.totalProgress)} />
        <Stat label="Target" value={formatAmount(summary.totalTarget)} />
        <Stat label="Goals hit" value={`${summary.hitCount}/${visibleGoals.length}`} />
      </Card>

      <div className="flex flex-wrap gap-3">
        <label className="flex items-center gap-2 text-sm text-muted">
          Status
          <Select className="w-auto py-1" value={statusFilter} onChange={(e) => setStatusFilter(e.target.value as "active" | "all")}>
            <option value="active">Active</option>
            <option value="all">All</option>
          </Select>
        </label>
        {allTags.length > 0 ? (
          <label className="flex items-center gap-2 text-sm text-muted">
            Tag
            <Select className="w-auto py-1" value={tagFilter} onChange={(e) => setTagFilter(e.target.value)}>
              <option value="all">All</option>
              {allTags.map((t) => (
                <option key={t} value={t}>{t}</option>
              ))}
            </Select>
          </label>
        ) : null}
      </div>

      {visibleGoals.length === 0 ? (
        <EmptyState>No goals match these filters.</EmptyState>
      ) : (
        <div className="grid gap-3">
          {visibleGoals.map((goal) => (
            <GoalPeriodCard
              key={goal.id}
              goal={goal}
              totals={totals}
              period={period}
              range={range}
              weekStart={settings.weekStart}
              overrides={targetContext.overrides}
              vacations={targetContext.vacations}
              uid={uid}
              stretchKey={periodKey ? overrideKey(periodKey, goal.id) : null}
              stretchTarget={periodKey ? stretchFlat[overrideKey(periodKey, goal.id)] : undefined}
              now={now}
            />
          ))}
        </div>
      )}

      {periodTempGoals.length > 0 ? (
        <div className="flex flex-col gap-2">
          <h2 className="text-sm font-semibold uppercase tracking-wide text-muted">Extra goals this period</h2>
          <div className="grid gap-3">
            {periodTempGoals.map((t) => (
              <Card key={t.id} className="flex items-center justify-between gap-3">
                <span className="font-medium">{t.name}</span>
                <span className="text-sm text-muted">Target {formatAmount(t.target)} {t.unit}</span>
              </Card>
            ))}
          </div>
        </div>
      ) : null}

      <ViewSettingsModal
        open={settingsOpen}
        onClose={() => setSettingsOpen(false)}
        uid={uid}
        period={period}
        periodKey={periodKey}
        periodName={periodName}
        range={range}
        goals={goals}
        vacations={vacations.data}
        tempGoals={tempGoals.data}
        overridesFlat={overridesFlat}
        weekStart={settings.weekStart}
      />
    </div>
  );
}

function Stat({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex flex-col">
      <span className="text-xs uppercase tracking-wide text-muted">{label}</span>
      <span className="font-display text-xl">{value}</span>
    </div>
  );
}
