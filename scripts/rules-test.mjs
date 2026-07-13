/**
 * Firestore security-rules test for accountability sharing. Run under the
 * emulator:
 *   npx -y firebase-tools emulators:exec --only firestore --project demo-goal-tracker \
 *     "node scripts/rules-test.mjs"
 * Verifies the cross-user share/profile/notification/entry rules the /partners
 * feature relies on (which can't be exercised against production).
 */
import { readFileSync } from "node:fs";
import {
  initializeTestEnvironment,
  assertFails,
  assertSucceeds,
} from "@firebase/rules-unit-testing";
import { doc, getDoc, setDoc, updateDoc, deleteDoc } from "firebase/firestore";

const env = await initializeTestEnvironment({
  projectId: "demo-goal-tracker",
  firestore: { rules: readFileSync("firestore.rules", "utf8") },
});

const owner = env.authenticatedContext("owner").firestore();
const partner = env.authenticatedContext("partner").firestore();
const stranger = env.authenticatedContext("stranger").firestore();

let passed = 0;
let failed = 0;
async function check(name, promise) {
  try {
    await promise;
    passed += 1;
    console.log("  ✓", name);
  } catch (e) {
    failed += 1;
    console.error("  ✗", name, "—", e?.message || e);
  }
}

// Seed a partner profile with rules disabled.
await env.withSecurityRulesDisabled(async (ctx) => {
  await setDoc(doc(ctx.firestore(), "goalTrackerProfiles", "partner"), {
    email: "partner@example.com",
    username: "partner",
  });
});

// Profiles (email directory).
await check("signed-in user reads a profile", assertSucceeds(getDoc(doc(owner, "goalTrackerProfiles", "partner"))));
await check("owner writes own profile", assertSucceeds(setDoc(doc(owner, "goalTrackerProfiles", "owner"), { email: "o@x.com" })));
await check("cannot write another's profile", assertFails(setDoc(doc(stranger, "goalTrackerProfiles", "partner"), { email: "evil" })));

// Shares.
const share = (over = {}) => ({ ownerUid: "owner", partnerUid: "partner", ownerGoalId: "g1", goalId: "g1", status: "pending", goalName: "Run", ...over });
await check("owner creates own share", assertSucceeds(setDoc(doc(owner, "goalTrackerGoalShares", "s1"), share())));
await check("cannot create share spoofing ownerUid", assertFails(setDoc(doc(stranger, "goalTrackerGoalShares", "s2"), share())));
await check("partner reads the share", assertSucceeds(getDoc(doc(partner, "goalTrackerGoalShares", "s1"))));
await check("stranger cannot read the share", assertFails(getDoc(doc(stranger, "goalTrackerGoalShares", "s1"))));
await check("partner approves (update)", assertSucceeds(updateDoc(doc(partner, "goalTrackerGoalShares", "s1"), { status: "approved" })));
await check("owner pushes summary (update)", assertSucceeds(updateDoc(doc(owner, "goalTrackerGoalShares", "s1"), { goalSummary: { progress: 5 } })));
await check("stranger cannot update the share", assertFails(updateDoc(doc(stranger, "goalTrackerGoalShares", "s1"), { status: "rejected" })));
await check("partner cannot delete the share", assertFails(deleteDoc(doc(partner, "goalTrackerGoalShares", "s1"))));

// Notifications.
await check("anyone signed in creates a notification", assertSucceeds(setDoc(doc(owner, "goalTrackerNotifications", "n1"), { recipientId: "partner", type: "goal-share-invite" })));
await check("recipient reads own notification", assertSucceeds(getDoc(doc(partner, "goalTrackerNotifications", "n1"))));
await check("non-recipient cannot read notification", assertFails(getDoc(doc(stranger, "goalTrackerNotifications", "n1"))));

// Partner-authored entry writes for the now-approved share s1.
await check("partner writes entry for approved shared goal", assertSucceeds(setDoc(doc(partner, "users", "owner", "entries", "e1"), { shareId: "s1", trackerId: "g1", createdBy: "partner", amount: 3, date: "2026-07-08" })));
await check("partner cannot write entry for the wrong goal", assertFails(setDoc(doc(partner, "users", "owner", "entries", "e2"), { shareId: "s1", trackerId: "gX", createdBy: "partner", amount: 3 })));
await check("partner cannot read owner's entries", assertFails(getDoc(doc(partner, "users", "owner", "entries", "e1"))));
await check("owner has full access to own data", assertSucceeds(setDoc(doc(owner, "users", "owner", "entries", "e3"), { trackerId: "g1", amount: 1 })));
await check("stranger cannot touch owner data", assertFails(getDoc(doc(stranger, "users", "owner", "entries", "e3"))));

await env.cleanup();
console.log(`\n${passed} passed, ${failed} failed`);
process.exit(failed ? 1 : 0);
