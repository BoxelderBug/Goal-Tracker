import type { ReactNode } from "react";
import { cn } from "@/lib/cn";

export function EmptyState({
  children,
  className,
}: {
  children: ReactNode;
  className?: string;
}) {
  return (
    <p
      className={cn(
        "rounded-xl border border-dashed border-border bg-surface-2 px-4 py-6 text-center text-sm text-muted",
        className,
      )}
    >
      {children}
    </p>
  );
}
