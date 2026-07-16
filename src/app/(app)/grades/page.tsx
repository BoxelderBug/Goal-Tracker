"use client";

import { useMemo, useState, type FormEvent } from "react";
import { orderBy, query, where } from "firebase/firestore";
import type { GradeCriterion, GradeEntry } from "@/types/models";
import { useUserData } from "@/components/data/UserDataProvider";
import { gradeCriteriaRepo, gradeEntriesRepo } from "@/lib/firebase/repos";
import { GRADE_OPTIONS, averageGrade, gradeScore, isGradeLetter, type GradeLetter } from "@/lib/domain/grades";
import { addDays, getDateKey, normalizeDate, parseDateKey } from "@/lib/domain/dates";
import { useCollection } from "@/hooks/useCollection";
import { createId } from "@/lib/id";
import { Button } from "@/components/ui/Button";
import { Card, CardTitle } from "@/components/ui/Card";
import { Badge } from "@/components/ui/Badge";
import { Input, Select } from "@/components/ui/Input";
import { EmptyState } from "@/components/ui/EmptyState";
import { EntryModeTabs } from "@/components/entries/EntryModeTabs";
import { useConfirm } from "@/components/ui/ConfirmDialog";
import { toast } from "@/components/ui/Toaster";
import { EChart, themeColor } from "@/components/charts/EChart";
import { gradesTrendOption, type GradeTrendPoint } from "@/lib/charts/options/gradesTrend";

const RECENT_DAYS = 30;
/** grade entries are loaded a year back so the chart can cover week/month/year */
const CHART_DAYS = 365;

type ChartRange = "week" | "month" | "year";
type ChartGroup = "date" | "criterion";
type DayFilter = "all" | "weekday" | "weekend" | "best" | "worst";

const RANGE_DAYS: Record<ChartRange, number> = { week: 7, month: 30, year: 365 };
const DOW_NAMES = ["Sunday", "Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday"];

