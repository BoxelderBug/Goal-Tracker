"use client";

import { useMemo } from "react";
import { where } from "firebase/firestore";
import type { ExperimentEntry, IdeaEntry, PeriodKind } from "@/types/models";
import type { DateRange } from "@/lib/domain/dates";
import { getDateKey } from "@/lib/domain/dates";
import { computeCapturePeriod, enabledCaptureKinds } from "@/lib/domain/capture";
import { experimentsRepo, ideasRepo } from "@/lib/firebase/repos";
import { useSettings, useUserData } from "@/components/data/UserDataProvider";
import { useCollection } from "@/hooks/useCollection";
import { CaptureTargetCard } from "./CaptureTargetCard";

/**
 * Questions / ideas / experiments logged in the viewed period, shown next to
 * the goal cards. Only the enabled kinds appear; the items are fetched for the
 * viewed range alone (they live outside the entries subscription window).
 */
export function CapturePeriodSection({
  period,
  range,
  now,
}: {
  period: PeriodKind;
  range: DateRange;
  now: Date;
}) {
  const { uid } = useUserData();
  const settings = useSettings();

  const kinds = useMemo(() => enabledCaptureKinds(settings), [settings]);
  const needsIdeas = kinds.some((k) => k.kind === "question" || k.kind === "idea");
  const needsExperiments = kinds.some((k) => k.kind === "experiment");

  const startKey = getDateKey(range.start);
  const endKey = getDateKey(range.end);

  const ideas = useCollection<IdeaEntry>(
    () =>
      needsIdeas
        ? ideasRepo.query(uid, where("date", ">=", startKey), where("date", "<=", endKey))
        : null,
    [uid, needsIdeas, startKey, endKey],
  );
  const experiments = useCollection<ExperimentEntry>(
    () =>
      needsExperiments
        ? experimentsRepo.query(uid, where("date", ">=", startKey), where("date", "<=", endKey))
        : null,
    [uid, needsExperiments, startKey, endKey],
  );

  const cards = useMemo(
    () =>
      kinds
        .map((meta) => {
          const items =
            meta.kind === "experiment"
              ? experiments.data
              : ideas.data.filter((i) => (i.type === "question") === (meta.kind === "question"));
          return computeCapturePeriod(settings, meta.kind, items, period, range, now);
        })
        // nothing to say about a kind with no target and nothing logged
        .filter((card) => card.target > 0 || card.count > 0),
    [kinds, ideas.data, experiments.data, settings, period, range, now],
  );

  if (cards.length === 0) return null;

  return (
    <div className="flex flex-col gap-2">
      <h2 className="text-sm font-semibold uppercase tracking-wide text-muted">Capture targets</h2>
      <div className="grid gap-3">
        {cards.map((card) => (
          <CaptureTargetCard key={card.meta.kind} progress={card} />
        ))}
      </div>
    </div>
  );
}
