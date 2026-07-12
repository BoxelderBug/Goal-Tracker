"use client";

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

function NavList({ onNavigate }: { onNavigate?: () => void }) {
  const pathname = usePathname();
  const settings = useSettings();

  return (
    <nav aria-label="Primary" className="flex flex-col gap-5">
      {GROUPS.map((group) => (
        <div key={group.heading} className="flex flex-col gap-1">
          <span className="px-3 text-xs font-semibold uppercase tracking-wide text-muted">
            {group.heading}
          </span>
          {group.items
            .filter((item) => !item.show || item.show(settings))
            .map((item) => {
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
      ))}
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
