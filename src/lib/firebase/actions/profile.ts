import { doc, getDoc, setDoc } from "firebase/firestore";
import { PROFILE_COLLECTION, getDb, getFirebaseAuth } from "@/lib/firebase/client";

/**
 * Ensure the signed-in user's public profile directory entry stores a
 * lowercased email. Partner lookup (findProfileByEmail) does an exact,
 * case-sensitive Firestore match, so a mixed-case stored email — as legacy /
 * migrated profiles can have — would be unfindable. This self-heals such
 * profiles on load. Idempotent: only writes when the stored value differs.
 */
export async function ensureProfileEmailKey(uid: string): Promise<void> {
  const email = getFirebaseAuth().currentUser?.email;
  if (!email) return;
  const lower = email.trim().toLowerCase();
  const ref = doc(getDb(), PROFILE_COLLECTION, uid);
  const snap = await getDoc(ref);
  if (snap.exists() && (snap.data() as { email?: string }).email === lower) return;
  await setDoc(ref, { email: lower }, { merge: true });
}
