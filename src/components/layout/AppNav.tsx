"use client";

import { useEffect, useState } from "react";
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
}

const GROUPS: { heading: string; items: NavItem[] }[] = [
  {
    heading: "Track",
    items: [
      { href: "/", label: "Home" },
      { href: "/entry", label: "Add Entry" },
      { href: "/entry/week", label: "Week Update" },
      { href: "/entry/year", label: "Year Update" },
    ],
  },
  {
    heading: "Review",
    items: [
      { href: "/week", label: "Week" },
      { href: "/month", label: "Month" },
      { href: "/quarter", label: "Quarter", show: (s) => s.quartersEnabled },
      { href: "/year", label: "Year" },
      { href: "/entries", label: "All Entries" },
      { href: "/snapshots", label: "Snapshots" },
      { href: "/trends", label: "Trends" },
      { href: "/goals-plus", label: "Goals+" },
      { href: "/data", label: "Data" },
    ],
  },
  {
    heading: "More",
    items: [
      { href: "/points", label: "Points", show: (s) => s.rewardPointsEnabled },
      { href: "/bucket-list", label: "Bucket List", show: (s) => s.bucketListEnabled },
      { href: "/journal", label: "Journal" },
      { href: "/ideas", label: "Ideas" },
      { href: "/schedule", label: "Schedule" },
      { href: "/social", label: "Social" },
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

function NavList({ onNavigate }: { onNavigate?: () => void }) {
  const pathname = usePathname();
  const settings = useSettings();

  const [openGroups, setOpenGroups] = useState<Set<string>>(() => {
    const h = activeHeading(pathname);
    return new Set(h ? [h] : ["Track"]);
  });

  // keep the group you navigate into expanded (without collapsing others you opened)
  useEffect(() => {
    const h = activeHeading(pathname);
    if (h) setOpenGroups((prev) => (prev.has(h) ? prev : new Set(prev).add(h)));
  }, [pathname]);

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
                {items.map((item) => {
                  const active = pathname === item.href;
                  return (
                    <Link
                      key={item.href}
                      href={item.href}
                      onClick={onNavigate}
                      aria-current={active ? "page" : undefined}
                      className={cn(
                        "rounded-lg px-3 py-1.5 text-sm font-medium transition-colors",
                        active ? "bg-accent text-on-accent" : "text-text hover:bg-accent-soft",
                      )}
                    >
                      {item.label}
                    </Link>
                  );
                })}
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
