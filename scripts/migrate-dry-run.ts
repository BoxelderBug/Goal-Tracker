/**
 * Offline migration dry run.
 *
 * Usage:  npx tsx scripts/migrate-dry-run.ts <path-to-backup.json>
 *
 * Takes the legacy app's JSON backup export (Data tab → "Export JSON backup")
 * or a raw goalTrackerData/{uid} document export, runs planMigration, and
 * prints per-collection counts, warnings, and sample documents — without
 * touching Firestore. Run this against a real export before trusting the
 * live migration.
 */
import { readFileSync } from "node:fs";
import { planMigration } from "../src/lib/migration/fromBlob";

const path = process.argv[2];
if (!path) {
  console.error("Usage: npx tsx scripts/migrate-dry-run.ts <path-to-backup.json>");
  process.exit(1);
}

const blob = JSON.parse(readFileSync(path, "utf8"));
const plan = planMigration(blob);

console.log("=== Migration dry run ===\n");
console.log("Planned documents per collection:");
for (const [collection, count] of Object.entries(plan.counts)) {
  console.log(`  ${collection.padEnd(18)} ${count}`);
}
console.log(`  ${"TOTAL".padEnd(18)} ${plan.writes.length}`);

console.log("\nSettings:", JSON.stringify(plan.settings, null, 2));

if (plan.warnings.length > 0) {
  console.log(`\nWarnings (${plan.warnings.length}):`);
  for (const warning of plan.warnings.slice(0, 50)) {
    console.log(`  - ${warning}`);
  }
  if (plan.warnings.length > 50) {
    console.log(`  … and ${plan.warnings.length - 50} more`);
  }
} else {
  console.log("\nNo warnings — every item validated cleanly.");
}

console.log("\nSample documents (first of each collection):");
const seen = new Set<string>();
for (const write of plan.writes) {
  if (seen.has(write.collection)) continue;
  seen.add(write.collection);
  console.log(`\n--- ${write.collection}/${write.id}`);
  console.log(JSON.stringify(write.data, null, 2).slice(0, 800));
}
