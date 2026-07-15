"use client";

import { useMemo, useState } from "react";
import Link from "next/link";
import { orderBy } from "firebase/firestore";
import type { Entry, Goal, ScheduleBlock, Vacation, WeekStart } from "@/types/models";
import { useSettings, useUserData } from "@/components/data/UserDataProvider";
import { schedulesRepo, vacationsRepo } from "@/lib/firebase/repos";
import {
  computePriorityEffort,
  computeScheduleInsights,
  computeZeroDayDefense,
  type PriorityEffort,
  type ZeroDayDefense,
} from "@/lib/domain/insights";
import {
  computeComebackOdds,
  computeShowUpOdds,
  computeWeekCompletionCurve,
  computeWeekdayFingerprint,
  computeWinningWeekFingerprint,
} from "@/lib/domain/fingerprint";
import { formatAmount } from "@/lib/domain/format";
import { Select } from "@/components/ui/Input";
import { cn } from "@/lib/cn";
import { computePace, sumRange, buildDailyTotals } from "@/lib/domain/progress";
import { getTargetForPeriod } from "@/lib/domain/targets";
import { getWeekRange } from "@/lib/domain/periods";
import { useCollection } from "@/hooks/useCollection";
import { Badge } from "@/components/ui/Badge";
import { Button } from "@/components/ui/Button";
import { Card, CardTitle } from "@/components/ui/Card";
import { EmptyState } from "@/components/ui/EmptyState";

const DOW_LABELS = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];
const FINGERPRINT_WEEKS = 12;

/** Where a goal's volume actually lands across the week: share % + average
 *  amount per weekday, best day highlighted. */
function FingerprintCard({
  goals,
  entries,
  weekStart,
  now,
}: {
  goals: Goal[];
  entries: Entry[];
  weekStart: WeekStart;
  now: Date;
}) {
  const active = useMemo(() => goals.filter((g) => !g.archived), [goals]);
  const [goalId, setGoalId] = useState("");
  const selected = active.find((g) => g.id === goalId) ?? active[0];

  const fp = useMemo(
    () => (selected ? computeWeekdayFingerprint(selected.id, entries, FINGERPRINT_WEEKS, weekStart, now) : null),
    [selected, entries, weekStart, now],
  );
  if (!selected || !fp) return null;

  const bestShare = Math.max(...fp.days.map((d) => d.sharePct));

  return (
    <Card>
      <div className="mb-3 flex flex-wrap items-center justify-between gap-2">
        <CardTitle>Weekly fingerprint</CardTitle>
        <Select className="w-auto py-1" value={selected.id} onChange={(e) => setGoalId(e.target.value)}>
          {active.map((g) => (
            <option key={g.id} value={g.id}>{g.name}</option>
          ))}
        </Select>
      </div>
      {fp.total <= 0 ? (
        <p className="text-sm text-muted">
          No {selected.name} entries in the last {fp.weeks} full weeks yet.
        </p>
      ) : (
        <>
          <div className="grid grid-cols-7 gap-1.5">
            {fp.days.map((d) => {
              const isBest = d.sharePct === bestShare && d.sharePct > 0;
              return (
                <div
                  key={d.dow}
                  className={cn(
                    "flex flex-col items-center gap-0.5 rounded-xl border px-1 py-2 text-center",
                    isBest ? "border-accent bg-accent-soft" : "border-border",
                  )}
                >
                  <span className="text-xs text-muted">{DOW_LABELS[d.dow]}</span>
                  <span className={cn("font-display text-lg", isBest ? "text-accent-strong" : "")}>
                    {d.sharePct}%
                  </span>
                  <span className="text-[10px] text-muted">
                    avg {formatAmount(d.avg)}{selected.unit ? ` ${selected.unit}` : ""}
                  </span>
                </div>
              );
            })}
          </div>
          <p className="mt-2 text-xs text-muted">
            Share of your {selected.name} volume by weekday over the last {fp.weeks} full weeks
            {" · "}avg per day includes zero days — lean on your strong days, shore up the empty ones.
          </p>
        </>
      )}
    </Card>
  );
}

