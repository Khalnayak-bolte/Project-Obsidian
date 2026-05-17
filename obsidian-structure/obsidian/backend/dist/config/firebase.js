import * as admin from "firebase-admin";
let app;
const initializeFirebase = () => {
    if (admin.apps.length > 0) {
        return admin.apps[0];
    }
    const serviceAccount = process.env.FIREBASE_SERVICE_ACCOUNT_JSON
        ? JSON.parse(process.env.FIREBASE_SERVICE_ACCOUNT_JSON)
        : undefined;
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
};
export default firebaseApp;
//# sourceMappingURL=firebase.js.map