import type { Entry, GoalsPlusEntryData } from "@/types/models";
import { createId } from "@/lib/id";
import { normalizeTags } from "./tags";

export function newEntry(params: {
  trackerId: string;
  date: string;
  amount: number;
  notApplicable?: boolean;
  notes?: string;
  goalsPlus?: GoalsPlusEntryData | null;
  metricValues?: Record<string, number>;
  tags?: string[];
  createdBy?: string;
}): Entry {
  const tags = normalizeTags(params.tags ?? []);
  return {
    id: createId(),
    trackerId: params.trackerId,
    date: params.date,
    amount: params.amount,
    notApplicable: params.notApplicable ?? false,
    goalsPlus: params.goalsPlus ?? null,
    metricValues: params.metricValues ?? {},
    notes: params.notes ?? "",
    createdAt: new Date().toISOString(),
    // omitted rather than stored empty, so untagged entries stay as they were
    ...(tags.length ? { tags } : {}),
    ...(params.createdBy ? { createdBy: params.createdBy } : {}),
  };
}
