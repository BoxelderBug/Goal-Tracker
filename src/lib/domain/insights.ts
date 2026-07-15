/**
 * Schedule-vs-reality stats for the Insights tab. Pure: no Firebase/React.
 *
 * "Scheduled" looks at a trailing 28-day + upcoming 7-day window so both
 * habits and plans count. Follow-through joins past blocks against entries
 * (same goal, same date) — the question schedule data exists to answer.
 */
import type { Entry, Goal, ScheduleBlock, Vacation, WeekStart } from "@/types/models";
import { addDays, getDateKey, normalizeDate, parseDateKey } from "./dates";
import { getWeekRange } from "./periods";

export interface ScheduleInsights {
  activeGoalCount: number;
  /** active goals with ≥1 block in the window */
  scheduledGoalCount: number;
  /** 0–100; 0 when there are no active goals */
  scheduledPct: number;
  /** active goals with no blocks in the window (schedule these next) */
  unscheduledGoals: { id: string; name: string }[];
  /** past blocks in the window */
  pastBlockCount: number;
  /** past blocks with a matching entry (same goal, same date) */
  keptBlockCount: number;
  /** 0–100, or null when there are no past blocks to judge */
  keptPct: number | null;
}

export function computeScheduleInsights(
  goals: Goal[],
  blocks: ScheduleBlock[],
  entries: Entry[],
  now: Date,
): ScheduleInsights {
  const active = goals.filter((g) => !g.archived);
  const activeIds = new Set(active.map((g) => g.id));
  const today = getDateKey(normalizeDate(now));
  const windowStart = getDateKey(addDays(normalizeDate(now), -28));
  const windowEnd = getDateKey(addDays(normalizeDate(now), 7));

  const inWindow = blocks.filter(
    (b) => b.trackerId && activeIds.has(b.trackerId) && b.date >= windowStart && b.date <= windowEnd,
  );

  const scheduledIds = new Set(inWindow.map((b) => b.trackerId));
  const unscheduledGoals = active
    .filter((g) => !scheduledIds.has(g.id))
    .map((g) => ({ id: g.id, name: g.name }));

  // Follow-through: past blocks joined against entries on goal+date.
  const entryDays = new Set(entries.map((e) => `${e.trackerId}|${e.date}`));
  const past = inWindow.filter((b) => b.date < today);
  const kept = past.filter((b) => entryDays.has(`${b.trackerId}|${b.date}`));

  return {
    activeGoalCount: active.length,
    scheduledGoalCount: scheduledIds.size,
    scheduledPct: active.length > 0 ? Math.round((scheduledIds.size / active.length) * 100) : 0,
    unscheduledGoals,
    pastBlockCount: past.length,
    keptBlockCount: kept.length,
    keptPct: past.length > 0 ? Math.round((kept.length / past.length) * 100) : null,
  };
}

// ---------------------------------------------------------------------------
// Zero-day defense: where the nothing-days land, and whether blocks stop them
// ---------------------------------------------------------------------------

const ZERO_WINDOW_WEEKS = 12;
/** minimum considered days before the card shows at all */
const MIN_ZERO_WINDOW_DAYS = 28;
/** minimum zero days + modal share before a danger day is named */
const MIN_ZERO_DAYS = 8;
const MIN_DANGER_SHARE_PCT = 25;
/** minimum days on EACH side before the blocked-vs-unblocked split is claimed */
const MIN_ZERO_SPLIT_DAYS = 10;

export interface ZeroDayDefense {
  /** days considered (past full weeks, minus fully-paused vacation days) */
  daysConsidered: number;
  /** days where no active unpaused goal got any entry (N/A counts as showing up) */
  zeroDays: number;
  /** modal zero weekday when the gates pass, else null */
  dangerDow: number | null;
  dangerZeroDays: number;
  dangerSharePct: number;
  /** zero-rate on days with ≥1 schedule block vs without; null under the gate */
  split: {
    blockedDays: number;
    blockedZeroPct: number;
    unblockedDays: number;
    unblockedZeroPct: number;
  } | null;
}

