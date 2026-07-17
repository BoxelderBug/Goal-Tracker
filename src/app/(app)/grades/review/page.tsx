"use client";

import { useMemo, useState } from "react";
import Link from "next/link";
import { orderBy, query, where } from "firebase/firestore";
import type { GradeCriterion, GradeEntry } from "@/types/models";
import { useSettings, useUserData } from "@/components/data/UserDataProvider";
import { gradeCriteriaRepo, gradeEntriesRepo } from "@/lib/firebase/repos";
import { averageGrade, isGradeLetter, type GradeLetter } from "@/lib/domain/grades";
import { addDays, addMonths, addYears, getDateKey, normalizeDate } from "@/lib/domain/dates";
import { getPeriodRange } from "@/lib/domain/periods";
import { useCollection } from "@/hooks/useCollection";
import { Button } from "@/components/ui/Button";
import { Card } from "@/components/ui/Card";
import { Badge } from "@/components/ui/Badge";
import { EmptyState } from "@/components/ui/EmptyState";
import { GradeHistoryCard } from "@/components/grades/GradeHistoryCard";

type GradePeriod = "week" | "month" | "year";

const PERIODS: { kind: GradePeriod; label: string }[] = [
  { kind: "week", label: "Week" },
  { kind: "month", label: "Month" },
  { kind: "year", label: "Year" },
];

function shift(anchor: Date, period: GradePeriod, dir: number): Date {
  if (period === "week") return addDays(anchor, 7 * dir);
  if (period === "month") return addMonths(anchor, dir);
  return addYears(anchor, dir);
}

export default function GradesReviewPage() {
  const { uid } = useUserData();
  const settings = useSettings();
  const [period, setPeriod] = useState<GradePeriod>("week");
  const [anchor, setAnchor] = useState(() => normalizeDate(new Date()));

  const range = useMemo(
    () => getPeriodRange(period, anchor, settings.weekStart),
    [period, anchor, settings.weekStart],
  );
  const startKey = getDateKey(range.start);
  const endKey = getDateKey(range.end);

  const criteria = useCollection<GradeCriterion>(
    () => gradeCriteriaRepo.query(uid, orderBy("createdAt", "asc")),
    [uid],
  );
  const entries = useCollection<GradeEntry>(
    () =>
      query(
        gradeEntriesRepo.ref(uid),
        where("date", ">=", startKey),
        where("date", "<=", endKey),
        orderBy("date", "desc"),
      ),
    [uid, startKey, endKey],
  );

  // date -> (criterionId -> entry), newest date first.
  const byDate = useMemo(() => {
    const map = new Map<string, Map<string, GradeEntry>>();
    for (const e of entries.data) {
      if (!map.has(e.date)) map.set(e.date, new Map());
      map.get(e.date)!.set(e.criterionId, e);
    }
    return [...map.entries()].sort((a, b) => b[0].localeCompare(a[0]));
  }, [entries.data]);

  // Per-criterion + overall averages across the period.
  const averages = useMemo(() => {
    const perCriterion = new Map<string, GradeLetter | null>();
    const all: GradeLetter[] = [];
    for (const c of criteria.data) {
      const letters = entries.data.filter((e) => e.criterionId === c.id).map((e) => e.grade).filter(isGradeLetter);
      perCriterion.set(c.id, averageGrade(letters));
      all.push(...letters);
    }
    return { perCriterion, overall: averageGrade(all) };
  }, [criteria.data, entries.data]);

  return (
    <div className="flex flex-col gap-4">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <h1 className="font-display text-2xl">Grades</h1>
        <div className="flex items-center gap-2">
          {PERIODS.map((p) => (
            <Button key={p.kind} size="sm" variant={period === p.kind ? "primary" : "default"} onClick={() => setPeriod(p.kind)}>
              {p.label}
            </Button>
          ))}
          <Button size="sm" aria-label={`Previous ${period}`} title={`Previous ${period}`} className="w-8 justify-center px-0" onClick={() => setAnchor((d) => shift(d, period, -1))}>←</Button>
          <Button size="sm" aria-label={`Current ${period}`} title={`Current ${period}`} className="w-8 justify-center px-0" onClick={() => setAnchor(normalizeDate(new Date()))}>•</Button>
          <Button size="sm" aria-label={`Next ${period}`} title={`Next ${period}`} className="w-8 justify-center px-0" onClick={() => setAnchor((d) => shift(d, period, 1))}>→</Button>
        </div>
      </div>
      <p className="text-sm text-muted">
        {startKey} → {endKey}
        {averages.overall ? (
          <>
            <span className="mx-2 opacity-40">·</span>
            period average <Badge tone="accent">{averages.overall}</Badge>
          </>
        ) : null}
      </p>

      <GradeHistoryCard />

      {criteria.data.length === 0 ? (
        <EmptyState
          action={<Link href="/grades"><Button size="sm" variant="primary">Set up grading</Button></Link>}
        >
          No grading criteria yet.
        </EmptyState>
      ) : byDate.length === 0 ? (
        <EmptyState
          action={<Link href="/grades"><Button size="sm" variant="primary">Grade yourself</Button></Link>}
        >
          No grades in this {period}.
        </EmptyState>
      ) : (
        <Card className="overflow-x-auto p-0">
          <table className="w-full border-collapse text-sm">
            <thead>
              <tr className="border-b border-border">
                <th className="sticky left-0 bg-surface p-3 text-left font-medium">Date</th>
                {criteria.data.map((c) => (
                  <th key={c.id} className="p-2 text-center font-medium">{c.name}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {byDate.map(([date, grades]) => (
                <tr key={date} className="border-b border-border last:border-0">
                  <td className="sticky left-0 bg-surface p-3 text-muted">{date}</td>
                  {criteria.data.map((c) => {
                    const e = grades.get(c.id);
                    return (
                      <td key={c.id} className="p-2 text-center" title={e?.notes || undefined}>
                        {e ? (
                          <span className={e.notes ? "font-semibold underline decoration-dotted underline-offset-2" : "font-semibold"}>
                            {e.grade}
                          </span>
                        ) : (
                          <span className="text-muted/50">–</span>
                        )}
                      </td>
                    );
                  })}
                </tr>
              ))}
              <tr className="bg-bg-soft">
                <td className="sticky left-0 bg-bg-soft p-3 text-xs font-semibold uppercase tracking-wide text-muted">Average</td>
                {criteria.data.map((c) => (
                  <td key={c.id} className="p-2 text-center font-semibold text-accent-strong">
                    {averages.perCriterion.get(c.id) ?? "–"}
                  </td>
                ))}
              </tr>
            </tbody>
          </table>
        </Card>
      )}
    </div>
  );
}
