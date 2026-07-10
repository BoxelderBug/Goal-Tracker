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

export function AppNav() {
  const pathname = usePathname();
  const settings = useSettings();

  return (
    <nav aria-label="Primary" className="flex flex-wrap gap-x-6 gap-y-3 rounded-2xl border border-border bg-surface px-4 py-3 shadow-soft">
      {GROUPS.map((group) => (
        <div key={group.heading} className="flex flex-col gap-1.5">
          <span className="text-xs font-semibold uppercase tracking-wide text-muted">
            {group.heading}
          </span>
          <div className="flex flex-wrap gap-1">
            {group.items
              .filter((item) => !item.show || item.show(settings))
              .map((item) => {
                const active = pathname === item.href;
                return (
                  <Link
                    key={item.href}
                    href={item.href}
                    aria-current={active ? "page" : undefined}
                    className={cn(
                      "rounded-lg px-2.5 py-1 text-sm font-medium transition-colors",
                      active ? "bg-accent text-on-accent" : "text-text hover:bg-accent-soft",
                    )}
                  >
                    {item.label}
                  </Link>
                );
              })}
          </div>
        </div>
      ))}
    </nav>
  );
}
