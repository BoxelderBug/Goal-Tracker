"use client";

import { useEffect, useRef, type ReactNode } from "react";
import { cn } from "@/lib/cn";
import { Button } from "./Button";

export function Modal({
  open,
  onClose,
  title,
  children,
  className,
}: {
  open: boolean;
  onClose: () => void;
  title?: ReactNode;
  children: ReactNode;
  className?: string;
}) {
  const ref = useRef<HTMLDialogElement>(null);

  useEffect(() => {
    const dialog = ref.current;
    if (!dialog) return;
    if (open && !dialog.open) dialog.showModal();
    if (!open && dialog.open) dialog.close();
  }, [open]);

  return (
    <dialog
      ref={ref}
      onClose={onClose}
      onClick={(event) => {
        // click on the backdrop (the dialog element itself) closes
        if (event.target === ref.current) onClose();
      }}
      className={cn(
        "m-auto w-[min(92vw,34rem)] rounded-2xl border border-border bg-surface p-0",
        "text-text shadow-card backdrop:bg-black/40 backdrop:backdrop-blur-sm",
        className,
      )}
    >
      <div className="flex max-h-[85vh] flex-col p-5">
        {title ? (
          <div className="mb-3 flex items-start justify-between gap-4">
            <h2 className="text-lg">{title}</h2>
            <Button variant="ghost" size="sm" aria-label="Close" onClick={onClose}>
              ✕
            </Button>
          </div>
        ) : null}
        <div className="overflow-y-auto">{children}</div>
      </div>
    </dialog>
  );
}
