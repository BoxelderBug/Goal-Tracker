/**
 * Accountability-partner sharing. Cross-user writes to the top-level
 * goalTrackerGoalShares collection, guarded by the deployed Firestore rules
 * (owner creates/deletes; owner or partner read/update). Partner lookup uses
 * the goalTrackerProfiles email directory (readable by any signed-in user).
 *
 * This slice covers view-sharing (owner pushes a goal summary the partner can
 * see). Partner-authored entry writes — already permitted by the entries rule —
 * are a later slice.
 */
import {
  collection,
  deleteDoc,
  doc,
  getDocs,
  limit,
  query,
  setDoc,
  updateDoc,
  where,
} from "firebase/firestore";
import type { Goal, GoalShare } from "@/types/models";
import type { GoalSummary } from "@/lib/domain/share";
import { GOAL_SHARE_COLLECTION, PROFILE_COLLECTION, getDb } from "@/lib/firebase/client";
import { createId } from "@/lib/id";

export interface OwnerIdentity {
  uid: string;
  email: string;
  username: string;
}

export interface PartnerProfile {
  uid: string;
  email: string;
  username: string;
  name: string;
}

/** Resolve a partner by email via the public profile directory. */
export async function findProfileByEmail(email: string): Promise<PartnerProfile | null> {
  const normalized = email.trim().toLowerCase();
  if (!normalized) return null;
  const snap = await getDocs(
    query(collection(getDb(), PROFILE_COLLECTION), where("email", "==", normalized), limit(1)),
  );
  if (snap.empty) return null;
  const d = snap.docs[0];
  const data = d.data() as { email?: string; username?: string; firstName?: string; lastName?: string };
  return {
    uid: d.id,
    email: data.email ?? normalized,
    username: data.username ?? "",
    name: [data.firstName, data.lastName].filter(Boolean).join(" ").trim(),
  };
}

function shareRef(id: string) {
  return doc(getDb(), GOAL_SHARE_COLLECTION, id);
}

/** Owner invites a partner to follow one goal. Throws with a friendly message. */
export async function invitePartner(owner: OwnerIdentity, goal: Goal, partnerEmail: string): Promise<GoalShare> {
  const partner = await findProfileByEmail(partnerEmail);
  if (!partner) throw new Error("No account found with that email.");
  if (partner.uid === owner.uid) throw new Error("You can't share a goal with yourself.");

  const nowIso = new Date().toISOString();
  const share: GoalShare = {
    id: createId(),
    ownerUid: owner.uid,
    ownerGoalId: goal.id,
    ownerUsername: owner.username,
    ownerEmail: owner.email,
    partnerUid: partner.uid,
    partnerEmail: partner.email,
    partnerName: partner.name || partner.username,
    goalName: goal.name,
    goalUnit: goal.unit,
    status: "pending",
    createdAt: nowIso,
    approvedAt: null,
    updatedAt: nowIso,
  };
  // `goalId` mirrors ownerGoalId for the entries partner-write rule (forward-compat).
  await setDoc(shareRef(share.id), { ...share, goalId: goal.id });
  return share;
}

/** Partner accepts or declines a pending invite. */
export async function respondToShare(share: GoalShare, accept: boolean): Promise<void> {
  const nowIso = new Date().toISOString();
  await updateDoc(shareRef(share.id), {
    status: accept ? "approved" : "rejected",
    approvedAt: accept ? nowIso : null,
    updatedAt: nowIso,
  });
}

/** Owner pushes the latest goal summary so the partner sees current progress. */
export async function pushGoalSummary(share: GoalShare, summary: GoalSummary): Promise<void> {
  await updateDoc(shareRef(share.id), { goalSummary: summary, updatedAt: new Date().toISOString() });
}

/** Owner removes a share entirely. */
export async function removeShare(share: GoalShare): Promise<void> {
  await deleteDoc(shareRef(share.id));
}
