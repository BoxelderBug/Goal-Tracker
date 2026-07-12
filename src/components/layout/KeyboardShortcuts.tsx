"use client";

import { useEffect } from "react";
import { useRouter } from "next/navigation";
import { useSettings } from "@/components/data/UserDataProvider";

/** Plain-key navigation shortcuts, ported from the legacy app. */
const ROUTES: Record<string, string> = {
  h: "/",
  w: "/week",
  m: "/month",
  y: "/year",
  e: "/entry/week",
};

export function KeyboardShortcuts({ onEscape }: { onEscape?: () => void }) {
  const router = useRouter();
  const settings = useSettings();

  useEffect(() => {
    function onKey(ev: KeyboardEvent) {
      if (ev.key === "Escape") {
        onEscape?.();
        return;
      }
      // plain key only — ignore modifier combos and typing contexts
      if (ev.ctrlKey || ev.metaKey || ev.altKey) return;
      const el = ev.target as HTMLElement | null;
      if (el && (el.isContentEditable || el.tagName === "INPUT" || el.tagName === "SELECT" || el.tagName === "TEXTAREA")) {
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
  }, [router, settings, onEscape]);

  return null;
}
