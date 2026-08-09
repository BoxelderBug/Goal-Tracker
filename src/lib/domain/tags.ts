/**
 * Entry tags: free-form labels on a single entry ("morning", "treadmill",
 * "with Sam") and the stats derived from them. Tags cut ACROSS goals, which is
 * the point — they answer "how do the runs I do outdoors compare to the ones on
 * the treadmill" without needing a second goal for it.
 *
 * Pure: no Firebase/React imports.
 */
import type { Entry, Goal, WeekStart } from "@/types/models";
import { addDays, getDateKey, normalizeDate, parseDateKey } from "./dates";
import { getWeekRange } from "./periods";

export const MAX_TAGS_PER_ENTRY = 8;
const MAX_TAG_LENGTH = 30;

/** Canonical comparison key — tags match case-insensitively. */
export function tagKey(tag: string): string {
  return tag.trim().toLowerCase();
}

/**
 * Clean a tag list: trim, collapse inner whitespace, cap length, drop
 * case-insensitive duplicates, cap the count. Accepts an array or a string
 * separated by commas/newlines/semicolons/pipes, matching how goal tags parse.
 */
export function normalizeTags(value: unknown): string[] {
  const parts = Array.isArray(value) ? value : String(value ?? "").split(/[,\n;|]/g);
  const normalized: string[] = [];
  const seen = new Set<string>();
  for (const part of parts) {
    const trimmed = String(part ?? "").trim().replace(/\s+/g, " ").slice(0, MAX_TAG_LENGTH);
    if (!trimmed) continue;
    const key = tagKey(trimmed);
    if (seen.has(key)) continue;
    seen.add(key);
    normalized.push(trimmed);
  }
  return normalized.slice(0, MAX_TAGS_PER_ENTRY);
}

/** An entry's tags. Absent on every entry logged before tagging existed. */
export function entryTags(entry: Pick<Entry, "tags">): string[] {
  return entry.tags ?? [];
}

export function entryHasTag(entry: Pick<Entry, "tags">, tag: string): boolean {
  const key = tagKey(tag);
  return entryTags(entry).some((t) => tagKey(t) === key);
}

/**
 * Every tag already in use, most-used first — powers the input's suggestions so
 * a tag gets spelled the same way twice. Goal tags come along at the back: if a
 * goal is tagged "health" that is a sensible label to reuse on its entries.
 */
export function collectTagSuggestions(entries: Pick<Entry, "tags">[], goals: Goal[] = []): string[] {
  const counts = new Map<string, { label: string; count: number }>();
  const bump = (tag: string, weight: number) => {
    const key = tagKey(tag);
    if (!key) return;
    const found = counts.get(key);
    if (found) found.count += weight;
    else counts.set(key, { label: tag, count: weight });
  };
  for (const entry of entries) for (const tag of entryTags(entry)) bump(tag, 1);
  for (const goal of goals) for (const tag of goal.tags) bump(tag, 0);
  return [...counts.values()]
    .sort((a, b) => b.count - a.count || a.label.localeCompare(b.label))
    .map((t) => t.label);
}

export interface TagGoalStat {
  goalId: string;
  goalName: string;
  unit: string;
  entries: number;
  /** amount sum for this goal — same unit throughout, so it always adds up */
  total: number;
}

export interface TagStat {
  /** lowercase match key */
  key: string;
  /** display spelling (the one used most often) */
  label: string;
  entries: number;
  /** distinct days the tag appears on */
  days: number;
  firstDate: string;
  lastDate: string;
  /**
   * Amount summed across every tagged entry — only when all contributing goals
   * share one unit. Null for a tag spanning miles and pages, where a single
   * total would be nonsense.
   */
  total: number | null;
  /** the shared unit behind `total`; "" when mixed */
  unit: string;
  /** per-goal split, biggest first */
  goals: TagGoalStat[];
}

/**
 * Per-tag rollup over the given entries, busiest tag first. "Not applicable"
 * entries are skipped: they record a day off, not activity worth crediting to
 * a tag. Entries whose goal has been deleted still count — the tag outlives it.
 */
