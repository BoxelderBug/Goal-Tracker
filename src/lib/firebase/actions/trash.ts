import type { Entry, TrashItem, TrashItemType } from "@/types/models";
import type { WithId } from "@/lib/firebase/converters";
import type { CollectionRepo } from "@/lib/firebase/repos/collection";
import {
  checkInsRepo,
  entriesRepo,
  friendsRepo,
  goalsRepo,
  squadsRepo,
  trashRepo,
} from "@/lib/firebase/repos";
import { formatAmount } from "@/lib/domain/format";
import { createId } from "@/lib/id";

/** Keep the client-side trash bounded (matches legacy behaviour). Oldest items
 *  past this count are purged when a new item is trashed. */
const TRASH_CAP = 120;

/** Source collection each trash item type restores back into. */
const REPO_BY_TYPE: Partial<Record<TrashItemType, CollectionRepo<WithId>>> = {
  entry: entriesRepo as CollectionRepo<WithId>,
  goal: goalsRepo as CollectionRepo<WithId>,
  checkin: checkInsRepo as CollectionRepo<WithId>,
  friend: friendsRepo as CollectionRepo<WithId>,
  squad: squadsRepo as CollectionRepo<WithId>,
};

function makeTrashItem(itemType: TrashItemType, payload: WithId, label: string): TrashItem {
  return {
    id: createId(),
    itemType,
    payload: payload as unknown as Record<string, unknown>,
    label,
    deletedAt: new Date().toISOString(),
  };
}

/**
 * Move any restorable entity into trash, then remove it from its source
 * collection. The payload is stored verbatim so restore is a plain re-insert.
 */
export async function moveToTrash(
  uid: string,
  itemType: TrashItemType,
  payload: WithId,
  label: string,
): Promise<void> {
  await trashRepo.set(uid, makeTrashItem(itemType, payload, label));
  const repo = REPO_BY_TYPE[itemType];
  if (repo) await repo.remove(uid, payload.id);
  await enforceCap(uid);
}

/** Drop the entry into trash, then remove it from the live collection. */
export function moveEntryToTrash(uid: string, entry: Entry, goalName: string): Promise<void> {
  const value = entry.notApplicable ? "N/A" : formatAmount(entry.amount);
  const label = `${goalName} — ${value} (${entry.date})`;
  return moveToTrash(uid, "entry", entry, label);
}

/** Restore a trashed item back into its source collection and clear it from trash. */
export async function restoreTrashItem(uid: string, item: TrashItem): Promise<void> {
  const repo = REPO_BY_TYPE[item.itemType];
  if (!repo) throw new Error(`Cannot restore items of type "${item.itemType}"`);
  await repo.set(uid, item.payload as unknown as WithId);
  await trashRepo.remove(uid, item.id);
}

/** Permanently delete a single trash item. */
export function purgeTrashItem(uid: string, id: string): Promise<void> {
  return trashRepo.remove(uid, id);
}

/** Permanently delete every trash item. */
export async function emptyTrash(uid: string, items: TrashItem[]): Promise<void> {
  await Promise.all(items.map((t) => trashRepo.remove(uid, t.id)));
}

async function enforceCap(uid: string): Promise<void> {
  const all = await trashRepo.list(uid);
  if (all.length <= TRASH_CAP) return;
  const excess = [...all]
    .sort((a, b) => b.deletedAt.localeCompare(a.deletedAt))
    .slice(TRASH_CAP);
  await Promise.all(excess.map((t) => trashRepo.remove(uid, t.id)));
}
