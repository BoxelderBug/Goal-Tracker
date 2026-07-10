"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { cn } from "@/lib/cn";
import { useSettings } from "@/components/data/UserDataProvider";

interface NavItem {
  href: string;
  label: string;
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
      { href: "/year", label: "Year" },
      { href: "/entries", label: "All Entries" },
      { href: "/snapshots", label: "Snapshots" },
      { href: "/trends", label: "Trends" },
      { href: "/goals-plus", label: "Goals+" },
      { href: "/data", label: "Data" },
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
            {group.items.map((item) => {
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
            {group.heading === "Review" && settings.quartersEnabled ? (
              <Link
                href="/quarter"
                aria-current={pathname === "/quarter" ? "page" : undefined}
                className={cn(
                  "rounded-lg px-2.5 py-1 text-sm font-medium transition-colors",
                  pathname === "/quarter" ? "bg-accent text-on-accent" : "text-text hover:bg-accent-soft",
                )}
              >
                Quarter
              </Link>
            ) : null}
          </div>
        </div>
      ))}
    </nav>
  );
}
