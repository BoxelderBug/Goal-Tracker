"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { useSettings } from "@/components/data/UserDataProvider";
import { Modal } from "@/components/ui/Modal";

/** Plain-key navigation shortcuts, ported from the legacy app. */
const ROUTES: Record<string, string> = {
  h: "/",
  w: "/week",
  m: "/month",
  y: "/year",
  a: "/entry",
  e: "/entry/week",
};

const HELP: { key: string; label: string }[] = [
  { key: "H", label: "Home" },
  { key: "W", label: "Week" },
  { key: "M", label: "Month" },
  { key: "Y", label: "Year" },
  { key: "Q", label: "Quarter" },
  { key: "A", label: "Add entry" },
  { key: "E", label: "Weekly entry" },
  { key: "?", label: "This shortcuts list" },
  { key: "Esc", label: "Close menus / dialogs" },
];

export function KeyboardShortcuts({ onEscape }: { onEscape?: () => void }) {
  const router = useRouter();
  const settings = useSettings();
  const [helpOpen, setHelpOpen] = useState(false);

  useEffect(() => {
    function onKey(ev: KeyboardEvent) {
      if (ev.key === "Escape") {
        if (helpOpen) setHelpOpen(false);
        else onEscape?.();
        return;
      }
      // plain key only — ignore modifier combos and typing contexts
      if (ev.ctrlKey || ev.metaKey || ev.altKey) return;
      const el = ev.target as HTMLElement | null;
      if (el && (el.isContentEditable || el.tagName === "INPUT" || el.tagName === "SELECT" || el.tagName === "TEXTAREA")) {
        return;
      }

      if (ev.key === "?") {
        ev.preventDefault();
        setHelpOpen((v) => !v);
        return;
      }

      const key = ev.key.toLowerCase();
      if (key === "q") {
        if (settings.quartersEnabled) {
          ev.preventDefault();
          router.push("/quarter");
        }
        return;
      }
      const dest = ROUTES[key];
      if (dest) {
        ev.preventDefault();
        router.push(dest);
      }
    }

    document.addEventListener("keydown", onKey);
    return () => document.removeEventListener("keydown", onKey);
  }, [router, settings, onEscape, helpOpen]);

  return helpOpen ? (
    <Modal open onClose={() => setHelpOpen(false)} title="Keyboard shortcuts">
      <dl className="flex flex-col gap-1.5">
        {HELP.filter((h) => h.key !== "Q" || settings.quartersEnabled).map((h) => (
          <div key={h.key} className="flex items-center justify-between gap-4 text-sm">
            <dt className="text-muted">{h.label}</dt>
            <dd>
              <kbd className="rounded border border-border bg-surface-2 px-1.5 py-0.5 text-xs font-semibold">
                {h.key}
              </kbd>
            </dd>
          </div>
        ))}
      </dl>
    </Modal>
  ) : null;
}