export function computeTagStats(
  entries: Entry[],
  goals: Goal[],
  opts: { fromKey?: string; toKey?: string } = {},
): TagStat[] {
  const goalById = new Map(goals.map((g) => [g.id, g] as const));
  interface Acc {
    labels: Map<string, number>;
    entries: number;
    days: Set<string>;
    firstDate: string;
    lastDate: string;
    goals: Map<string, TagGoalStat>;
  }
  const acc = new Map<string, Acc>();

  for (const entry of entries) {
    if (entry.notApplicable) continue;
    if (opts.fromKey && entry.date < opts.fromKey) continue;
    if (opts.toKey && entry.date > opts.toKey) continue;
    const tags = entryTags(entry);
    if (tags.length === 0) continue;
    const amount = Number(entry.amount) || 0;
    const goal = goalById.get(entry.trackerId);

    for (const tag of tags) {
      const key = tagKey(tag);
      if (!key) continue;
      let row = acc.get(key);
      if (!row) {
        row = {
          labels: new Map(),
          entries: 0,
          days: new Set(),
          firstDate: entry.date,
          lastDate: entry.date,
          goals: new Map(),
        };
        acc.set(key, row);
      }
      row.labels.set(tag, (row.labels.get(tag) ?? 0) + 1);
      row.entries += 1;
      row.days.add(entry.date);
      if (entry.date < row.firstDate) row.firstDate = entry.date;
      if (entry.date > row.lastDate) row.lastDate = entry.date;

      const goalId = entry.trackerId;
      let goalRow = row.goals.get(goalId);
      if (!goalRow) {
        goalRow = {
          goalId,
          goalName: goal?.name ?? "Deleted goal",
          unit: goal?.unit ?? "",
          entries: 0,
          total: 0,
        };
        row.goals.set(goalId, goalRow);
      }
      goalRow.entries += 1;
      goalRow.total = round2(goalRow.total + amount);
    }
  }

  const stats: TagStat[] = [];
  for (const [key, row] of acc) {
    const goalRows = [...row.goals.values()].sort(
      (a, b) => b.entries - a.entries || a.goalName.localeCompare(b.goalName),
    );
    const units = new Set(goalRows.map((g) => g.unit));
    const shared = units.size === 1 ? [...units][0] : null;
    stats.push({
      key,
      label: pickLabel(row.labels),
      entries: row.entries,
      days: row.days.size,
      firstDate: row.firstDate,
      lastDate: row.lastDate,
      total: shared === null ? null : round2(goalRows.reduce((s, g) => s + g.total, 0)),
      unit: shared ?? "",
      goals: goalRows,
    });
  }
  return stats.sort((a, b) => b.entries - a.entries || a.label.localeCompare(b.label));
}

/** The spelling used most often, ties broken alphabetically for stability. */
function pickLabel(labels: Map<string, number>): string {
  let best = "";
  let bestCount = -1;
  for (const [label, count] of labels) {
    if (count > bestCount || (count === bestCount && label.localeCompare(best) < 0)) {
      best = label;
      bestCount = count;
    }
  }
  return best;
}

const round2 = (n: number) => Math.round(n * 100) / 100;

export interface TagWeeklySeries {
  weekKeys: string[];
  series: { tag: string; counts: number[] }[];
}

/**
 * Entries per week per tag over the trailing window, oldest week first — one
 * line each on the tag chart. Tags are matched case-insensitively but reported
 * under the spelling passed in.
 */
export function computeTagWeeklyCounts(
  entries: Entry[],
  tags: string[],
  weeks: number,
  weekStart: WeekStart,
  now: Date,
): TagWeeklySeries {
  const thisWeek = getWeekRange(now, weekStart);
  const weekKeys = Array.from({ length: weeks }, (_, i) =>
    getDateKey(getWeekRange(addDays(normalizeDate(thisWeek.start), -7 * (weeks - 1 - i)), weekStart).start),
  );
  const indexByWeek = new Map(weekKeys.map((k, i) => [k, i] as const));
  const wanted = new Map(tags.map((t) => [tagKey(t), t] as const));
  const counts = new Map(tags.map((t) => [t, new Array(weeks).fill(0) as number[]] as const));

  for (const entry of entries) {
    if (entry.notApplicable || !entry.date) continue;
    const weekIndex = indexByWeek.get(getDateKey(getWeekRange(parseDateKey(entry.date), weekStart).start));
    if (weekIndex === undefined) continue;
    for (const tag of entryTags(entry)) {
      const label = wanted.get(tagKey(tag));
      if (label === undefined) continue;
      counts.get(label)![weekIndex] += 1;
    }
  }

  return { weekKeys, series: tags.map((tag) => ({ tag, counts: counts.get(tag)! })) };
}
