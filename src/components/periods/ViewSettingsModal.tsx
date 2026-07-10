"use client";

import { useState, type FormEvent } from "react";
import type { Goal, PeriodKind, TempPeriodGoal, Vacation, WeekStart } from "@/types/models";
import type { DateRange } from "@/lib/domain/dates";
import { getDateKey } from "@/lib/domain/dates";
import { getDefaultTargetForPeriod, overrideKey } from "@/lib/domain/targets";
import { formatAmount } from "@/lib/domain/format";
import { tempPeriodGoalsRepo, vacationsRepo } from "@/lib/firebase/repos";
import {
  PERIOD_GOAL_OVERRIDES,
  deleteMetaValue,
  setMetaValue,
} from "@/lib/firebase/repos/meta";
import { createId } from "@/lib/id";
import { Modal } from "@/components/ui/Modal";
import { Button } from "@/components/ui/Button";
import { Field } from "@/components/ui/Field";
import { Input } from "@/components/ui/Input";
import { toast } from "@/components/ui/Toaster";

interface Props {
  open: boolean;
  onClose: () => void;
  uid: string;
  period: PeriodKind;
  /** null for quarter (no per-period key in legacy) */
  periodKey: string | null;
  periodName: string;
  range: DateRange;
  goals: Goal[];
  vacations: Vacation[];
  tempGoals: TempPeriodGoal[];
  overridesFlat: Record<string, number>;
  weekStart: WeekStart;
}

export function ViewSettingsModal(props: Props) {
  const { open, onClose, periodName } = props;
  return (
    <Modal open={open} onClose={onClose} title={`View settings — ${periodName}`}>
      <div className="flex flex-col gap-6">
        <OverridesSection {...props} />
        <TempGoalsSection {...props} />
        <VacationsSection {...props} />
      </div>
    </Modal>
  );
}

// --- Per-goal target overrides -------------------------------------------------

function OverridesSection({ uid, period, periodKey, range, goals, overridesFlat, weekStart }: Props) {
  if (!periodKey) {
    return (
      <Section title="Target overrides">
        <p className="text-sm text-muted">Overrides aren&apos;t available for quarter views.</p>
      </Section>
    );
  }
  const active = goals.filter((g) => !g.archived);
  return (
    <Section title="Target overrides" hint="Override a goal's target just for this period. Leave blank to use the default.">
      {active.length === 0 ? (
        <p className="text-sm text-muted">No active goals.</p>
      ) : (
        <ul className="flex flex-col gap-2">
          {active.map((goal) => (
            <OverrideRow
              key={goal.id}
              uid={uid}
              goalId={goal.id}
              goalName={goal.name}
              unit={goal.unit}
              defaultTarget={getDefaultTargetForPeriod(goal, period, range, weekStart)}
              current={overridesFlat[overrideKey(periodKey, goal.id)]}
              storageKey={overrideKey(periodKey, goal.id)}
            />
          ))}
        </ul>
      )}
    </Section>
  );
}

function OverrideRow({
  uid,
  goalName,
  unit,
  defaultTarget,
  current,
  storageKey,
}: {
  uid: string;
  goalId: string;
  goalName: string;
  unit: string;
  defaultTarget: number;
  current: number | undefined;
  storageKey: string;
}) {
  const [value, setValue] = useState(current === undefined ? "" : String(current));

  async function persist() {
    const trimmed = value.trim();
    try {
      if (trimmed === "") {
        if (current !== undefined) await deleteMetaValue(uid, PERIOD_GOAL_OVERRIDES, storageKey);
        return;
      }
      const num = Number(trimmed);
      if (!Number.isFinite(num) || num < 0) {
        toast.error("Enter a valid target");
        setValue(current === undefined ? "" : String(current));
        return;
      }
      if (num !== current) await setMetaValue(uid, PERIOD_GOAL_OVERRIDES, storageKey, num);
    } catch {
      toast.error("Could not save override");
    }
  }

  return (
    <li className="flex items-center justify-between gap-3">
      <span className="min-w-0 truncate text-sm">{goalName}</span>
      <div className="flex items-center gap-2">
        <Input
          type="number" min={0} step="any" inputMode="decimal"
          className="w-24 py-1"
          placeholder={formatAmount(defaultTarget)}
          value={value}
          onChange={(e) => setValue(e.target.value)}
          onBlur={persist}
          aria-label={`Target override for ${goalName}`}
        />
        <span className="w-10 shrink-0 text-xs text-muted">{unit}</span>
      </div>
    </li>
  );
}

