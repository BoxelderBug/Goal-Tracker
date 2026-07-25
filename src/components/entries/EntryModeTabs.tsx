"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { cn } from "@/lib/cn";
import { enabledCaptureKinds } from "@/lib/domain/capture";
import { useSettings } from "@/components/data/UserDataProvider";

const ENTRY_TABS = [
  { href: "/entry", label: "Single" },
  { href: "/entry/week", label: "Week" },
  { href: "/entry/year", label: "Year" },
  { href: "/journal", label: "Journal" },
];

/** Segmented links across the capture surfaces (single/week/year entry, journal,
 *  questions/ideas/experiments, grading). Kinds switched off in settings drop
 *  out. Wraps on narrow screens. */
export function EntryModeTabs() {
  const pathname = usePathname();
  const settings = useSettings();
  const TABS = [
    ...ENTRY_TABS,
    ...enabledCaptureKinds(settings).map((meta) => ({ href: meta.href, label: meta.label })),
    { href: "/grades", label: "Grading" },
  ];
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