/**
 * Streaks and weeks die on all-goals zero days, and those cluster on a
 * weekday you can see coming. Looks at the trailing 12 full weeks; a day is
 * excused when every active goal is paused by a vacation. The block split
 * shows whether scheduled time actually prevents zeros — the fix is one
 * block on the danger day.
 */
export function computeZeroDayDefense(
  goals: Goal[],
  entries: Entry[],
  blocks: ScheduleBlock[],
  vacations: Vacation[],
  weekStart: WeekStart,
  now: Date,
  /** first dateKey of the loaded entries window */
  windowStartKey?: string,
): ZeroDayDefense | null {
  const activeIds = new Set(goals.filter((g) => !g.archived).map((g) => g.id));
  if (activeIds.size === 0) return null;

  const currentWeekStart = getWeekRange(now, weekStart).start;
  let start = addDays(currentWeekStart, -7 * ZERO_WINDOW_WEEKS);
  if (windowStartKey && getDateKey(start) < windowStartKey) {
    start = parseDateKey(windowStartKey);
  }
  const endKey = getDateKey(addDays(currentWeekStart, -1));

  const entryDates = new Set(
    entries.filter((e) => activeIds.has(e.trackerId)).map((e) => `${e.trackerId}|${e.date}`),
  );
  const blockDates = new Set(
    blocks.filter((b) => activeIds.has(b.trackerId)).map((b) => b.date),
  );

  const zeroByDow = new Array<number>(7).fill(0);
  let daysConsidered = 0;
  let zeroDays = 0;
  let blockedDays = 0, blockedZero = 0, unblockedDays = 0, unblockedZero = 0;
  for (let day = start; getDateKey(day) <= endKey; day = addDays(day, 1)) {
    const key = getDateKey(day);
    const paused = new Set(
      vacations
        .filter((v) => v.startDate <= key && key <= v.endDate)
        .flatMap((v) => v.pausedGoalIds ?? []),
    );
    const unpaused = [...activeIds].filter((id) => !paused.has(id));
    if (unpaused.length === 0) continue; // fully on vacation — excused
    daysConsidered += 1;
    const zero = !unpaused.some((id) => entryDates.has(`${id}|${key}`));
    if (zero) {
      zeroDays += 1;
      zeroByDow[day.getDay()] += 1;
    }
    if (blockDates.has(key)) {
      blockedDays += 1;
      if (zero) blockedZero += 1;
    } else {
      unblockedDays += 1;
      if (zero) unblockedZero += 1;
    }
  }
  if (daysConsidered < MIN_ZERO_WINDOW_DAYS) return null;

  let dangerDow: number | null = null;
  let dangerZeroDays = 0;
  if (zeroDays >= MIN_ZERO_DAYS) {
    const modal = zeroByDow.indexOf(Math.max(...zeroByDow));
    const share = Math.round((zeroByDow[modal] / zeroDays) * 100);
    if (share >= MIN_DANGER_SHARE_PCT) {
      dangerDow = modal;
      dangerZeroDays = zeroByDow[modal];
    }
  }

  return {
    daysConsidered,
    zeroDays,
    dangerDow,
    dangerZeroDays,
    dangerSharePct: dangerDow !== null && zeroDays > 0 ? Math.round((dangerZeroDays / zeroDays) * 100) : 0,
    split:
      blockedDays >= MIN_ZERO_SPLIT_DAYS && unblockedDays >= MIN_ZERO_SPLIT_DAYS
        ? {
            blockedDays,
            blockedZeroPct: Math.round((blockedZero / blockedDays) * 100),
            unblockedDays,
            unblockedZeroPct: Math.round((unblockedZero / unblockedDays) * 100),
          }
        : null,
  };
}

// ---------------------------------------------------------------------------
// Priority vs effort: does the calendar agree with the priority field?
// ---------------------------------------------------------------------------

const EFFORT_WINDOW_DAYS = 28;
/** minimum own entries in the window before shares are claimed */
const MIN_EFFORT_ENTRIES = 20;

