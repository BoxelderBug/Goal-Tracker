import type { Entry } from "@/types/models";
import { createId } from "@/lib/id";

export function newEntry(params: {
  trackerId: string;
  date: string;
  amount: number;
  notApplicable?: boolean;
  notes?: string;
  createdBy?: string;
}): Entry {
  return {
    id: createId(),
    trackerId: params.trackerId,
    date: params.date,
    amount: params.amount,
    notApplicable: params.notApplicable ?? false,
    goalsPlus: null,
    metricValues: {},
    notes: params.notes ?? "",
    createdAt: new Date().toISOString(),
    ...(params.createdBy ? { createdBy: params.createdBy } : {}),
  };
}
