'use strict';
// js/config/firebase.js

const admin = require('firebase-admin');

let _app;

function initializeFirebase() {
  if (admin.apps && admin.apps.length > 0) {
    return admin.apps[0];
  }

  const serviceAccountJson = process.env.FIREBASE_SERVICE_ACCOUNT_JSON;
  let credential;

  if (serviceAccountJson) {
    try {
      const serviceAccount = JSON.parse(serviceAccountJson);
      credential = admin.credential.cert(serviceAccount);
    } catch (e) {
      console.error('[Firebase] Failed to parse FIREBASE_SERVICE_ACCOUNT_JSON:', e.message);
      process.exit(1);
    }
  } else if (process.env.GOOGLE_APPLICATION_CREDENTIALS) {
    credential = admin.credential.applicationDefault();
  } else {
    console.warn('[Firebase] No credentials provided. Set FIREBASE_SERVICE_ACCOUNT_JSON or GOOGLE_APPLICATION_CREDENTIALS');
    credential = admin.credential.applicationDefault();
  }

  _app = admin.initializeApp({
    credential,
    databaseURL: process.env.FIREBASE_DATABASE_URL,
    storageBucket: process.env.FIREBASE_STORAGE_BUCKET,
  });

  console.log('[Firebase] Admin SDK initialized');
  return _app;
}

initializeFirebase();

const db        = admin.firestore();
const auth      = admin.auth();
const messaging = admin.messaging();
const FieldValue = admin.firestore.FieldValue;
const Timestamp  = admin.firestore.Timestamp;

const COLLECTIONS = {
  WORKSPACES:     'workspaces',
  USERS:          'users',
  CHANNELS:       'channels',
  MESSAGES:       'messages',
  VOICE_SESSIONS: 'voiceSessions',
  SUBSCRIPTIONS:  'subscriptions',
  ROLES:          'roles',
  NOTIFICATIONS:  'notifications',
  ACTIVITY_LOGS:  'activityLogs',
  FILES:          'files',
};

module.exports = { db, auth, messaging, FieldValue, Timestamp, COLLECTIONS };
