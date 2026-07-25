"use client";

import { useMemo } from "react";
import type { DateKey, PeriodKind } from "@/types/models";
import { computeCapturePeriod, type CaptureKind } from "@/lib/domain/capture";
import { getPeriodRange } from "@/lib/domain/periods";
import { formatAmount } from "@/lib/domain/format";
import { useSettings } from "@/components/data/UserDataProvider";
import { Card } from "@/components/ui/Card";
import { ProgressBar } from "@/components/ui/ProgressBar";

const PERIODS: { period: PeriodKind; label: string }[] = [
  { period: "week", label: "This week" },
  { period: "month", label: "This month" },
  { period: "year", label: "This year" },
];

/** Weekly / monthly / yearly target progress for one capture kind. */
export function CaptureTargetsStrip({
  kind,
  items,
  now,
}: {
  kind: CaptureKind;
  items: { date: DateKey }[];
  now: Date;
}) {
  const settings = useSettings();

  const cells = useMemo(
    () =>
      PERIODS.map(({ period, label }) => {
        const range = getPeriodRange(period, now, settings.weekStart);
        return { label, progress: computeCapturePeriod(settings, kind, items, period, range, now) };
      }),
    [kind, items, settings, now],
  );

  return (
    <Card className="grid gap-4 sm:grid-cols-3">
      {cells.map(({ label, progress }) => (
        <div key={label} className="flex flex-col gap-1.5">
          <span className="text-xs uppercase tracking-wide text-muted">{label}</span>
          <span className="font-display text-xl">
            {progress.count}
            {progress.target > 0 ? (
              <span className="text-base text-muted"> / {formatAmount(progress.target)}</span>
            ) : null}
          </span>
          {progress.target > 0 ? (
            <ProgressBar percent={progress.pace.completion} tone={progress.tone} />
          ) : (
            <span className="text-xs text-muted">no target</span>
          )}
        </div>
      ))}
    </Card>
  );
}
