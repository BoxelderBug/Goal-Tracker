"use client";

import { useEffect, useMemo, useRef } from "react";
import { collection, query, where } from "firebase/firestore";
import type { GoalShare } from "@/types/models";
import { useSettings, useUserData } from "@/components/data/UserDataProvider";
import { useCollection } from "@/hooks/useCollection";
import { idConverter } from "@/lib/firebase/converters";
import { GOAL_SHARE_COLLECTION, getDb } from "@/lib/firebase/client";
import { buildGoalSummary } from "@/lib/domain/share";
import { pushGoalSummary } from "@/lib/firebase/actions/shares";

/**
 * Keeps approved outgoing shares' goalSummary fresh automatically: whenever the
 * owner's entries change, recompute each shared goal's weekly summary and push
 * it if it drifted from what's stored. Renders nothing.
 *
 * Loop-safe: pushGoalSummary triggers a share-snapshot update, but the
 * recomputed summary then equals the stored one (updatedAt excluded from the
 * comparison), so no second write happens. Debounced to batch entry bursts
 * (e.g. week-grid saves).
 */
export function ShareAutoSync() {
  const { uid, goals, entries } = useUserData();
  const settings = useSettings();

  const outgoing = useCollection<GoalShare>(
    () =>
      query(
        collection(getDb(), GOAL_SHARE_COLLECTION).withConverter(idConverter<GoalShare>()),
        where("ownerUid", "==", uid),
      ),
    [uid],
  );

  const approved = useMemo(() => outgoing.data.filter((s) => s.status === "approved"), [outgoing.data]);

  const timer = useRef<ReturnType<typeof setTimeout> | null>(null);
  useEffect(() => {
    if (approved.length === 0 || goals.length === 0) return;
    if (timer.current) clearTimeout(timer.current);
    timer.current = setTimeout(() => {
      const now = new Date();
      for (const share of approved) {
        const goal = goals.find((g) => g.id === share.ownerGoalId);
        if (!goal || goal.archived) continue;
        const next = buildGoalSummary(goal, entries, settings.weekStart, now);
        const cur = share.goalSummary;
        const same =
          cur &&
          cur.progress === next.progress &&
          cur.target === next.target &&
          cur.rangeStart === next.rangeStart &&
          cur.rangeEnd === next.rangeEnd;
        if (!same) pushGoalSummary(share, next).catch(() => {});
      }
    }, 2500);
    return () => {
      if (timer.current) clearTimeout(timer.current);
    };
  }, [approved, goals, entries, settings.weekStart]);

  return null;
}
