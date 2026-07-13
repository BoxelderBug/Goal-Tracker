"use client";

import { useMemo, useState } from "react";
import { orderBy, where } from "firebase/firestore";
import type { Entry } from "@/types/models";
import { useUserData } from "@/components/data/UserDataProvider";
import { entriesRepo } from "@/lib/firebase/repos";
import { moveEntryToTrash } from "@/lib/firebase/actions/trash";
import { formatAmount } from "@/lib/domain/format";
import { Button } from "@/components/ui/Button";
import { Card } from "@/components/ui/Card";
import { Input, Select } from "@/components/ui/Input";
import { EmptyState } from "@/components/ui/EmptyState";
import { EditEntryModal } from "@/components/entries/EditEntryModal";
import { useConfirm } from "@/components/ui/ConfirmDialog";
import { toast } from "@/components/ui/Toaster";

export default function EntriesPage() {
  const { uid, goals, entries, windowStartKey } = useUserData();
  const confirm = useConfirm();

  const [goalFilter, setGoalFilter] = useState("all");
  const [search, setSearch] = useState("");
  const [visibleCount, setVisibleCount] = useState(200);
  const [older, setOlder] = useState<Entry[] | null>(null);
  const [loadingOlder, setLoadingOlder] = useState(false);
  const [editing, setEditing] = useState<Entry | null>(null);

  const goalById = useMemo(() => new Map(goals.map((g) => [g.id, g] as const)), [goals]);
  const goalName = (id: string) => goalById.get(id)?.name ?? "Deleted goal";

  const rows = useMemo(() => {
    const merged = older ? [...entries, ...older] : entries;
    const q = search.trim().toLowerCase();
    return merged
      .filter((e) => goalFilter === "all" || e.trackerId === goalFilter)
      .filter((e) => !q || (e.notes ?? "").toLowerCase().includes(q) || e.date.includes(q))
      .sort((a, b) => b.date.localeCompare(a.date) || b.createdAt.localeCompare(a.createdAt));
  }, [entries, older, goalFilter, search]);

  async function loadOlder() {
    setLoadingOlder(true);
    try {
      const fetched = await entriesRepo.list(
        uid,
        where("date", "<", windowStartKey),
        orderBy("date", "desc"),
      );
      setOlder(fetched);
      toast.success(fetched.length ? `Loaded ${fetched.length} earlier entries` : "No earlier entries");
    } catch {
      toast.error("Could not load earlier entries");
    } finally {
      setLoadingOlder(false);
    }
  }

  async function handleDelete(entry: Entry) {
    const ok = await confirm({
      message: "Move this entry to trash?",
      confirmLabel: "Delete",
      danger: true,
    });
    if (!ok) return;
    try {
      await moveEntryToTrash(uid, entry, goalName(entry.trackerId));
      // Reflect immediately for older (non-subscribed) rows.
      setOlder((prev) => (prev ? prev.filter((e) => e.id !== entry.id) : prev));
      toast.success("Moved to trash");
    } catch {
      toast.error("Could not delete entry");
    }
  }

  return (
    <div className="flex flex-col gap-4">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <h1 className="font-display text-2xl">All entries</h1>
        <div className="flex flex-wrap items-center gap-3">
          <Input
            type="search"
            placeholder="Search notes or date…"
            className="w-48 py-1"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            aria-label="Search entries"
          />
          <label className="flex items-center gap-2 text-sm text-muted">
            Goal
            <Select
              className="w-auto py-1"
              value={goalFilter}
              onChange={(e) => setGoalFilter(e.target.value)}
            >
              <option value="all">All</option>
              {goals.map((g) => (
                <option key={g.id} value={g.id}>{g.name}</option>
              ))}
            </Select>
          </label>
        </div>
      </div>

      {rows.length === 0 ? (
        <EmptyState>
          {search.trim() || goalFilter !== "all" ? "No entries match these filters." : "No entries logged yet."}
        </EmptyState>
      ) : (
        <Card className="p-0">
          <ul className="flex flex-col divide-y divide-border">
            {rows.slice(0, visibleCount).map((entry) => (
              <li key={entry.id} className="flex items-center justify-between gap-3 px-4 py-2.5">
                <div className="min-w-0">
                  <div className="flex items-baseline gap-2">
                    <span className="font-medium">{goalName(entry.trackerId)}</span>
                    <span className="text-xs text-muted">{entry.date}</span>
                  </div>
                  <div className="truncate text-sm text-muted">
                    {entry.notApplicable ? "N/A" : formatAmount(entry.amount)}
                    {entry.notes ? ` — ${entry.notes}` : ""}
                  </div>
                </div>
                <div className="flex shrink-0 items-center gap-1">
                  <Button size="sm" variant="ghost" onClick={() => setEditing(entry)}>Edit</Button>
                  <Button size="sm" variant="ghost" onClick={() => handleDelete(entry)}>Delete</Button>
                </div>
              </li>
            ))}
          </ul>
        </Card>
      )}

      {rows.length > visibleCount ? (
        <div className="flex justify-center">
          <Button size="sm" onClick={() => setVisibleCount((n) => n + 200)}>
            Show more ({rows.length - visibleCount} hidden)
          </Button>
        </div>
      ) : older === null ? (
        <div className="flex justify-center">
          <Button size="sm" onClick={loadOlder} disabled={loadingOlder}>
            {loadingOlder ? "Loading…" : "Load earlier entries"}
          </Button>
        </div>
      ) : (
        <p className="text-center text-xs text-muted">Showing full history.</p>
      )}

      {editing ? (
        <EditEntryModal
          entry={editing}
          goal={goalById.get(editing.trackerId)}
          onClose={() => setEditing(null)}
          onSave={async (patch) => {
            try {
              await entriesRepo.set(uid, { ...editing, ...patch });
              setOlder((prev) =>
                prev ? prev.map((e) => (e.id === editing.id ? { ...e, ...patch } : e)) : prev,
              );
              toast.success("Entry updated");
              setEditing(null);
            } catch {
              toast.error("Could not save changes");
            }
          }}
        />
      ) : null}
    </div>
  );
}