/** P(week hit | logged anything on a given weekday) — the show-up effect. */
function ShowUpOddsCard({
  goals,
  entries,
  weekStart,
  windowStartKey,
  now,
}: {
  goals: Goal[];
  entries: Entry[];
  weekStart: WeekStart;
  windowStartKey: string;
  now: Date;
}) {
  const active = useMemo(() => goals.filter((g) => !g.archived), [goals]);
  const [goalId, setGoalId] = useState("");
  const selected = active.find((g) => g.id === goalId) ?? active[0];

  const odds = useMemo(
    () => (selected ? computeShowUpOdds(selected, entries, weekStart, now, windowStartKey) : null),
    [selected, entries, weekStart, now, windowStartKey],
  );
  if (!selected) return null;

  const rated = odds ? odds.days.filter((d) => d.hitRatePct !== null) : [];
  const best = rated.length
    ? rated.reduce((a, b) => ((b.hitRatePct ?? 0) > (a.hitRatePct ?? 0) ? b : a))
    : null;
  const bestIsEdge = best !== null && odds !== null && (best.hitRatePct ?? 0) > odds.overallHitRatePct;

  return (
    <Card>
      <div className="mb-3 flex flex-wrap items-center justify-between gap-2">
        <CardTitle>Show-up odds</CardTitle>
        <Select className="w-auto py-1" value={selected.id} onChange={(e) => setGoalId(e.target.value)}>
          {active.map((g) => (
            <option key={g.id} value={g.id}>{g.name}</option>
          ))}
        </Select>
      </div>
      {!odds ? (
        <p className="text-sm text-muted">
          Unlocks after 6 full weeks with a weekly target for {selected.name}.
        </p>
      ) : (
        <>
          <div className="grid grid-cols-7 gap-1.5">
            {odds.days.map((d) => {
              const isBest = bestIsEdge && d.dow === best!.dow;
              return (
                <div
                  key={d.dow}
                  className={cn(
                    "flex flex-col items-center gap-0.5 rounded-xl border px-1 py-2 text-center",
                    isBest ? "border-accent bg-accent-soft" : "border-border",
                  )}
                >
                  <span className="text-xs text-muted">{DOW_LABELS[d.dow]}</span>
                  <span className={cn("font-display text-lg", isBest ? "text-accent-strong" : "")}>
                    {d.hitRatePct !== null ? `${d.hitRatePct}%` : "—"}
                  </span>
                  <span className="text-[10px] text-muted">
                    {d.loggedWeeks} wk{d.loggedWeeks === 1 ? "" : "s"}
                  </span>
                </div>
              );
            })}
          </div>
          <p className="mt-2 text-xs text-muted">
            How often the week&apos;s target was hit when you logged anything on that day
            (last {odds.weeks} full weeks · overall {odds.overallHitRatePct}%
            {" · "}&ldquo;—&rdquo; = fewer than 4 logged weeks).
            {bestIsEdge
              ? ` Showing up on ${DOW_LABELS[best!.dow]} predicts a win — protect it.`
              : ""}
          </p>
        </>
      )}
    </Card>
  );
}