// --- Temporary period goals ----------------------------------------------------

function TempGoalsSection({ uid, periodKey, periodName, range, tempGoals }: Props) {
  const [name, setName] = useState("");
  const [unit, setUnit] = useState("");
  const [target, setTarget] = useState("");
  const [saving, setSaving] = useState(false);

  if (!periodKey) {
    return (
      <Section title="Extra goals this period">
        <p className="text-sm text-muted">Extra period goals aren&apos;t available for quarter views.</p>
      </Section>
    );
  }

  const mine = tempGoals.filter((t) => t.periodKey === periodKey);

  async function add(event: FormEvent) {
    event.preventDefault();
    const num = Number(target);
    if (!name.trim() || !Number.isFinite(num) || num <= 0) {
      toast.error("Enter a name and a target");
      return;
    }
    setSaving(true);
    try {
      const temp: TempPeriodGoal = {
        id: createId(),
        name: name.trim(),
        unit: unit.trim(),
        target: num,
        periodKey: periodKey!,
        periodName,
        periodStart: getDateKey(range.start),
        periodEnd: getDateKey(range.end),
      };
      await tempPeriodGoalsRepo.set(uid, temp);
      setName(""); setUnit(""); setTarget("");
      toast.success("Extra goal added");
    } catch {
      toast.error("Could not add goal");
    } finally {
      setSaving(false);
    }
  }

  return (
    <Section title="Extra goals this period" hint="One-off targets shown only in this period.">
      {mine.length > 0 ? (
        <ul className="mb-3 flex flex-col divide-y divide-border rounded-lg border border-border">
          {mine.map((t) => (
            <li key={t.id} className="flex items-center justify-between gap-3 px-3 py-2 text-sm">
              <span>
                <span className="font-medium">{t.name}</span>{" "}
                <span className="text-muted">{formatAmount(t.target)} {t.unit}</span>
              </span>
              <Button size="sm" variant="ghost" onClick={() => vacDelete(() => tempPeriodGoalsRepo.remove(uid, t.id), "Extra goal removed")}>
                Remove
              </Button>
            </li>
          ))}
        </ul>
      ) : null}
      <form onSubmit={add} className="flex flex-wrap items-end gap-2">
        <Field label="Name" className="flex-1 min-w-[8rem]">
          <Input className="py-1" value={name} onChange={(e) => setName(e.target.value)} />
        </Field>
        <Field label="Target" className="w-24">
          <Input type="number" min={0} step="any" className="py-1" value={target} onChange={(e) => setTarget(e.target.value)} />
        </Field>
        <Field label="Unit" className="w-24">
          <Input className="py-1" value={unit} onChange={(e) => setUnit(e.target.value)} />
        </Field>
        <Button type="submit" size="sm" variant="primary" disabled={saving}>Add</Button>
      </form>
    </Section>
  );
}

// --- Vacations -----------------------------------------------------------------

