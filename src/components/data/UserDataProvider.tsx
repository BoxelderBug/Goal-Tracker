"use client";

import { createContext, useContext, useEffect, useMemo, type ReactNode } from "react";
import { orderBy, query, where } from "firebase/firestore";
import type { Challenge, Entry, Goal, Settings } from "@/types/models";
import { addDays, getDateKey } from "@/lib/domain/dates";
import { ensureProfileEmailKey } from "@/lib/firebase/actions/profile";
import { challengesRepo, entriesRepo, goalsRepo } from "@/lib/firebase/repos";
import { userDocRef, type UserDocData } from "@/lib/firebase/repos/userDoc";
import { normalizeSettings } from "@/lib/migration/normalize";
import { useCollection } from "@/hooks/useCollection";
import { useDoc } from "@/hooks/useDoc";

interface UserData {
  uid: string;
  settings: Settings;
  goals: Goal[];
  challenges: Challenge[];
  /** entries within the live rolling window (see windowStartKey) */
  entries: Entry[];
  windowStartKey: string;
  loading: boolean;
}

const UserDataContext = createContext<UserData | null>(null);

/** Start of the current year minus 26 weeks — the live entries subscription
 *  window (covers home, week/month/year, and 26-week trends). Older ranges are
 *  fetched on demand elsewhere. */
function computeWindowStartKey(now: Date): string {
  const startOfYear = new Date(now.getFullYear(), 0, 1);
  return getDateKey(addDays(startOfYear, -182));
}

export function UserDataProvider({ uid, children }: { uid: string; children: ReactNode }) {
  const windowStartKey = useMemo(() => computeWindowStartKey(new Date()), []);

  // Keep the profile directory's email lowercased so partner lookup can find
  // this user (self-heals legacy/migrated profiles). Fire-and-forget, once/uid.
  useEffect(() => {
    ensureProfileEmailKey(uid).catch(() => {});
  }, [uid]);

  const userDoc = useDoc<UserDocData>(() => userDocRef(uid), [uid]);
  const goals = useCollection<Goal>(() => goalsRepo.query(uid, orderBy("priority", "desc")), [uid]);
  const challenges = useCollection<Challenge>(() => challengesRepo.query(uid, orderBy("dueDate", "asc")), [uid]);
  const entries = useCollection<Entry>(
    () => query(entriesRepo.ref(uid), where("date", ">=", windowStartKey), orderBy("date", "asc")),
    [uid, windowStartKey],
  );

  // Memoize settings on the stored settings only, so its identity stays stable
  // when unrelated data (goals, entries) updates — consumers can safely reset
  // local drafts when this reference changes.
  const settings = useMemo(() => normalizeSettings(userDoc.data?.settings), [userDoc.data?.settings]);

  const value = useMemo<UserData>(
    () => ({
      uid,
      settings,
      goals: goals.data,
      challenges: challenges.data,
      entries: entries.data,
      windowStartKey,
      loading: userDoc.loading || goals.loading || challenges.loading || entries.loading,
    }),
    [
      uid,
      settings,
      userDoc.loading,
      goals.data,
      goals.loading,
      challenges.data,
      challenges.loading,
      entries.data,
      entries.loading,
      windowStartKey,
    ],
  );

  return <UserDataContext.Provider value={value}>{children}</UserDataContext.Provider>;
}

export function useUserData(): UserData {
  const ctx = useContext(UserDataContext);
  if (!ctx) throw new Error("useUserData must be used inside UserDataProvider");
  return ctx;
}

export function useGoals(): Goal[] {
  return useUserData().goals;
}

export function useSettings(): Settings {
  return useUserData().settings;
}
