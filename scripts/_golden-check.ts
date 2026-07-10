import { readFileSync } from "node:fs";
import { planMigration } from "@/lib/migration/fromBlob";
import { buildDailyTotals, sumRange } from "@/lib/domain/progress";
import { parseDateKey } from "@/lib/domain/dates";
import type { Entry, PeriodSnapshot } from "@/types/models";

const backup = JSON.parse(
  readFileSync("C:/Users/nolan/Downloads/goal-tracker-backup-2026-07-10.json", "utf8"),
);
const plan = planMigration(backup);
const entries = plan.writes
  .filter((w) => w.collection === "entries")
  .map((w) => w.data as unknown as Entry);
const totals = buildDailyTotals(entries);

const snapshots: PeriodSnapshot[] = backup.periodSnapshots ?? [];
let checked = 0;
let matched = 0;
const mismatches: string[] = [];

for (const snap of snapshots) {
  const range = { start: parseDateKey(snap.rangeStart), end: parseDateKey(snap.rangeEnd) };
  for (const g of snap.goals ?? []) {
    checked += 1;
    const recomputed = sumRange(totals, g.trackerId, range);
    if (Math.abs(recomputed - g.progress) < 0.011) matched += 1;
    else
      mismatches.push(
        `${snap.period} ${snap.rangeStart}  ${g.name}: recomputed ${recomputed} vs recorded ${g.progress}`,
      );
  }
}

console.log(`Snapshots: ${snapshots.length}`);
console.log(`Goal-progress checks: ${matched}/${checked} match legacy-recorded values`);
if (mismatches.length) {
  console.log("\nMismatches (may be entries edited after close-out):");
  for (const m of mismatches.slice(0, 20)) console.log("  " + m);
}
