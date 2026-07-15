"use client";

import { useMemo, useState, type FormEvent } from "react";
import { orderBy, query, where } from "firebase/firestore";
import type { GradeCriterion, GradeEntry } from "@/types/models";
import { useUserData } from "@/components/data/UserDataProvider";
import { gradeCriteriaRepo, gradeEntriesRepo } from "@/lib/firebase/repos";
import { GRADE_OPTIONS, averageGrade, gradeScore, isGradeLetter, type GradeLetter } from "@/lib/domain/grades";
import { addDays, getDateKey, normalizeDate } from "@/lib/domain/dates";
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

const RECENT_DAYS = 30;

export default function GradesPage() {
  const { uid } = useUserData();
  const confirm = useConfirm();

  const criteria = useCollection<GradeCriterion>(
    () => gradeCriteriaRepo.query(uid, orderBy("createdAt", "asc")),
    [uid],
  );
  const recentStartKey = useMemo(() => getDateKey(addDays(normalizeDate(new Date()), -RECENT_DAYS)), []);
  const entries = useCollection<GradeEntry>(
    () => query(gradeEntriesRepo.ref(uid), where("date", ">=", recentStartKey), orderBy("date", "desc")),
    [uid, recentStartKey],
  );

  const [newName, setNewName] = useState("");
  const [date, setDate] = useState(() => getDateKey(normalizeDate(new Date())));
  // keyed `${date}|${criterionId}` — letter and comment drafts override saved values
  const [draft, setDraft] = useState<Record<string, string>>({});
  const [noteDraft, setNoteDraft] = useState<Record<string, string>>({});
  const [saving, setSaving] = useState(false);
  const [sortBy, setSortBy] = useState<"day" | "grade">("day");

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
  }, [entries.data, sortBy]);

  const criterionName = (id: string) => criteria.data.find((c) => c.id === id)?.name ?? "Removed";

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
