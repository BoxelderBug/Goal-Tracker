import type { ReactNode } from "react";
import { cn } from "@/lib/cn";

type Tone = "neutral" | "accent" | "hit" | "onpace" | "behind" | "missed";

const toneClasses: Record<Tone, string> = {
  neutral: "bg-bg-soft text-muted",
  accent: "bg-accent-soft text-accent-strong",
  hit: "bg-tone-hit/15 text-tone-hit",
  onpace: "bg-tone-onpace/15 text-tone-onpace",
  behind: "bg-tone-behind/15 text-tone-behind",
  missed: "bg-tone-missed/15 text-tone-missed",
};

export function Badge({
  tone = "neutral",
  children,
  className,
}: {
  tone?: Tone;
  children: ReactNode;
  className?: string;
}) {
  return (
    <span
      className={cn(
        "inline-flex items-center gap-1 rounded-full px-2.5 py-0.5 text-xs font-medium",
        toneClasses[tone],
        className,
      )}
    >
      {children}
    </span>
  );
}