/** The average shape of a week: cumulative % of target banked by each day's end. */
function CompletionByDayCard({
  goals,
  entries,
  weekStart,
  windowStartKey,
  now,
}: {
  goals: Goal[];
  entries: Entry[];
  weekStart: WeekStart;
  windowStartKey: string;
  now: Date;
}) {
  const active = useMemo(() => goals.filter((g) => !g.archived), [goals]);
  const [goalId, setGoalId] = useState("");
  const selected = active.find((g) => g.id === goalId) ?? active[0];

  const curve = useMemo(
    () => (selected ? computeWeekCompletionCurve(selected, entries, weekStart, now, windowStartKey) : null),
    [selected, entries, weekStart, now, windowStartKey],
  );
  if (!selected) return null;

  const stallDay = curve
    ? curve.days.find((d, i) => i > 0 && d.avgPct - curve.days[i - 1].avgPct <= 2 && d.avgPct < 100)
    : undefined;

  return (
    <Card>
      <div className="mb-3 flex flex-wrap items-center justify-between gap-2">
        <CardTitle>Percent complete by day</CardTitle>
        <Select className="w-auto py-1" value={selected.id} onChange={(e) => setGoalId(e.target.value)}>
          {active.map((g) => (
            <option key={g.id} value={g.id}>{g.name}</option>
          ))}
        </Select>
      </div>
      {!curve ? (
        <p className="text-sm text-muted">
          Unlocks after 4 full weeks with a weekly target for {selected.name}.
        </p>
      ) : (
        <>
          <div className="grid grid-cols-7 gap-1.5">
            {curve.days.map((d) => {
              const ahead = d.avgPct >= d.pacePct;
              return (
                <div
                  key={d.dow}
                  className={cn(
                    "flex flex-col items-center gap-0.5 rounded-xl border px-1 py-2 text-center",
                    ahead ? "border-accent bg-accent-soft" : "border-border",
                  )}
                >
                  <span className="text-xs text-muted">{DOW_LABELS[d.dow]}</span>
                  <span className={cn("font-display text-lg", ahead ? "text-accent-strong" : "")}>
                    {d.avgPct}%
                  </span>
                  <span className="text-[10px] text-muted">pace {d.pacePct}%</span>
                </div>
              );
            })}
          </div>
          <p className="mt-2 text-xs text-muted">
            Average share of the weekly target banked by the end of each day
            (last {curve.weeks} full weeks · highlighted = at or ahead of an even split).
            {stallDay
              ? ` Your week stalls around ${DOW_LABELS[stallDay.dow]} — that's the day to defend.`
              : ""}
          </p>
        </>
      )}
    </Card>
  );
}

/** Front-load signal: % of weekly target banked by day 3, hit vs miss weeks. */
function WinningWeeksCard({
  goals,
  entries,
  weekStart,
  windowStartKey,
  now,
}: {
  goals: Goal[];
  entries: Entry[];
  weekStart: WeekStart;
  windowStartKey: string;
  now: Date;
}) {
  const rows = useMemo(
    () =>
      goals
        .filter((g) => !g.archived)
        .map((g) => ({
          goal: g,
          fp: computeWinningWeekFingerprint(g, entries, weekStart, now, windowStartKey),
        }))
        .filter((r) => r.fp !== null),
    [goals, entries, weekStart, windowStartKey, now],
  );
  if (rows.length === 0) return null;

  const day3 = weekStart === "sunday" ? "Tuesday" : "Wednesday";

  return (
    <Card>
      <CardTitle>Winning weeks start early</CardTitle>
      <p className="mb-2 text-sm text-muted">
        How much of the weekly target you&apos;d banked by {day3} night, in weeks you hit vs missed.
      </p>
      <ul className="flex flex-col divide-y divide-border">
        {rows.map(({ goal: g, fp }) => (
          <li key={g.id} className="flex flex-wrap items-center justify-between gap-2 py-2 text-sm">
            <Link href={`/goal/${g.id}`} className="font-medium hover:underline">{g.name}</Link>
            <span className="text-xs text-muted">
              hit weeks <span className="font-medium text-text">{fp!.hitDay3Pct}%</span>
              {" · "}miss weeks <span className="font-medium text-text">{fp!.missDay3Pct}%</span>
              {" "}({fp!.hitWeeks} hit / {fp!.missWeeks} miss)
            </span>
            {fp!.hitDay3Pct - fp!.missDay3Pct >= 10 ? (
              <Badge tone="accent">bank ~{fp!.hitDay3Pct}% by {day3}</Badge>
            ) : null}
          </li>
        ))}
      </ul>
    </Card>
  );
}

const ZERO_DOW_NAMES = ["Sundays", "Mondays", "Tuesdays", "Wednesdays", "Thursdays", "Fridays", "Saturdays"];

