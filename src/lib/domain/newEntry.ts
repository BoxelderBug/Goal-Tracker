import type { Entry, GoalsPlusEntryData } from "@/types/models";
import { createId } from "@/lib/id";

export function newEntry(params: {
  trackerId: string;
  date: string;
  amount: number;
  notApplicable?: boolean;
  notes?: string;
  goalsPlus?: GoalsPlusEntryData | null;
  metricValues?: Record<string, number>;
  createdBy?: string;
}): Entry {
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
    ...(params.createdBy ? { createdBy: params.createdBy } : {}),
  };
}
