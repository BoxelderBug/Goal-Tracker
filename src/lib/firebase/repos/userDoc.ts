import {
  doc,
  getDoc,
  serverTimestamp,
  setDoc,
  updateDoc,
  type DocumentReference,
} from "firebase/firestore";
import { getDb, USERS_COLLECTION } from "@/lib/firebase/client";
import type { Settings, UserProfile } from "@/types/models";

/** The users/{uid} document: profile + settings + migration marker. */
export interface UserDocData {
  profile?: Partial<UserProfile>;
  settings?: Settings;
  migration?: {
    blobVersion?: number;
    blobMigratedAt?: unknown;
    sourceUpdatedAt?: string | null;
  };
  createdAt?: string;
}

export function userDocRef(uid: string): DocumentReference<UserDocData> {
  return doc(getDb(), USERS_COLLECTION, uid) as DocumentReference<UserDocData>;
}

export async function getUserDoc(uid: string): Promise<UserDocData | null> {
  const snap = await getDoc(userDocRef(uid));
  return snap.exists() ? snap.data() : null;
}

export function updateSettings(uid: string, settings: Settings): Promise<void> {
  return setDoc(userDocRef(uid), { settings }, { merge: true });
}

export function markMigrated(uid: string, sourceUpdatedAt: string | null): Promise<void> {
  return updateDoc(userDocRef(uid), {
    "migration.blobVersion": 1,
    "migration.blobMigratedAt": serverTimestamp(),
    "migration.sourceUpdatedAt": sourceUpdatedAt,
  });
}