/** Where the all-goals zero days land, and whether scheduled blocks stop them. */
function ZeroDayCard({ data }: { data: ZeroDayDefense }) {
  const split = data.split;
  return (
    <Card>
      <div className="flex flex-wrap items-center justify-between gap-2">
        <CardTitle>Zero-day defense</CardTitle>
        <Link href="/schedule"><Button size="sm" variant="ghost">Open schedule</Button></Link>
      </div>
      <div className="grid gap-4 sm:grid-cols-2">
        <div>
          <div className="font-display text-3xl">{data.zeroDays}</div>
          <p className="text-sm text-muted">
            {data.zeroDays === 1 ? "day" : "days"} with nothing logged on any goal in the
            last {data.daysConsidered} days{data.zeroDays <= 2 ? " — that's a defended calendar." : "."}
          </p>
        </div>
        {data.dangerDow !== null ? (
          <div>
            <div className="font-display text-3xl">{ZERO_DOW_NAMES[data.dangerDow]}</div>
            <p className="text-sm text-muted">
              are your danger day — {data.dangerZeroDays} of {data.zeroDays} zero days
              ({data.dangerSharePct}%) land there.
            </p>
          </div>
        ) : null}
      </div>
      {split ? (
        <p className="mt-3 border-t border-border pt-3 text-sm">
          Days with a scheduled block go to zero{" "}
          <span className="font-medium">{split.blockedZeroPct}%</span> of the time; unblocked days{" "}
          <span className="font-medium">{split.unblockedZeroPct}%</span>{" "}
          ({split.blockedDays} blocked / {split.unblockedDays} unblocked).
          {data.dangerDow !== null && split.unblockedZeroPct > split.blockedZeroPct
            ? ` One block on ${ZERO_DOW_NAMES[data.dangerDow]} is the cheapest fix on this page.`
            : ""}
        </p>
      ) : data.dangerDow !== null ? (
        <p className="mt-3 border-t border-border pt-3 text-sm">
          Put one scheduled block on {ZERO_DOW_NAMES[data.dangerDow]} and watch this number.
        </p>
      ) : null}
    </Card>
  );
}

/** Priority order vs where the last 4 weeks of effort actually went. */
function PriorityEffortCard({ data }: { data: PriorityEffort }) {
  if (data.needsPriorities) {
    return (
      <Card>
        <CardTitle>Priority vs effort</CardTitle>
        <p className="text-sm text-muted">
          Give your goals distinct priorities to unlock this — then the app can tell you
          whether your calendar agrees with them.
        </p>
        <div className="mt-2">
          <Link href="/settings/active-goals"><Button size="sm" variant="ghost">Set priorities</Button></Link>
        </div>
      </Card>
    );
  }
  const maxPct = Math.max(1, ...data.rows.map((r) => r.effortPct));
  return (
    <Card>
      <CardTitle>Priority vs effort</CardTitle>
      <p className="mb-2 text-sm text-muted">
        Share of the last 4 weeks&apos; effort (entries + scheduled time), in your priority order.
      </p>
      <ul className="flex flex-col gap-1.5">
        {data.rows.map((r) => (
          <li key={r.id} className="flex items-center gap-2 text-sm">
            <span className="w-8 shrink-0 text-xs text-muted">P{r.priority}</span>
            <Link href={`/goal/${r.id}`} className="w-32 shrink-0 truncate font-medium hover:underline">
              {r.name}
            </Link>
            <span className="h-2 rounded-full bg-accent/70" style={{ width: `${(r.effortPct / maxPct) * 60}%` }} />
            <span className="text-xs text-muted">{r.effortPct}%</span>
            {data.starving?.id === r.id ? <Badge tone="behind">starving</Badge> : null}
            {data.soaker?.id === r.id ? <Badge tone="onpace">soaking</Badge> : null}
          </li>
        ))}
      </ul>
      {data.starving || data.soaker ? (
        <p className="mt-3 border-t border-border pt-3 text-sm">
          {data.starving
            ? `${data.starving.name} is your top priority but got ${data.starving.effortPct}% of the effort — schedule it first, not last. `
            : ""}
          {data.soaker
            ? `${data.soaker.name} (P${data.soaker.priority}) is soaking up ${data.soaker.effortPct}% — fine, but then it isn't low priority. Rebalance one of the two.`
            : ""}
        </p>
      ) : (
        <p className="mt-3 border-t border-border pt-3 text-sm text-muted">
          Effort tracks priority — the calendar and the plan agree.
        </p>
      )}
    </Card>
  );
}

