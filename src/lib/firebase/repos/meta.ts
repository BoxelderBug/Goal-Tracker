import { doc, getDoc, setDoc, type DocumentReference } from "firebase/firestore";
import { getDb, USERS_COLLECTION } from "@/lib/firebase/client";
import type { KeyedValueMapDoc } from "@/types/models";

/**
 * Small singleton maps under users/{uid}/meta. periodGoalOverrides and
 * stretchGoals are keyed scalar maps always read whole per period view, so one
 * doc each is simpler and cheaper than a subcollection.
 */
const META = "meta";

function metaRef(uid: string, id: string): DocumentReference<KeyedValueMapDoc> {
  return doc(getDb(), USERS_COLLECTION, uid, META, id) as DocumentReference<KeyedValueMapDoc>;
}

export async function getMetaMap(uid: string, id: string): Promise<Record<string, number>> {
  const snap = await getDoc(metaRef(uid, id));
  return snap.exists() ? (snap.data().values ?? {}) : {};
}

/** Merge-write so a second device's contributions are not clobbered. */
export function mergeMetaMap(uid: string, id: string, values: Record<string, number>): Promise<void> {
  return setDoc(metaRef(uid, id), { values }, { merge: true });
}

export const PERIOD_GOAL_OVERRIDES = "periodGoalOverrides";
export const STRETCH_GOALS = "stretchGoals";
