"use client";

import { useState } from "react";
import { orderBy } from "firebase/firestore";
import type { TrashItem, TrashItemType } from "@/types/models";
import { useUserData } from "@/components/data/UserDataProvider";
import { trashRepo } from "@/lib/firebase/repos";
import { emptyTrash, purgeTrashItem, restoreTrashItem } from "@/lib/firebase/actions/trash";
import { useCollection } from "@/hooks/useCollection";
import { Button } from "@/components/ui/Button";
import { Card } from "@/components/ui/Card";
import { Badge } from "@/components/ui/Badge";
import { EmptyState } from "@/components/ui/EmptyState";
import { useConfirm } from "@/components/ui/ConfirmDialog";
import { toast } from "@/components/ui/Toaster";

const TYPE_LABELS: Record<TrashItemType, string> = {
  entry: "Entry",
  goal: "Goal",
  checkin: "Check-in",
  friend: "Friend",
  squad: "Squad",
};

export default function TrashPage() {
  const { uid } = useUserData();
  const confirm = useConfirm();
  const { data: items, loading } = useCollection<TrashItem>(
    () => trashRepo.query(uid, orderBy("deletedAt", "desc")),
    [uid],
  );
  const [busyId, setBusyId] = useState<string | null>(null);

  async function handleRestore(item: TrashItem) {
    setBusyId(item.id);
    try {
      await restoreTrashItem(uid, item);
      toast.success(`Restored ${TYPE_LABELS[item.itemType].toLowerCase()}`);
    } catch {
      toast.error("Could not restore item");
    } finally {
      setBusyId(null);
    }
  }

  async function handlePurge(item: TrashItem) {
    const ok = await confirm({
      message: "Permanently delete this item? This cannot be undone.",
      confirmLabel: "Delete forever",
      danger: true,
    });
    if (!ok) return;
    setBusyId(item.id);
    try {
      await purgeTrashItem(uid, item.id);
      toast.success("Deleted permanently");
    } catch {
      toast.error("Could not delete item");
    } finally {
      setBusyId(null);
    }
  }

  async function handleEmpty() {
    const ok = await confirm({
      message: `Permanently delete all ${items.length} items? This cannot be undone.`,
      confirmLabel: "Empty trash",
      danger: true,
    });
    if (!ok) return;
    try {
      await emptyTrash(uid, items);
      toast.success("Trash emptied");
    } catch {
      toast.error("Could not empty trash");
    }
  }

  return (
    <div className="flex flex-col gap-4">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <h1 className="font-display text-2xl">Trash</h1>
        {items.length > 0 ? (
          <Button size="sm" variant="ghost" onClick={handleEmpty}>Empty trash</Button>
        ) : null}
      </div>

      {loading ? (
        <p className="text-sm text-muted">Loading…</p>
      ) : items.length === 0 ? (
        <EmptyState>Trash is empty.</EmptyState>
      ) : (
        <Card className="p-0">
          <ul className="flex flex-col divide-y divide-border">
            {items.map((item) => (
              <li key={item.id} className="flex items-center justify-between gap-3 px-4 py-2.5">
                <div className="min-w-0">
                  <div className="flex items-center gap-2">
                    <Badge>{TYPE_LABELS[item.itemType] ?? item.itemType}</Badge>
                    <span className="truncate font-medium">{item.label}</span>
                  </div>
                  <div className="text-xs text-muted">Deleted {item.deletedAt.slice(0, 10)}</div>
                </div>
                <div className="flex shrink-0 items-center gap-1">
                  <Button
                    size="sm"
                    variant="ghost"
                    disabled={busyId === item.id}
                    onClick={() => handleRestore(item)}
                  >
                    Restore
                  </Button>
                  <Button
                    size="sm"
                    variant="ghost"
                    disabled={busyId === item.id}
                    onClick={() => handlePurge(item)}
                  >
                    Delete
                  </Button>
                </div>
              </li>
            ))}
          </ul>
        </Card>
      )}
    </div>
  );
}