export default function InsightsPage() {
  const { uid, goals, entries, windowStartKey } = useUserData();
  const settings = useSettings();
  const now = useMemo(() => new Date(), []);
  const { data: blocks } = useCollection<ScheduleBlock>(
    () => schedulesRepo.query(uid, orderBy("date", "asc")),
    [uid],
  );
  const { data: vacations } = useCollection<Vacation>(() => vacationsRepo.query(uid), [uid]);

  const schedule = useMemo(
    () => computeScheduleInsights(goals, blocks, entries, now),
    [goals, blocks, entries, now],
  );

  const zeroDays = useMemo(
    () => computeZeroDayDefense(goals, entries, blocks, vacations, settings.weekStart, now, windowStartKey),
    [goals, entries, blocks, vacations, settings.weekStart, now, windowStartKey],
  );

  const priorityEffort = useMemo(
    () => computePriorityEffort(goals, entries, blocks, now),
    [goals, entries, blocks, now],
  );

  // This week's behind-pace goals — the same lens as the Thursday check-in —
  // each with its historical rescue rate when there's enough sample.
  const behind = useMemo(() => {
    const week = getWeekRange(now, settings.weekStart);
    const totals = buildDailyTotals(entries);
    return goals
      .filter((g) => !g.archived)
      .map((g) => {
        const progress = sumRange(totals, g.id, week);
        const target = getTargetForPeriod(g, "week", week, { weekStart: settings.weekStart });
        const pace = computePace(progress, target, week, now);
        return { goal: g, target, pace, odds: computeComebackOdds(g, entries, settings.weekStart, now, windowStartKey) };
      })
      .filter((r) => r.target > 0 && !r.pace.goalHit && r.pace.projected < r.target);
  }, [goals, entries, settings.weekStart, windowStartKey, now]);

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

          {zeroDays ? <ZeroDayCard data={zeroDays} /> : null}

          {priorityEffort ? <PriorityEffortCard data={priorityEffort} /> : null}

          <CompletionByDayCard
            goals={goals}
            entries={entries}
            weekStart={settings.weekStart}
            windowStartKey={windowStartKey}
            now={now}
          />

          <WinningWeeksCard
            goals={goals}
            entries={entries}
            weekStart={settings.weekStart}
            windowStartKey={windowStartKey}
            now={now}
          />

          <FingerprintCard goals={goals} entries={entries} weekStart={settings.weekStart} now={now} />

          <ShowUpOddsCard
            goals={goals}
            entries={entries}
            weekStart={settings.weekStart}
            windowStartKey={windowStartKey}
            now={now}
          />

          <Card>
            <CardTitle>This week</CardTitle>
            {behind.length === 0 ? (
              <p className="text-sm text-muted">Every goal with a weekly target is on pace. Keep it rolling.</p>
            ) : (
              <ul className="flex flex-col divide-y divide-border">
                {behind.map(({ goal: g, target, pace, odds }) => (
                  <li key={g.id} className="flex flex-wrap items-center justify-between gap-2 py-2 text-sm">
                    <Link href={`/goal/${g.id}`} className="font-medium hover:underline">{g.name}</Link>
                    {odds ? (
                      <Badge tone={odds.rescuePct >= 50 ? "onpace" : "behind"}>
                        you rescue {odds.rescuePct}% of weeks like this ({odds.rescuedWeeks}/{odds.behindWeeks})
                      </Badge>
                    ) : null}
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