export interface PriorityEffortRow {
  id: string;
  name: string;
  priority: number;
  /** share of the last 4 weeks' effort, 0–100 */
  effortPct: number;
}

export interface PriorityEffort {
  /** true when active goals don't have ≥2 distinct priorities yet — the card
   *  should nudge setting them instead of showing shares */
  needsPriorities: boolean;
  /** sorted by priority desc (then effort desc); empty when needsPriorities */
  rows: PriorityEffortRow[];
  /** the top-priority goal, when it's starving vs an even split */
  starving: PriorityEffortRow | null;
  /** a bottom-half-priority goal soaking up an outsized share */
  soaker: PriorityEffortRow | null;
}

const blockMinutes = (b: ScheduleBlock): number => {
  const parse = (v: string): number | null => {
    const m = /^(\d{1,2}):(\d{2})$/.exec(v ?? "");
    return m ? Number(m[1]) * 60 + Number(m[2]) : null;
  };
  const start = parse(b.startTime);
  const end = parse(b.endTime);
  if (start === null || end === null || end <= start) return 60; // best guess
  return end - start;
};

/**
 * Effort share over the trailing 28 days — ½ entry-count share + ½ scheduled-
 * minutes share (never raw amounts; units differ across goals) — compared
 * against the priority order the goals claim. Surfaces the worst inversion in
 * each direction; either the calendar moves or the priorities get honest.
 */
export function computePriorityEffort(
  goals: Goal[],
  entries: Entry[],
  blocks: ScheduleBlock[],
  now: Date,
): PriorityEffort | null {
  const active = goals.filter((g) => !g.archived);
  if (active.length < 2) return null;

  const distinct = new Set(active.map((g) => Number(g.priority) || 0));
  if (distinct.size < 2) return { needsPriorities: true, rows: [], starving: null, soaker: null };

  const todayKey = getDateKey(normalizeDate(now));
  const startKey = getDateKey(addDays(normalizeDate(now), -EFFORT_WINDOW_DAYS));
  const activeIds = new Set(active.map((g) => g.id));

  const entryCounts = new Map<string, number>();
  let totalEntries = 0;
  for (const e of entries) {
    if (e.shareId || !activeIds.has(e.trackerId)) continue;
    if (e.date < startKey || e.date > todayKey) continue;
    entryCounts.set(e.trackerId, (entryCounts.get(e.trackerId) ?? 0) + 1);
    totalEntries += 1;
  }
  if (totalEntries < MIN_EFFORT_ENTRIES) return null;

  const minuteCounts = new Map<string, number>();
  let totalMinutes = 0;
  for (const b of blocks) {
    if (!activeIds.has(b.trackerId) || b.date < startKey || b.date > todayKey) continue;
    const mins = blockMinutes(b);
    minuteCounts.set(b.trackerId, (minuteCounts.get(b.trackerId) ?? 0) + mins);
    totalMinutes += mins;
  }

  const rows: PriorityEffortRow[] = active
    .map((g) => {
      const entryShare = (entryCounts.get(g.id) ?? 0) / totalEntries;
      const minuteShare = totalMinutes > 0 ? (minuteCounts.get(g.id) ?? 0) / totalMinutes : null;
      const effort = minuteShare === null ? entryShare : 0.5 * entryShare + 0.5 * minuteShare;
      return {
        id: g.id,
        name: g.name,
        priority: Number(g.priority) || 0,
        effortPct: Math.round(effort * 100),
      };
    })
    .sort((a, b) => b.priority - a.priority || b.effortPct - a.effortPct);

  const evenShare = 100 / rows.length;
  const top = rows[0];
  const starving =
    top.effortPct < evenShare / 2 &&
    rows.some((r) => r.priority < top.priority && r.effortPct > top.effortPct)
      ? top
      : null;

  const bottomHalf = rows.slice(Math.ceil(rows.length / 2));
  const soaker =
    bottomHalf
      .filter((r) => r.effortPct > Math.max(25, evenShare))
      .sort((a, b) => b.effortPct - a.effortPct)[0] ?? null;

  return { needsPriorities: false, rows, starving, soaker };
}
