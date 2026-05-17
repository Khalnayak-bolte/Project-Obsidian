import { initializeApp, getApps, getApp, type FirebaseApp } from "firebase/app";
import {
  getAuth,
  type Auth,
  GoogleAuthProvider,
  GithubAuthProvider,
  connectAuthEmulator,
} from "firebase/auth";
import {
  getFirestore,
  type Firestore,
  connectFirestoreEmulator,
  enableIndexedDbPersistence,
} from "firebase/firestore";
import { getMessaging, type Messaging, isSupported } from "firebase/messaging";
import { getAnalytics, type Analytics } from "firebase/analytics";

// ─── Firebase Config ──────────────────────────────────────────────────────────

const firebaseConfig = {
  apiKey: import.meta.env.VITE_FIREBASE_API_KEY,
  authDomain: import.meta.env.VITE_FIREBASE_AUTH_DOMAIN,
  projectId: import.meta.env.VITE_FIREBASE_PROJECT_ID,
  storageBucket: import.meta.env.VITE_FIREBASE_STORAGE_BUCKET,
  messagingSenderId: import.meta.env.VITE_FIREBASE_MESSAGING_SENDER_ID,
  appId: import.meta.env.VITE_FIREBASE_APP_ID,
  measurementId: import.meta.env.VITE_FIREBASE_MEASUREMENT_ID,
};

// ─── Singleton Initialization ─────────────────────────────────────────────────

const app: FirebaseApp = getApps().length === 0 ? initializeApp(firebaseConfig) : getApp();

export const auth: Auth = getAuth(app);
export const db: Firestore = getFirestore(app);

// ─── Auth Providers ───────────────────────────────────────────────────────────

export const googleProvider = new GoogleAuthProvider();
googleProvider.addScope("email");
googleProvider.addScope("profile");
googleProvider.setCustomParameters({ prompt: "select_account" });

export const githubProvider = new GithubAuthProvider();
githubProvider.addScope("read:user");
githubProvider.addScope("user:email");

// ─── Messaging (FCM) ──────────────────────────────────────────────────────────

let messaging: Messaging | null = null;

export const getFirebaseMessaging = async (): Promise<Messaging | null> => {
  try {
    const supported = await isSupported();
    if (supported && !messaging) {
      messaging = getMessaging(app);
    }
    return messaging;
  } catch (error) {
    console.error("[Firebase] Messaging not supported:", error);
    return null;
  }
};

// ─── Analytics ────────────────────────────────────────────────────────────────

let analytics: Analytics | null = null;

export const getFirebaseAnalytics = (): Analytics | null => {
  try {
    if (import.meta.env.PROD && !analytics) {
      analytics = getAnalytics(app);
    }
    return analytics;
  } catch (error) {
    console.error("[Firebase] Analytics init failed:", error);
    return null;
  }
};

// ─── Offline Persistence ──────────────────────────────────────────────────────

export const enableOfflinePersistence = async (): Promise<void> => {
  try {
    await enableIndexedDbPersistence(db);
  } catch (error: unknown) {
    const err = error as { code?: string };
    if (err.code === "failed-precondition") {
      console.warn("[Firebase] Persistence failed: multiple tabs open");
    } else if (err.code === "unimplemented") {
      console.warn("[Firebase] Persistence not supported in this browser");
    } else {
      console.error("[Firebase] Persistence error:", error);
    }
  }
};

// ─── Emulator (Dev Only) ──────────────────────────────────────────────────────

if (import.meta.env.VITE_USE_EMULATORS === "true") {
  connectAuthEmulator(auth, "http://localhost:9099", { disableWarnings: true });
  connectFirestoreEmulator(db, "localhost", 8080);
}

export default app;
