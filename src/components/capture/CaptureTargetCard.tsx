"use client";

import Link from "next/link";
import { cn } from "@/lib/cn";
import type { CapturePeriodProgress } from "@/lib/domain/capture";
import { formatAmount } from "@/lib/domain/format";
import { Badge } from "@/components/ui/Badge";
import { Card } from "@/components/ui/Card";
import { ProgressBar } from "@/components/ui/ProgressBar";

const TONE_LABEL: Record<"hit" | "onpace" | "behind" | "missed", string> = {
  hit: "Target hit",
  onpace: "On pace",
  behind: "Behind",
  missed: "Off pace",
};

const TONE_BORDER: Record<"hit" | "onpace" | "behind" | "missed", string> = {
  hit: "border-l-tone-hit",
  onpace: "border-l-tone-onpace",
  behind: "border-l-tone-behind",
  missed: "border-l-tone-missed",
};

/** A capture kind's period progress, styled to match GoalPeriodCard. */
export function CaptureTargetCard({ progress }: { progress: CapturePeriodProgress }) {
  const { meta, count, target, pace, tone } = progress;
  return (
    <Card className={cn("flex flex-col gap-3 border-l-4", TONE_BORDER[tone])}>
      <div className="flex flex-wrap items-center justify-between gap-2">
        <div className="flex items-center gap-2">
          <Link href={meta.href} className="font-medium hover:underline">{meta.label}</Link>
          {target > 0 ? <Badge tone={tone}>{TONE_LABEL[tone]}</Badge> : null}
        </div>
        <span className="text-sm text-muted">
          {count}
          {target > 0 ? ` / ${formatAmount(target)}` : ""} logged
        </span>
      </div>
      <ProgressBar
        percent={pace.completion}
        tone={tone}
        projectedPercent={target > 0 ? (pace.projected / target) * 100 : undefined}
      />
      <div className="text-xs text-muted">
        {target > 0 ? (
          <>
            {pace.completion}% · projected {formatAmount(pace.projected)} {meta.unit}
          </>
        ) : (
          <>
            No target set —{" "}
            <Link href="/settings" className="underline hover:text-text">set one in Settings</Link>
          </>
        )}
      </div>
    </Card>
  );
}
