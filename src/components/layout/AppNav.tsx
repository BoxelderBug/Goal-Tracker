"use client";

import { useState } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import type { Settings } from "@/types/models";
import { cn } from "@/lib/cn";
import { useSettings } from "@/components/data/UserDataProvider";

interface NavItem {
  href: string;
  label: string;
  /** hide the item unless this returns true */
  show?: (settings: Settings) => boolean;
  /** single-key shortcut hint shown as a chip (see KeyboardShortcuts) */
  hint?: string;
}

const HOME: NavItem = { href: "/", label: "Home", hint: "H" };

const GROUPS: { heading: string; items: NavItem[] }[] = [
  {
    heading: "Entries",
    items: [
      { href: "/entry", label: "Add Entry", hint: "A" },
      { href: "/entry/week", label: "Week Update", hint: "E" },
      { href: "/entry/year", label: "Year Update" },
    ],
  },
  {
    heading: "Review",
    items: [
      { href: "/week", label: "Week", hint: "W" },
      { href: "/month", label: "Month", hint: "M" },
      { href: "/quarter", label: "Quarter", show: (s) => s.quartersEnabled, hint: "Q" },
      { href: "/year", label: "Year", hint: "Y" },
      { href: "/trends", label: "Trends" },
      { href: "/goals-plus", label: "Goals+" },
      { href: "/momentum", label: "Momentum", show: (s) => s.performanceMode !== "light" },
    ],
  },
  {
    heading: "More",
    items: [
      { href: "/points", label: "Points", show: (s) => s.rewardPointsEnabled },
      { href: "/data", label: "Data" },
      { href: "/bucket-list", label: "Bucket List", show: (s) => s.bucketListEnabled },
      { href: "/journal", label: "Journal" },
      { href: "/ideas", label: "Ideas" },
      { href: "/schedule", label: "Schedule" },
      { href: "/social", label: "Social" },
      { href: "/partners", label: "Partners" },
    ],
  },
  {
    heading: "Settings",
    items: [
      { href: "/settings", label: "General" },
      { href: "/settings/goals", label: "Goals" },
      { href: "/settings/active-goals", label: "Quick Edit" },
      { href: "/settings/checkins", label: "Check-ins" },
      { href: "/settings/goal-migration", label: "Move Entries" },
      { href: "/trash", label: "Trash" },
    ],
  },
];

/** Which group contains the current route (prefix match so nested pages count). */
function activeHeading(pathname: string): string | null {
  for (const group of GROUPS) {
    for (const item of group.items) {
      const match = item.href === "/" ? pathname === "/" : pathname === item.href || pathname.startsWith(`${item.href}/`);
      if (match) return group.heading;
    }
  }
  return null;
}

function NavLinkItem({ item, pathname, onNavigate }: { item: NavItem; pathname: string; onNavigate?: () => void }) {
  const active = pathname === item.href;
  return (
    <Link
      href={item.href}
      onClick={onNavigate}
      aria-current={active ? "page" : undefined}
      className={cn(
        "flex items-center rounded-lg px-3 py-1.5 text-sm font-medium transition-colors",
        active ? "bg-accent text-on-accent" : "text-text hover:bg-accent-soft",
      )}
    >
      <span>{item.label}</span>
      {item.hint ? (
        <kbd className="ml-auto shrink-0 rounded px-1 font-sans text-[10px] font-semibold opacity-50" aria-hidden>
          {item.hint}
        </kbd>
      ) : null}
    </Link>
  );
}

function NavList({ onNavigate }: { onNavigate?: () => void }) {
  const pathname = usePathname();
  const settings = useSettings();

  const [openGroups, setOpenGroups] = useState<Set<string>>(() => {
    const h = activeHeading(pathname);
    return new Set(h ? [h] : ["Entries"]);
  });

  // keep the group you navigate into expanded (without collapsing others you
  // opened) — reconciled during render as the path changes, not in an effect
  const [lastPath, setLastPath] = useState(pathname);
  if (lastPath !== pathname) {
    setLastPath(pathname);
    const h = activeHeading(pathname);
    if (h) setOpenGroups((prev) => (prev.has(h) ? prev : new Set(prev).add(h)));
  }

  function toggle(heading: string) {
    setOpenGroups((prev) => {
      const next = new Set(prev);
      if (next.has(heading)) next.delete(heading);
      else next.add(heading);
      return next;
    });
  }

  return (
    <nav aria-label="Primary" className="flex flex-col gap-1">
      <div className="mb-1">
        <NavLinkItem item={HOME} pathname={pathname} onNavigate={onNavigate} />
      </div>
      {GROUPS.map((group) => {
        const isOpen = openGroups.has(group.heading);
        const items = group.items.filter((item) => !item.show || item.show(settings));
        return (
          <div key={group.heading} className="flex flex-col">
            <button
              type="button"
              onClick={() => toggle(group.heading)}
              aria-expanded={isOpen}
              className="flex items-center justify-between rounded-lg px-3 py-1.5 text-xs font-semibold uppercase tracking-wide text-muted transition-colors hover:bg-accent-soft hover:text-text"
            >
              <span>{group.heading}</span>
              <svg
                width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor"
                strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" aria-hidden
                className={cn("transition-transform", isOpen ? "rotate-90" : "")}
              >
                <polyline points="9 6 15 12 9 18" />
              </svg>
            </button>
            {isOpen ? (
              <div className="mt-0.5 mb-1 flex flex-col gap-0.5">
                {items.map((item) => (
                  <NavLinkItem key={item.href} item={item} pathname={pathname} onNavigate={onNavigate} />
                ))}
              </div>
            ) : null}
          </div>
        );
      })}
    </nav>
  );
}

export function AppNav({ open, onClose }: { open: boolean; onClose: () => void }) {
  return (
    <>
      {/* desktop: sticky sidebar */}
      <aside className="hidden w-52 shrink-0 self-start rounded-2xl border border-border bg-surface p-3 shadow-soft md:sticky md:top-4 md:block">
        <NavList />
      </aside>

      {/* mobile: slide-in drawer */}
      <div className={cn("md:hidden", open ? "" : "pointer-events-none")}>
        <div
          className={cn(
            "fixed inset-0 z-40 bg-black/40 transition-opacity",
            open ? "opacity-100" : "opacity-0",
          )}
          onClick={onClose}
          aria-hidden
        />
        <aside
          className={cn(
            "fixed inset-y-0 left-0 z-50 w-64 overflow-y-auto border-r border-border bg-surface p-4 shadow-card transition-transform",
            open ? "translate-x-0" : "-translate-x-full",
          )}
        >
          <NavList onNavigate={onClose} />
        </aside>
      </div>
    </>
  );
}
