/**
 * Persisted, cross-user notifications (top-level goalTrackerNotifications).
 * Anyone signed in may create one; only the recipient may read/mutate it (see
 * the deployed rules). Used for share invites/responses so they surface in the
 * recipient's bell. Queries deliberately avoid orderBy (single-field equality
 * only) so no composite index deploy is required — callers sort client-side.
 */
import { deleteDoc, doc, setDoc, updateDoc, writeBatch } from "firebase/firestore";
import type { AppNotification, NotificationType } from "@/types/models";
import { NOTIFICATION_COLLECTION, getDb } from "@/lib/firebase/client";
import { createId } from "@/lib/id";

function blankNotification(): AppNotification {
  return {
    id: "",
    type: "goal-share-invite",
    recipientId: "",
    actorId: "",
    actorUsername: "",
    actorEmail: "",
    shareId: "",
    goalName: "",
    goalUnit: "",
    period: "",
    rangeStart: "",
    rangeEnd: "",
    progress: 0,
    target: 0,
    hitKey: "",
    entryAmount: 0,
    entryDate: "",
    friendLabel: "",
    milestonePercent: 0,
    reminderDays: 0,
    read: false,
    actioned: false,
    createdAt: new Date().toISOString(),
  };
}

export async function createNotification(
  fields: Partial<AppNotification> & { recipientId: string; type: NotificationType },
): Promise<void> {
  const id = createId();
  const notif: AppNotification = {
    ...blankNotification(),
    ...fields,
    id,
    createdAt: fields.createdAt ?? new Date().toISOString(),
  };
  await setDoc(doc(getDb(), NOTIFICATION_COLLECTION, id), notif);
}

export async function markNotificationsRead(ids: string[]): Promise<void> {
  if (ids.length === 0) return;
  const db = getDb();
  const batch = writeBatch(db);
  ids.forEach((id) => batch.update(doc(db, NOTIFICATION_COLLECTION, id), { read: true }));
  await batch.commit();
}

export async function markNotificationRead(id: string): Promise<void> {
  await updateDoc(doc(getDb(), NOTIFICATION_COLLECTION, id), { read: true });
}

export async function deleteNotification(id: string): Promise<void> {
  await deleteDoc(doc(getDb(), NOTIFICATION_COLLECTION, id));
}
