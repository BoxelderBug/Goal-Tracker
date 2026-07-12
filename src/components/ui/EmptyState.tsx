import type { ReactNode } from "react";
import { cn } from "@/lib/cn";

export function EmptyState({
  children,
  action,
  className,
}: {
  children: ReactNode;
  /** optional primary action rendered under the message */
  action?: ReactNode;
  className?: string;
}) {
  return (
    <div
      className={cn(
        "flex flex-col items-center gap-3 rounded-xl border border-dashed border-border bg-surface-2 px-4 py-8 text-center",
        className,
      )}
    >
      <p className="text-sm text-muted">{children}</p>
      {action}
    </div>
  );
}