function VacationsSection({ uid, range, goals, vacations }: Props) {
  const [name, setName] = useState("");
  const [startDate, setStartDate] = useState(getDateKey(range.start));
  const [endDate, setEndDate] = useState(getDateKey(range.end));
  const [paused, setPaused] = useState<string[]>([]);
  const [adjustTargets, setAdjustTargets] = useState(true);
  const [saving, setSaving] = useState(false);
  const active = goals.filter((g) => !g.archived);

  function togglePaused(id: string) {
    setPaused((prev) => (prev.includes(id) ? prev.filter((x) => x !== id) : [...prev, id]));
  }

  async function add(event: FormEvent) {
    event.preventDefault();
    if (!name.trim() || startDate > endDate) {
      toast.error("Enter a name and a valid date range");
      return;
    }
    setSaving(true);
    try {
      const vacation: Vacation = {
        id: createId(),
        name: name.trim(),
        startDate,
        endDate,
        pausedGoalIds: paused,
        adjustTargets,
      };
      await vacationsRepo.set(uid, vacation);
      setName(""); setPaused([]);
      toast.success("Vacation added");
    } catch {
      toast.error("Could not add vacation");
    } finally {
      setSaving(false);
    }
  }

  return (
    <Section title="Vacations" hint="Pause goals over a date range. With target adjustment on, paused goals' targets are prorated for the paused days.">
      {vacations.length > 0 ? (
        <ul className="mb-3 flex flex-col divide-y divide-border rounded-lg border border-border">
          {vacations.map((v) => (
            <li key={v.id} className="flex items-center justify-between gap-3 px-3 py-2 text-sm">
              <span>
                <span className="font-medium">{v.name}</span>{" "}
                <span className="text-muted">
                  {v.startDate} → {v.endDate} · {v.pausedGoalIds.length} paused{v.adjustTargets ? " · adjusts" : ""}
                </span>
              </span>
              <Button size="sm" variant="ghost" onClick={() => vacDelete(() => vacationsRepo.remove(uid, v.id), "Vacation removed")}>
                Remove
              </Button>
            </li>
          ))}
        </ul>
      ) : null}
      <form onSubmit={add} className="flex flex-col gap-2">
        <div className="flex flex-wrap items-end gap-2">
          <Field label="Name" className="flex-1 min-w-[8rem]">
            <Input className="py-1" value={name} onChange={(e) => setName(e.target.value)} />
          </Field>
          <Field label="From" className="w-40">
            <Input type="date" className="py-1" value={startDate} onChange={(e) => setStartDate(e.target.value)} />
          </Field>
          <Field label="To" className="w-40">
            <Input type="date" className="py-1" value={endDate} onChange={(e) => setEndDate(e.target.value)} />
          </Field>
        </div>
        {active.length > 0 ? (
          <fieldset className="flex flex-wrap gap-x-4 gap-y-1">
            <legend className="mb-1 text-xs uppercase tracking-wide text-muted">Paused goals</legend>
            {active.map((g) => (
              <label key={g.id} className="flex items-center gap-1.5 text-sm">
                <input type="checkbox" checked={paused.includes(g.id)} onChange={() => togglePaused(g.id)} />
                {g.name}
              </label>
            ))}
          </fieldset>
        ) : null}
        <label className="flex items-center gap-2 text-sm text-muted">
          <input type="checkbox" checked={adjustTargets} onChange={(e) => setAdjustTargets(e.target.checked)} />
          Prorate targets for paused days
        </label>
        <div className="flex justify-end">
          <Button type="submit" size="sm" variant="primary" disabled={saving}>Add vacation</Button>
        </div>
      </form>
    </Section>
  );
}

// --- helpers -------------------------------------------------------------------

async function vacDelete(fn: () => Promise<void>, okMsg: string) {
  try {
    await fn();
    toast.success(okMsg);
  } catch {
    toast.error("Could not remove");
  }
}

function Section({ title, hint, children }: { title: string; hint?: string; children: React.ReactNode }) {
  return (
    <section className="flex flex-col gap-2">
      <div>
        <h3 className="font-medium">{title}</h3>
        {hint ? <p className="text-xs text-muted">{hint}</p> : null}
      </div>
      {children}
    </section>
  );
}
