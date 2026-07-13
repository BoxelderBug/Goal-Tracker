"use client";

import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { collection, query, where } from "firebase/firestore";
import type { AppNotification as StoredNotification } from "@/types/models";
import { useSettings, useUserData } from "@/components/data/UserDataProvider";
import { useCollection } from "@/hooks/useCollection";
import { idConverter } from "@/lib/firebase/converters";
import { NOTIFICATION_COLLECTION, getDb } from "@/lib/firebase/client";
import { markNotificationsRead } from "@/lib/firebase/actions/notifications";
import { deriveNotifications, type NotificationKind } from "@/lib/domain/notifications";
import { Modal } from "@/components/ui/Modal";
import { Button } from "@/components/ui/Button";

type BellKind = NotificationKind | "share";

interface BellItem {
  id: string;
  kind: BellKind;
  title: string;
  detail: string;
  href: string;
}

const TONE: Record<BellKind, string> = {
  "goal-hit": "text-tone-hit",
  "goal-milestone": "text-tone-onpace",
  "smart-reminder": "text-tone-behind",
  "needs-attention": "text-tone-missed",
  "period-close-ready": "text-accent-strong",
  share: "text-accent-strong",
};

const SHARE_TYPES = new Set([
  "goal-share-invite",
  "goal-share-approved",
  "goal-share-rejected",
  "goal-share-entry-update",
]);

function describeShare(n: StoredNotification): { title: string; detail: string } {
  const who = n.actorUsername || n.actorEmail || "Someone";
  switch (n.type) {
    case "goal-share-invite":
      return { title: `${who} shared "${n.goalName}"`, detail: "Accept or decline in Partners." };
    case "goal-share-approved":
      return { title: `${who} accepted your share`, detail: `${n.goalName} — they're now following.` };
    case "goal-share-rejected":
      return { title: `${who} declined your share`, detail: n.goalName };
    case "goal-share-entry-update":
      return { title: `${who} logged progress`, detail: `${n.entryAmount} ${n.goalUnit} on ${n.goalName}.`.trim() };
    default:
      return { title: n.goalName || "Notification", detail: "" };
  }
}

export function NotificationsBell() {
  const { uid, goals, entries } = useUserData();
  const settings = useSettings();
  const [open, setOpen] = useState(false);
  const now = useMemo(() => new Date(), []);

  const derived = useMemo(
    () =>
      deriveNotifications(goals, entries, settings.weekStart, settings.missedEntryDays, now, {
        milestonesEnabled: settings.milestoneNotificationsEnabled,
        milestoneStep: settings.milestoneStep,
        smartRemindersEnabled: settings.smartRemindersEnabled,
      }),
    [
      goals,
      entries,
      settings.weekStart,
      settings.missedEntryDays,
      settings.milestoneNotificationsEnabled,
      settings.milestoneStep,
      settings.smartRemindersEnabled,
      now,
    ],
  );

  const stored = useCollection<StoredNotification>(
    () =>
      query(
        collection(getDb(), NOTIFICATION_COLLECTION).withConverter(idConverter<StoredNotification>()),
        where("recipientId", "==", uid),
      ),
    [uid],
  );

  const shareNotifs = useMemo(
    () =>
      stored.data
        .filter((n) => SHARE_TYPES.has(n.type))
        .sort((a, b) => b.createdAt.localeCompare(a.createdAt)),
    [stored.data],
  );
  const unreadIds = useMemo(() => shareNotifs.filter((n) => !n.read).map((n) => n.id), [shareNotifs]);

  // Mark share notifications read once the panel is opened.
  useEffect(() => {
    if (open && unreadIds.length > 0) markNotificationsRead(unreadIds).catch(() => {});
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open]);

  const items: BellItem[] = useMemo(() => {
    const shareItems: BellItem[] = shareNotifs.map((n) => ({
      id: n.id,
      kind: "share",
      href: "/partners",
      ...describeShare(n),
    }));
    const derivedItems: BellItem[] = derived.map((n) => ({ ...n }));
    return [...shareItems, ...derivedItems];
  }, [shareNotifs, derived]);

  const count = derived.length + unreadIds.length;

  return (
    <>
      <Button size="sm" onClick={() => setOpen(true)} aria-label={`Notifications (${count})`} className="relative">
        <span aria-hidden>🔔</span>
        {count > 0 ? (
          <span className="absolute -right-1 -top-1 flex h-4 min-w-4 items-center justify-center rounded-full bg-accent px-1 text-[10px] font-semibold text-on-accent">
            {count > 9 ? "9+" : count}
          </span>
        ) : null}
      </Button>

      <Modal open={open} onClose={() => setOpen(false)} title="Notifications">
        {items.length === 0 ? (
          <p className="text-sm text-muted">You&apos;re all caught up.</p>
        ) : (
          <ul className="flex flex-col divide-y divide-border">
            {items.map((n) => (
              <li key={n.id} className="py-2.5">
                <Link href={n.href} onClick={() => setOpen(false)} className="block hover:opacity-80">
                  <div className={`text-sm font-medium ${TONE[n.kind]}`}>{n.title}</div>
                  <div className="text-xs text-muted">{n.detail}</div>
                </Link>
              </li>
            ))}
          </ul>
        )}
      </Modal>
    </>
  );
}
