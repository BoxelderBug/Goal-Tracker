"use client";

import { useMemo } from "react";
import Link from "next/link";
import { orderBy } from "firebase/firestore";
import type { ScheduleBlock } from "@/types/models";
import { useSettings, useUserData } from "@/components/data/UserDataProvider";
import { schedulesRepo } from "@/lib/firebase/repos";
import { computeScheduleInsights } from "@/lib/domain/insights";
import { computePace, sumRange, buildDailyTotals } from "@/lib/domain/progress";
import { getTargetForPeriod } from "@/lib/domain/targets";
import { getWeekRange } from "@/lib/domain/periods";
import { useCollection } from "@/hooks/useCollection";
import { Badge } from "@/components/ui/Badge";
import { Button } from "@/components/ui/Button";
import { Card, CardTitle } from "@/components/ui/Card";
import { EmptyState } from "@/components/ui/EmptyState";

export default function InsightsPage() {
  const { uid, goals, entries } = useUserData();
  const settings = useSettings();
  const now = useMemo(() => new Date(), []);
  const { data: blocks } = useCollection<ScheduleBlock>(
    () => schedulesRepo.query(uid, orderBy("date", "asc")),
    [uid],
  );

  const schedule = useMemo(
    () => computeScheduleInsights(goals, blocks, entries, now),
    [goals, blocks, entries, now],
  );

  // This week's behind-pace goals — the same lens as the Thursday check-in.
  const behind = useMemo(() => {
    const week = getWeekRange(now, settings.weekStart);
    const totals = buildDailyTotals(entries);
    return goals
      .filter((g) => !g.archived)
      .map((g) => {
        const progress = sumRange(totals, g.id, week);
        const target = getTargetForPeriod(g, "week", week, { weekStart: settings.weekStart });
        const pace = computePace(progress, target, week, now);
        return { goal: g, target, pace };
      })
      .filter((r) => r.target > 0 && !r.pace.goalHit && r.pace.projected < r.target);
  }, [goals, entries, settings.weekStart, now]);

  const hasGoals = goals.some((g) => !g.archived);

  return (
    <div className="flex flex-col gap-4">
      <div>
        <h1 className="font-display text-2xl">Insights</h1>
        <p className="text-sm text-muted">Signals from your own data — each one comes with a next move.</p>
      </div>

      {!hasGoals ? (
        <EmptyState action={<Link href="/settings/goals/new"><Button size="sm" variant="primary">Create a goal</Button></Link>}>
          Insights unlock once you have active goals and some activity.
        </EmptyState>
      ) : (
        <>
          <Card>
            <div className="flex flex-wrap items-center justify-between gap-2">
              <CardTitle>Scheduling</CardTitle>
              <Link href="/schedule"><Button size="sm" variant="ghost">Open schedule</Button></Link>
            </div>
            <div className="grid gap-4 sm:grid-cols-2">
              <div>
                <div className="font-display text-3xl">{schedule.scheduledPct}%</div>
                <p className="text-sm text-muted">
                  of your goals have scheduled time blocks ({schedule.scheduledGoalCount}/{schedule.activeGoalCount},
                  last 4 weeks + upcoming)
                </p>
              </div>
              <div>
                <div className="font-display text-3xl">{schedule.keptPct !== null ? `${schedule.keptPct}%` : "—"}</div>
                <p className="text-sm text-muted">
                  {schedule.keptPct !== null
                    ? `of scheduled blocks were followed by a logged entry (${schedule.keptBlockCount}/${schedule.pastBlockCount})`
                    : "follow-through unlocks once scheduled blocks pass"}
                </p>
              </div>
            </div>
            {schedule.unscheduledGoals.length > 0 ? (
              <div className="mt-3 border-t border-border pt-3">
                <p className="mb-1.5 text-xs text-muted">No time blocks yet — schedule these next:</p>
                <div className="flex flex-wrap gap-1.5">
                  {schedule.unscheduledGoals.map((g) => (
                    <Link key={g.id} href="/schedule">
                      <Badge tone="behind">{g.name}</Badge>
                    </Link>
                  ))}
                </div>
              </div>
            ) : null}
          </Card>

          <Card>
            <CardTitle>This week</CardTitle>
            {behind.length === 0 ? (
              <p className="text-sm text-muted">Every goal with a weekly target is on pace. Keep it rolling.</p>
            ) : (
              <ul className="flex flex-col divide-y divide-border">
                {behind.map(({ goal: g, target, pace }) => (
                  <li key={g.id} className="flex flex-wrap items-center justify-between gap-2 py-2 text-sm">
                    <Link href={`/goal/${g.id}`} className="font-medium hover:underline">{g.name}</Link>
                    <span className="text-xs text-muted">
                      projected {Math.round(pace.projected * 100) / 100} of {target} {g.unit}
                    </span>
                    <Link href={`/entry?goal=${g.id}`}><Button size="sm" variant="ghost">Log</Button></Link>
                  </li>
                ))}
              </ul>
            )}
          </Card>
        </>
      )}
    </div>
  );
}
