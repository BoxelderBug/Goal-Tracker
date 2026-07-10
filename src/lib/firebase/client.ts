import { getApps, initializeApp, type FirebaseApp } from "firebase/app";
import { getAuth, type Auth } from "firebase/auth";
import {
  initializeFirestore,
  persistentLocalCache,
  persistentMultipleTabManager,
  type Firestore,
} from "firebase/firestore";

// Public web-app config (same project as the legacy app). Firebase web API
// keys are not secrets; access control lives in Firestore security rules.
const firebaseConfig = {
  apiKey: process.env.NEXT_PUBLIC_FIREBASE_API_KEY ?? "AIzaSyCp1WYms8u5dkUg-3zLcRWX5v11iglF1-U",
  authDomain: process.env.NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN ?? "goal-tracker-d0a58.firebaseapp.com",
  projectId: process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID ?? "goal-tracker-d0a58",
  storageBucket:
    process.env.NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET ?? "goal-tracker-d0a58.firebasestorage.app",
  messagingSenderId: process.env.NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID ?? "891314847608",
  appId: process.env.NEXT_PUBLIC_FIREBASE_APP_ID ?? "1:891314847608:web:61c63ac9e6db74554c528d",
};

let app: FirebaseApp | undefined;
let firestore: Firestore | undefined;

export function getFirebaseApp(): FirebaseApp {
  if (!app) {
    app = getApps()[0] ?? initializeApp(firebaseConfig);
  }
  return app;
}

export function getFirebaseAuth(): Auth {
  return getAuth(getFirebaseApp());
}

/**
 * Firestore with persistent offline cache (multi-tab). This replaces the
 * legacy app's hand-rolled localStorage mirror: reads come from the local
 * cache when offline, writes queue, and onSnapshot echoes local writes
 * immediately, so UI updates are optimistic by default.
 */
export function getDb(): Firestore {
  if (!firestore) {
    firestore = initializeFirestore(getFirebaseApp(), {
      localCache: persistentLocalCache({ tabManager: persistentMultipleTabManager() }),
    });
  }
  return firestore;
}

export const PROFILE_COLLECTION = "goalTrackerProfiles";
export const NOTIFICATION_COLLECTION = "goalTrackerNotifications";
export const GOAL_SHARE_COLLECTION = "goalTrackerGoalShares";
export const LEGACY_BLOB_COLLECTION = "goalTrackerData";
export const USERS_COLLECTION = "users";
