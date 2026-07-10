"use client";

import { useMemo, useState } from "react";
import Link from "next/link";
import { useSettings, useUserData } from "@/components/data/UserDataProvider";
import { deriveNotifications, type NotificationKind } from "@/lib/domain/notifications";
import { Modal } from "@/components/ui/Modal";
import { Button } from "@/components/ui/Button";

const TONE: Record<NotificationKind, string> = {
  "goal-hit": "text-tone-hit",
  "needs-attention": "text-tone-missed",
  "period-close-ready": "text-accent-strong",
};

export function NotificationsBell() {
  const { goals, entries } = useUserData();
  const settings = useSettings();
  const [open, setOpen] = useState(false);
  const now = useMemo(() => new Date(), []);

  const notifications = useMemo(
    () => deriveNotifications(goals, entries, settings.weekStart, settings.missedEntryDays, now),
    [goals, entries, settings.weekStart, settings.missedEntryDays, now],
  );
  const count = notifications.length;

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
        {count === 0 ? (
          <p className="text-sm text-muted">You&apos;re all caught up.</p>
        ) : (
          <ul className="flex flex-col divide-y divide-border">
            {notifications.map((n) => (
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
