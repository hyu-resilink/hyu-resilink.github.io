// js/firebase.js
// ─────────────────────────────────────────────────────────────
// Firebase initialization — single source of truth for app, db, auth.
// Firestore offline persistence is enabled here so cached data
// is available during offline cold starts.
// ─────────────────────────────────────────────────────────────

import { initializeApp }
  from "https://www.gstatic.com/firebasejs/10.7.1/firebase-app.js";
import { getAuth }
  from "https://www.gstatic.com/firebasejs/10.7.1/firebase-auth.js";
import { getFirestore, enableIndexedDbPersistence }
  from "https://www.gstatic.com/firebasejs/10.7.1/firebase-firestore.js";
  import { initializeApp } from "https://www.gstatic.com/firebasejs/10.12.0/firebase-app.js";
import { getMessaging, getToken, onMessage } from "https://www.gstatic.com/firebasejs/10.12.0/firebase-messaging.js";



const firebaseConfig = {
  apiKey:            "AIzaSyDgpI9Qn8Z_gvz9lruhq5VmZ8frEUlNKN4",
  authDomain:        "disaster-map-platform.firebaseapp.com",
  projectId:         "disaster-map-platform",
  storageBucket:     "disaster-map-platform.firebasestorage.app",
  messagingSenderId: "741032743359",
  appId:             "1:741032743359:web:bbe517d850e766e6ed910a",
};

// ── Initialize Firebase ────────────────────────────────────────
const app  = initializeApp(firebaseConfig);
export const auth = getAuth(app);
export const db   = getFirestore(app);
const messaging = getMessaging(app);

// ── Enable Firestore offline persistence ───────────────────────
// This allows Firestore to serve cached documents while offline.
// Must be called before any Firestore reads/writes.
enableIndexedDbPersistence(db).catch((err) => {
  if (err.code === 'failed-precondition') {
    // Multiple tabs open — persistence can only be enabled in one tab at a time.
    console.warn('[Firestore] Persistence unavailable: multiple tabs open.');
  } else if (err.code === 'unimplemented') {
    // Browser does not support IndexedDB.
    console.warn('[Firestore] Persistence not supported by this browser.');
  } else {
    console.warn('[Firestore] Persistence error:', err);
  }
});