export default function GradesPage() {
  const { uid } = useUserData();
  const confirm = useConfirm();

  const criteria = useCollection<GradeCriterion>(
    () => gradeCriteriaRepo.query(uid, orderBy("createdAt", "asc")),
    [uid],
  );
  const recentStartKey = useMemo(() => getDateKey(addDays(normalizeDate(new Date()), -RECENT_DAYS)), []);
  const chartStartKey = useMemo(() => getDateKey(addDays(normalizeDate(new Date()), -CHART_DAYS)), []);
  const entries = useCollection<GradeEntry>(
    () => query(gradeEntriesRepo.ref(uid), where("date", ">=", chartStartKey), orderBy("date", "desc")),
    [uid, chartStartKey],
  );

  const [newName, setNewName] = useState("");
  const [date, setDate] = useState(() => getDateKey(normalizeDate(new Date())));
  // keyed `${date}|${criterionId}` — letter and comment drafts override saved values
  const [draft, setDraft] = useState<Record<string, string>>({});
  const [noteDraft, setNoteDraft] = useState<Record<string, string>>({});
  const [saving, setSaving] = useState(false);
  const [sortBy, setSortBy] = useState<"day" | "grade">("day");
  const [chartCriterion, setChartCriterion] = useState("avg");
  const [chartMode, setChartMode] = useState<"line" | "bar">("line");
  const [chartRange, setChartRange] = useState<ChartRange>("month");
  const [chartGroup, setChartGroup] = useState<ChartGroup>("date");
  const [dayFilter, setDayFilter] = useState<DayFilter>("all");

  // Grades already stored for the selected date (drafts override them).
  const savedForDate = useMemo(() => {
    const map = new Map<string, GradeEntry>();
    for (const e of entries.data) if (e.date === date) map.set(e.criterionId, e);
    return map;
  }, [entries.data, date]);

  const gradeFor = (criterionId: string): string =>
    draft[`${date}|${criterionId}`] ?? savedForDate.get(criterionId)?.grade ?? "";
  const noteFor = (criterionId: string): string =>
    noteDraft[`${date}|${criterionId}`] ?? savedForDate.get(criterionId)?.notes ?? "";

  async function addCriterion(event: FormEvent) {
    event.preventDefault();
    const name = newName.trim();
    if (!name) return;
    try {
      await gradeCriteriaRepo.set(uid, { id: createId(), name, createdAt: new Date().toISOString() });
      setNewName("");
    } catch {
      toast.error("Could not add criterion");
    }
  }

  async function removeCriterion(criterion: GradeCriterion) {
    const ok = await confirm({
      message: `Remove "${criterion.name}"? Past grades for it are kept but no longer shown.`,
      confirmLabel: "Remove",
      danger: true,
    });
    if (!ok) return;
    await gradeCriteriaRepo.remove(uid, criterion.id);
  }

  async function save() {
    const changes = criteria.data
      .map((c) => ({ criterionId: c.id, letter: gradeFor(c.id), note: noteFor(c.id).trim() }))
      .filter((c) => {
        if (!isGradeLetter(c.letter)) return false;
        const saved = savedForDate.get(c.criterionId);
        return c.letter !== (saved?.grade ?? "") || c.note !== (saved?.notes ?? "");
      });
    if (changes.length === 0) {
      toast.info("Nothing new to save");
      return;
    }
    setSaving(true);
    try {
      await gradeEntriesRepo.setMany(
        uid,
        changes.map(({ criterionId, letter, note }) => ({
          // deterministic id → re-grading a day overwrites instead of duplicating
          id: `${date}_${criterionId}`,
          date,
          criterionId,
          grade: letter,
          score: gradeScore(letter as GradeLetter),
          notes: note,
          createdAt: new Date().toISOString(),
        })),
      );
      setDraft({});
      setNoteDraft({});
      toast.success("Grades saved");
    } catch {
      toast.error("Could not save grades");
    } finally {
      setSaving(false);
    }
  }

  // Recent grades grouped by date, ordered by day (newest first) or by
  // average grade (best first, ties newest first).
  const recentByDate = useMemo(() => {
    const byDate = new Map<string, GradeEntry[]>();
    for (const e of entries.data) {
      if (e.date < recentStartKey) continue; // the query spans a year for the chart
      if (!byDate.has(e.date)) byDate.set(e.date, []);
      byDate.get(e.date)!.push(e);
    }
    const days = [...byDate.entries()];
    if (sortBy === "grade") {
      const avgScore = (list: GradeEntry[]) => {
        const letters = list.map((e) => e.grade).filter(isGradeLetter);
        return letters.length > 0
          ? letters.reduce((sum, l) => sum + gradeScore(l), 0) / letters.length
          : -1;
      };
      return days.sort((a, b) => avgScore(b[1]) - avgScore(a[1]) || b[0].localeCompare(a[0]));
    }
    return days.sort((a, b) => b[0].localeCompare(a[0]));
  }, [entries.data, sortBy, recentStartKey]);

  const criterionName = (id: string) => criteria.data.find((c) => c.id === id)?.name ?? "Removed";

  // Chart pipeline: range → (criterion) → day filter → group by date or criterion.
  const chartData = useMemo(() => {
    const today = normalizeDate(new Date());
    const startKey = getDateKey(addDays(today, -(RANGE_DAYS[chartRange] - 1)));
    const inRange = entries.data.filter((e) => e.date >= startKey && isGradeLetter(e.grade));
    const forSeries =
      chartGroup === "date" && chartCriterion !== "avg"
        ? inRange.filter((e) => e.criterionId === chartCriterion)
        : inRange;

    // Average score per weekday, for the best/worst day filters.
    const byDow = new Map<number, number[]>();
    for (const e of forSeries) {
      const dow = parseDateKey(e.date).getDay();
      if (!byDow.has(dow)) byDow.set(dow, []);
      byDow.get(dow)!.push(gradeScore(e.grade as GradeLetter));
    }
    let bestDow: number | null = null;
    let worstDow: number | null = null;
    let bestAvg = -Infinity;
    let worstAvg = Infinity;
    for (const [dow, scores] of byDow) {
      const avg = scores.reduce((s, v) => s + v, 0) / scores.length;
      if (avg > bestAvg) { bestAvg = avg; bestDow = dow; }
      if (avg < worstAvg) { worstAvg = avg; worstDow = dow; }
    }

    const keepDay = (dateKey: string): boolean => {
      if (dayFilter === "all") return true;
      const dow = parseDateKey(dateKey).getDay();
      if (dayFilter === "weekday") return dow >= 1 && dow <= 5;
      if (dayFilter === "weekend") return dow === 0 || dow === 6;
      if (dayFilter === "best") return bestDow !== null && dow === bestDow;
      return worstDow !== null && dow === worstDow;
    };
    const filtered = forSeries.filter((e) => keepDay(e.date));

    let points: GradeTrendPoint[];
    if (chartGroup === "criterion") {
      points = criteria.data.map((c) => {
        const scores = filtered
          .filter((e) => e.criterionId === c.id)
          .map((e) => gradeScore(e.grade as GradeLetter));
        return {
          label: c.name,
          score: scores.length ? scores.reduce((s, v) => s + v, 0) / scores.length : null,
        };
      });
    } else {
      const byDate = new Map<string, number[]>();
      for (const e of filtered) {
        if (!byDate.has(e.date)) byDate.set(e.date, []);
        byDate.get(e.date)!.push(gradeScore(e.grade as GradeLetter));
      }
      points = [];
      for (let d = RANGE_DAYS[chartRange] - 1; d >= 0; d -= 1) {
        const key = getDateKey(addDays(today, -d));
        if (!keepDay(key)) continue; // day filters drop non-matching days from the axis
        const scores = byDate.get(key);
        points.push({
          label: key,
          score: scores ? scores.reduce((s, v) => s + v, 0) / scores.length : null,
        });
      }
    }
    return { points, bestDow, worstDow };
  }, [entries.data, criteria.data, chartRange, chartGroup, chartCriterion, dayFilter]);
  const hasChartData = chartData.points.some((p) => p.score !== null);

  const chartOption = useMemo(
    () =>
      gradesTrendOption(chartData.points, chartMode, chartGroup === "criterion" ? "category" : "date", {
        accent: themeColor("--accent", "#009f94"),
        text: themeColor("--text", "#222"),
        muted: themeColor("--muted", "#888"),
        grid: themeColor("--border", "#ddd"),
        surface: themeColor("--surface", "#fff"),
        border: themeColor("--border", "#ddd"),
      }),
    [chartData.points, chartMode, chartGroup],
  );

  return (
    <div className="flex flex-col gap-4">
      <EntryModeTabs />
      <div>
        <h1 className="font-display text-2xl">Self-grading</h1>
        <p className="text-sm text-muted">Grade yourself on your own criteria, one letter per day.</p>
      </div>

      <Card>
        <CardTitle>Criteria</CardTitle>
        <form onSubmit={addCriterion} className="mb-2 flex flex-wrap items-center gap-2">
          <Input
            className="w-56 py-1"
            placeholder="e.g. Discipline, Sleep, Focus"
            value={newName}
            onChange={(e) => setNewName(e.target.value)}
            aria-label="New criterion name"
          />
          <Button type="submit" size="sm">Add</Button>
        </form>
        {criteria.data.length === 0 ? (
          <p className="text-sm text-muted">Add a criterion to start grading yourself.</p>
        ) : (
          <ul className="flex flex-wrap gap-2">
            {criteria.data.map((c) => (
              <li key={c.id} className="flex items-center gap-1 rounded-full bg-bg-soft px-3 py-1 text-sm">
                {c.name}
                <button
                  type="button"
                  onClick={() => removeCriterion(c)}
                  aria-label={`Remove ${c.name}`}
                  className="ml-1 text-muted transition hover:text-danger"
                >
                  ×
                </button>
              </li>
            ))}
          </ul>
        )}
      </Card>

      {criteria.data.length > 0 ? (
        <Card>
          <div className="mb-3 flex flex-wrap items-center justify-between gap-2">
            <CardTitle>Grade yourself</CardTitle>
            <Input
              type="date"
              className="w-auto py-1"
              value={date}
              onChange={(e) => { setDate(e.target.value); setDraft({}); setNoteDraft({}); }}
              aria-label="Grading date"
            />
          </div>
          <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
            {criteria.data.map((c) => (
              <div key={c.id} className="flex flex-col gap-2 rounded-xl border border-border px-3 py-2 text-sm">
                <label className="flex items-center justify-between gap-2">
                  <span className="font-medium">{c.name}</span>
                  <Select
                    className="w-20 py-1"
                    value={gradeFor(c.id)}
                    onChange={(e) => setDraft((prev) => ({ ...prev, [`${date}|${c.id}`]: e.target.value }))}
                  >
                    <option value="">–</option>
                    {GRADE_OPTIONS.map((g) => (
                      <option key={g} value={g}>{g}</option>
                    ))}
                  </Select>
                </label>
                <Input
                  className="py-1 text-xs"
                  placeholder="Comment (optional)"
                  value={noteFor(c.id)}
                  onChange={(e) => setNoteDraft((prev) => ({ ...prev, [`${date}|${c.id}`]: e.target.value }))}
                  aria-label={`Comment for ${c.name}`}
                />
              </div>
            ))}
          </div>
          <div className="mt-3 flex justify-end">
            <Button variant="primary" onClick={save} disabled={saving}>
              {saving ? "Saving…" : "Save grades"}
            </Button>
          </div>
        </Card>
      ) : null}

      {criteria.data.length > 0 ? (
        <Card>
          <div className="mb-3 flex flex-wrap items-center justify-between gap-2">
            <CardTitle>Grade history</CardTitle>
            <div className="flex flex-wrap items-center gap-2">
              <Select
                className="w-auto py-1"
                value={chartRange}
                onChange={(e) => setChartRange(e.target.value as ChartRange)}
                aria-label="Chart range"
              >
                <option value="week">Week</option>
                <option value="month">Month</option>
                <option value="year">Year</option>
              </Select>
              <Select
                className="w-auto py-1"
                value={chartGroup}
                onChange={(e) => setChartGroup(e.target.value as ChartGroup)}
                aria-label="Chart grouping"
              >
                <option value="date">By date</option>
                <option value="criterion">By criterion</option>
              </Select>
              {chartGroup === "date" ? (
                <Select
                  className="w-auto py-1"
                  value={chartCriterion}
                  onChange={(e) => setChartCriterion(e.target.value)}
                  aria-label="Charted criterion"
                >
                  <option value="avg">Daily average</option>
                  {criteria.data.map((c) => (
                    <option key={c.id} value={c.id}>{c.name}</option>
                  ))}
                </Select>
              ) : null}
              <Select
                className="w-auto py-1"
                value={dayFilter}
                onChange={(e) => setDayFilter(e.target.value as DayFilter)}
                aria-label="Day filter"
              >
                <option value="all">All days</option>
                <option value="weekday">Weekdays</option>
                <option value="weekend">Weekends</option>
                <option value="best">Best day</option>
                <option value="worst">Worst day</option>
              </Select>
              <div className="flex items-center gap-1">
                <Button size="sm" variant={chartMode === "line" ? "primary" : "default"} onClick={() => setChartMode("line")}>
                  Line
                </Button>
                <Button size="sm" variant={chartMode === "bar" ? "primary" : "default"} onClick={() => setChartMode("bar")}>
                  Bar
                </Button>
              </div>
            </div>
          </div>
          {hasChartData ? (
            <>
              <EChart option={chartOption} height={220} />
              {dayFilter === "best" && chartData.bestDow !== null ? (
                <p className="mt-1 text-center text-xs text-muted">
                  Best day this {chartRange}: {DOW_NAMES[chartData.bestDow]}
                </p>
              ) : dayFilter === "worst" && chartData.worstDow !== null ? (
                <p className="mt-1 text-center text-xs text-muted">
                  Worst day this {chartRange}: {DOW_NAMES[chartData.worstDow]}
                </p>
              ) : null}
            </>
          ) : (
            <p className="text-sm text-muted">No grades match this view yet.</p>
          )}
        </Card>
      ) : null}

      <Card>
        <div className="mb-3 flex flex-wrap items-center justify-between gap-2">
          <CardTitle>Recent grades</CardTitle>
          <label className="flex items-center gap-2 text-sm text-muted">
            Sort
            <Select
              className="w-auto py-1"
              value={sortBy}
              onChange={(e) => setSortBy(e.target.value as "day" | "grade")}
            >
              <option value="day">By day</option>
              <option value="grade">By grade</option>
            </Select>
          </label>
        </div>
        {recentByDate.length === 0 ? (
          <EmptyState>No grades in the last {RECENT_DAYS} days.</EmptyState>
        ) : (
          <ul className="flex flex-col divide-y divide-border">
            {recentByDate.map(([d, list]) => {
              const letters = list.map((e) => e.grade).filter(isGradeLetter);
              const avg = averageGrade(letters);
              const notes = list.filter((e) => e.notes);
              return (
                <li key={d} className="flex flex-col gap-1 py-2">
                  <div className="flex flex-wrap items-center justify-between gap-2">
                    <div className="flex flex-wrap items-center gap-1.5">
                      <span className="w-24 text-sm text-muted">{d}</span>
                      {list.map((e) => (
                        <Badge key={e.id} tone="neutral">
                          {criterionName(e.criterionId)}: <span className="font-semibold">{e.grade}</span>
                        </Badge>
                      ))}
                    </div>
                    {avg ? <Badge tone="accent">avg {avg}</Badge> : null}
                  </div>
                  {notes.length > 0 ? (
                    <div className="flex flex-col gap-0.5 pl-24 text-xs text-muted">
                      {notes.map((e) => (
                        <span key={e.id}>
                          <span className="font-medium">{criterionName(e.criterionId)}:</span> {e.notes}
                        </span>
                      ))}
                    </div>
                  ) : null}
                </li>
              );
            })}
          </ul>
        )}
      </Card>
    </div>
  );
}
