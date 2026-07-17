/**
 * Backfill-grid parsing: a spreadsheet-style paste with dates down column A
 * and one column per goal (goal name as the header), cells = amounts.
 * Handles multiple goals at once and any past dates, so whole previous years
 * can be filled in. Pure: no Firebase/React imports.
 */
import type { DateKey } from "@/types/models";

export interface BackfillCell {
  goalId: string;
  date: DateKey;
  amount: number;
}

export interface BackfillWarning {
  /** 1-based line number in the pasted text (0 = header/global) */
  line: number;
  message: string;
}

export interface BackfillPlan {
  cells: BackfillCell[];
  /** matched goal columns in header order, with how many cells each got */
  goals: { goalId: string; name: string; count: number }[];
  warnings: BackfillWarning[];
}

const pad = (n: number) => String(n).padStart(2, "0");

/** Accepts YYYY-M-D and M/D/YYYY (or M/D/YY → 20YY); validates real dates. */
function parseDateCell(raw: string): DateKey | null {
  const t = raw.trim();
  let y: number, mo: number, d: number;
  let m = /^(\d{4})-(\d{1,2})-(\d{1,2})$/.exec(t);
  if (m) {
    y = Number(m[1]); mo = Number(m[2]); d = Number(m[3]);
  } else {
    m = /^(\d{1,2})\/(\d{1,2})\/(\d{2,4})$/.exec(t);
    if (!m) return null;
    mo = Number(m[1]); d = Number(m[2]); y = Number(m[3]);
    if (y < 100) y += 2000;
  }
  const date = new Date(y, mo - 1, d);
  if (date.getFullYear() !== y || date.getMonth() !== mo - 1 || date.getDate() !== d) return null;
  return `${y}-${pad(mo)}-${pad(d)}`;
}

/** Split one line on tab, or on commas with double-quote handling. */
function splitLine(line: string, delim: "\t" | ","): string[] {
  if (delim === "\t") return line.split("\t");
  const out: string[] = [];
  let cur = "";
  let inQuotes = false;
  for (let i = 0; i < line.length; i += 1) {
    const ch = line[i];
    if (inQuotes) {
      if (ch === '"') {
        if (line[i + 1] === '"') { cur += '"'; i += 1; } else inQuotes = false;
      } else cur += ch;
    } else if (ch === '"') inQuotes = true;
    else if (ch === ",") { out.push(cur); cur = ""; }
    else cur += ch;
  }
  out.push(cur);
  return out;
}

/**
 * Parse a pasted grid against the user's goals (archived included — old years
 * often belong to retired goals). Goal names match case-insensitively.
 * Blank cells are skipped; an explicit 0 is kept (a real zero entry, e.g. a
 * yes/no "no"). A duplicate date+goal cell keeps the last value with a
 * warning. Returns null when the text has no usable header row.
 */
export function parseBackfillGrid(
  text: string,
  goals: { id: string; name: string }[],
): BackfillPlan | null {
  const lines = text.split(/\r?\n/);
  const firstIdx = lines.findIndex((l) => l.trim() !== "");
  if (firstIdx === -1) return null;

  const delim: "\t" | "," = lines[firstIdx].includes("\t") ? "\t" : ",";
  const header = splitLine(lines[firstIdx], delim).map((c) => c.trim());
  if (header.length < 2) return null;

  const warnings: BackfillWarning[] = [];
  const byName = new Map(goals.map((g) => [g.name.trim().toLowerCase(), g] as const));

  // column index → goalId (column 0 is the date column, whatever its header)
  const columns: (string | null)[] = header.map((name, i) => {
    if (i === 0) return null;
    if (!name) return null;
    const goal = byName.get(name.toLowerCase());
    if (!goal) {
      warnings.push({ line: 0, message: `Column "${name}" doesn't match any goal — skipped` });
      return null;
    }
    return goal.id;
  });
  const seenGoal = new Set<string>();
  for (let i = 1; i < columns.length; i += 1) {
    if (columns[i] && seenGoal.has(columns[i]!)) {
      warnings.push({ line: 0, message: `Duplicate column "${header[i]}" — only the first is used` });
      columns[i] = null;
    } else if (columns[i]) seenGoal.add(columns[i]!);
  }
  if (columns.every((c) => c === null)) return null;

  const byKey = new Map<string, BackfillCell>();
  for (let li = firstIdx + 1; li < lines.length; li += 1) {
    if (lines[li].trim() === "") continue;
    const lineNo = li + 1;
    const cells = splitLine(lines[li], delim);
    const date = parseDateCell(cells[0] ?? "");
    if (!date) {
      warnings.push({ line: lineNo, message: `Unreadable date "${(cells[0] ?? "").trim()}" — row skipped` });
      continue;
    }
    for (let c = 1; c < cells.length && c < columns.length; c += 1) {
      const goalId = columns[c];
      if (!goalId) continue;
      const raw = cells[c].trim();
      if (raw === "" || raw === "-") continue;
      const amount = Number(raw.replace(/,/g, ""));
      if (!Number.isFinite(amount) || amount < 0) {
        warnings.push({ line: lineNo, message: `"${raw}" under "${header[c]}" isn't a number — cell skipped` });
        continue;
      }
      const key = `${date}|${goalId}`;
      if (byKey.has(key)) warnings.push({ line: lineNo, message: `${date} has two values for "${header[c]}" — kept the later one` });
      byKey.set(key, { goalId, date, amount });
    }
  }

  const cells = [...byKey.values()].sort((a, b) => a.date.localeCompare(b.date));
  const counts = new Map<string, number>();
  for (const cell of cells) counts.set(cell.goalId, (counts.get(cell.goalId) ?? 0) + 1);
  const matched = columns
    .flatMap((goalId, i) => (goalId ? [{ goalId, name: header[i], count: counts.get(goalId) ?? 0 }] : []));

  return { cells, goals: matched, warnings };
}
