import admin from "firebase-admin";

let app: admin.app.App | undefined;

const initializeFirebase = (): admin.app.App => {
  const apps = admin.apps;
  if (apps && apps.length > 0) {
    return apps[0] as admin.app.App;
  }

  const serviceAccount = process.env.FIREBASE_SERVICE_ACCOUNT_JSON
    ? JSON.parse(process.env.FIREBASE_SERVICE_ACCOUNT_JSON)
    : undefined;

  if (!serviceAccount && !process.env.GOOGLE_APPLICATION_CREDENTIALS) {
    console.warn("[Firebase] No credentials provided. Set FIREBASE_SERVICE_ACCOUNT_JSON or GOOGLE_APPLICATION_CREDENTIALS");
  }

  app = admin.initializeApp({
    credential: serviceAccount
      ? admin.credential.cert(serviceAccount)
      : admin.credential.applicationDefault(),
    databaseURL: process.env.FIREBASE_DATABASE_URL,
    storageBucket: process.env.FIREBASE_STORAGE_BUCKET,
  });

  console.log("[Firebase] Admin SDK initialized");
  return app;
};

const firebaseApp = initializeFirebase();

// Firestore instance
export const db = admin.firestore();

// Firebase Auth instance
export const auth = admin.auth();

// Firebase Cloud Messaging instance
export const messaging = admin.messaging();

// Firestore field utilities
export const { FieldValue, Timestamp } = admin.firestore;

// Collection name constants — single source of truth
export const COLLECTIONS = {
  WORKSPACES: "workspaces",
  USERS: "users",
  CHANNELS: "channels",
  MESSAGES: "messages",
  VOICE_SESSIONS: "voiceSessions",
  SUBSCRIPTIONS: "subscriptions",
  ROLES: "roles",
  NOTIFICATIONS: "notifications",
  ACTIVITY_LOGS: "activityLogs",
  FILES: "files",
} as const;

export type CollectionName = (typeof COLLECTIONS)[keyof typeof COLLECTIONS];

export default firebaseApp;