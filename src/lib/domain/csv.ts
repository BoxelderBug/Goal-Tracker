/**
 * Pure CSV serialization for entry export. RFC-4180-ish: fields containing a
 * comma, quote, or newline are wrapped in double quotes with quotes doubled.
 */
import type { Entry } from "@/types/models";
import { formatAmount } from "./format";

export const ENTRY_CSV_HEADER = ["date", "goal", "amount", "notApplicable", "notes"] as const;

export function csvEscape(value: string): string {
  if (/[",\n\r]/.test(value)) {
    return `"${value.replace(/"/g, '""')}"`;
  }
  return value;
}

export function csvRow(fields: string[]): string {
  return fields.map(csvEscape).join(",");
}

/** Serialize entries to CSV, newest first, resolving goal names via the map. */
export function entriesToCsv(entries: Entry[], goalNameById: Map<string, string>): string {
  const rows = [...entries]
    .sort((a, b) => b.date.localeCompare(a.date) || b.createdAt.localeCompare(a.createdAt))
    .map((e) =>
      csvRow([
        e.date,
        goalNameById.get(e.trackerId) ?? e.trackerId,
        e.notApplicable ? "" : formatAmount(e.amount),
        e.notApplicable ? "true" : "false",
        e.notes ?? "",
      ]),
    );
  return [csvRow([...ENTRY_CSV_HEADER]), ...rows].join("\r\n");
}
