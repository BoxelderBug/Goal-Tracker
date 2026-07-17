"use client";

import { useMemo, useRef, useState } from "react";
import type { Entry, Goal } from "@/types/models";
import { useUserData } from "@/components/data/UserDataProvider";
import { entriesRepo, goalsRepo } from "@/lib/firebase/repos";
import { entriesToCsv } from "@/lib/domain/csv";
import { parseBackfillGrid } from "@/lib/domain/backfill";
import { Button } from "@/components/ui/Button";
import { Card, CardTitle } from "@/components/ui/Card";
import { Textarea } from "@/components/ui/Input";
import { useConfirm } from "@/components/ui/ConfirmDialog";
import { toast } from "@/components/ui/Toaster";

const todayStamp = () => new Date().toISOString().slice(0, 10);

function download(filename: string, content: string, type: string) {
  const blob = new Blob([content], { type });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = filename;
  a.click();
  URL.revokeObjectURL(url);
}

interface Backup {
  version: 1;
  exportedAt: string;
  goals: Goal[];
  entries: Entry[];
}

export default function DataPage() {
  const { uid, goals } = useUserData();
  const confirm = useConfirm();
  const fileRef = useRef<HTMLInputElement>(null);
  const [busy, setBusy] = useState<"csv" | "json" | "import" | "backfill" | null>(null);
  const [gridText, setGridText] = useState("");

  const plan = useMemo(
    () => (gridText.trim() ? parseBackfillGrid(gridText, goals) : null),
    [gridText, goals],
  );

  async function importBackfill() {
    if (!plan || plan.cells.length === 0) return;
    const ok = await confirm({
      title: "Backfill entries",
      message: `Write ${plan.cells.length} entries across ${plan.goals.filter((g) => g.count > 0).length} goals? Re-importing the same grid updates these entries instead of duplicating them; entries you logged normally are untouched.`,
      confirmLabel: "Backfill",
    });
    if (!ok) return;
    setBusy("backfill");
    try {
      const now = new Date().toISOString();
      await entriesRepo.setMany(
        uid,
        plan.cells.map((c) => ({
          // deterministic id → one backfill entry per goal+day, re-import updates
          id: `bf_${c.date}_${c.goalId}`,
          trackerId: c.goalId,
          date: c.date,
          amount: c.amount,
          notApplicable: false,
          goalsPlus: null,
          metricValues: {},
          notes: "Backfill",
          createdAt: now,
        })),
      );
      toast.success(`Backfilled ${plan.cells.length} entries`);
      setGridText("");
    } catch {
      toast.error("Could not write backfill entries");
    } finally {
      setBusy(null);
    }
  }

  async function exportCsv() {
    setBusy("csv");
    try {
      const entries = await entriesRepo.list(uid);
      const names = new Map(goals.map((g) => [g.id, g.name] as const));
      download(`goal-tracker-entries-${todayStamp()}.csv`, entriesToCsv(entries, names), "text/csv");
      toast.success(`Exported ${entries.length} entries`);
    } catch {
      toast.error("Could not export CSV");
    } finally {
      setBusy(null);
    }
  }

  async function exportJson() {
    setBusy("json");
    try {
      const [entries, allGoals] = await Promise.all([entriesRepo.list(uid), goalsRepo.list(uid)]);
      const backup: Backup = { version: 1, exportedAt: new Date().toISOString(), goals: allGoals, entries };
      download(`goal-tracker-backup-${todayStamp()}.json`, JSON.stringify(backup, null, 2), "application/json");
      toast.success(`Backed up ${allGoals.length} goals and ${entries.length} entries`);
    } catch {
      toast.error("Could not export backup");
    } finally {
      setBusy(null);
    }
  }

  async function importJson(file: File) {
    setBusy("import");
    try {
      const parsed = JSON.parse(await file.text()) as Partial<Backup>;
      const importGoals = Array.isArray(parsed.goals) ? parsed.goals : [];
      const importEntries = Array.isArray(parsed.entries) ? parsed.entries : [];
      if (importGoals.length === 0 && importEntries.length === 0) {
        toast.error("No goals or entries found in that file");
        return;
      }
      const ok = await confirm({
        title: "Import backup",
        message: `Merge ${importGoals.length} goals and ${importEntries.length} entries into your data? Existing items with the same id are overwritten; nothing is deleted.`,
        confirmLabel: "Import",
      });
      if (!ok) return;
      if (importGoals.length) await goalsRepo.setMany(uid, importGoals);
      if (importEntries.length) await entriesRepo.setMany(uid, importEntries);
      toast.success("Import complete");
    } catch {
      toast.error("Could not import — is it a valid backup file?");
    } finally {
      setBusy(null);
      if (fileRef.current) fileRef.current.value = "";
    }
  }

  return (
    <div className="flex flex-col gap-4">
      <h1 className="font-display text-2xl">Data</h1>

      <Card className="flex flex-col gap-3">
        <CardTitle>Export</CardTitle>
        <p className="text-sm text-muted">Download your data. CSV is best for spreadsheets; JSON is a full backup you can re-import.</p>
        <div className="flex flex-wrap gap-2">
          <Button variant="primary" onClick={exportCsv} disabled={busy !== null}>
            {busy === "csv" ? "Exporting…" : "Export entries (CSV)"}
          </Button>
          <Button onClick={exportJson} disabled={busy !== null}>
            {busy === "json" ? "Backing up…" : "Download backup (JSON)"}
          </Button>
        </div>
      </Card>

      <Card className="flex flex-col gap-3">
        <CardTitle>Import</CardTitle>
        <p className="text-sm text-muted">
          Restore from a JSON backup. Items are merged by id — existing goals/entries with a matching id are
          updated, and nothing is deleted.
        </p>
        <input
          ref={fileRef}
          type="file"
          accept="application/json,.json"
          className="hidden"
          onChange={(e) => {
            const file = e.target.files?.[0];
            if (file) importJson(file);
          }}
        />
        <div>
          <Button onClick={() => fileRef.current?.click()} disabled={busy !== null}>
            {busy === "import" ? "Importing…" : "Choose backup file"}
          </Button>
        </div>
      </Card>

      <Card className="flex flex-col gap-3">
        <CardTitle>Backfill grid</CardTitle>
        <p className="text-sm text-muted">
          Paste a spreadsheet range: dates down the first column, one column per goal with the goal&apos;s
          name as the header. Handles several goals at once and any past dates — including whole previous
          years. Blank cells are skipped; goal names match archived goals too.
        </p>
        <Textarea
          value={gridText}
          onChange={(e) => setGridText(e.target.value)}
          rows={6}
          className="font-mono text-xs"
          placeholder={"Date\tRunning\tPushups\n2025-01-01\t3.1\t50\n2025-01-02\t\t40"}
          aria-label="Backfill grid"
        />
        {gridText.trim() ? (
          !plan ? (
            <p className="text-sm text-danger">
              Couldn&apos;t read that — the first row must be headers with at least one column matching a goal name.
            </p>
          ) : (
            <div className="flex flex-col gap-2 rounded-lg bg-bg-soft px-3 py-2 text-sm">
              <span>
                <span className="font-medium">{plan.cells.length}</span> entries ready
                {plan.goals.map((g) => ` · ${g.name}: ${g.count}`).join("")}
              </span>
              {plan.warnings.length > 0 ? (
                <ul className="flex flex-col gap-0.5 text-xs text-warning">
                  {plan.warnings.slice(0, 8).map((w, i) => (
                    <li key={i}>{w.line > 0 ? `Line ${w.line}: ` : ""}{w.message}</li>
                  ))}
                  {plan.warnings.length > 8 ? <li>…and {plan.warnings.length - 8} more</li> : null}
                </ul>
              ) : null}
            </div>
          )
        ) : null}
        <div>
          <Button
            variant="primary"
            onClick={importBackfill}
            disabled={busy !== null || !plan || plan.cells.length === 0}
          >
            {busy === "backfill" ? "Backfilling…" : "Backfill entries"}
          </Button>
        </div>
      </Card>
    </div>
  );
}
