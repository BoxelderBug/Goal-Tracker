"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { cn } from "@/lib/cn";

const TABS = [
  { href: "/entry", label: "Single" },
  { href: "/entry/week", label: "Week" },
  { href: "/entry/year", label: "Year" },
  { href: "/journal", label: "Journal" },
  { href: "/ideas", label: "Q/I" },
  { href: "/grades", label: "Grading" },
];

/** Segmented links across the capture surfaces (single/week/year entry, journal,
 *  ideas). Wraps on narrow screens. */
export function EntryModeTabs() {
  const pathname = usePathname();
  return (
    <div className="flex w-fit flex-wrap gap-1 rounded-xl border border-border bg-surface p-1">
      {TABS.map((tab) => {
        const active = pathname === tab.href;
        return (
          <Link
            key={tab.href}
            href={tab.href}
            aria-current={active ? "page" : undefined}
            className={cn(
              "rounded-lg px-3 py-1.5 text-sm font-medium transition-colors",
              active ? "bg-accent text-on-accent" : "text-text hover:bg-accent-soft",
            )}
          >
            {tab.label}
          </Link>
        );
      })}
    </div>
  );
}
