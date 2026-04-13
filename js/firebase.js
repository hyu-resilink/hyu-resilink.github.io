// js/firebase.js
// ─────────────────────────────────────────────────────────────
// Firebase initialization — single source of truth for app, db, auth, messaging.
// NOTE: Unified on SDK 10.12.0 to fix duplicate initializeApp conflict.
// ─────────────────────────────────────────────────────────────

import { initializeApp }
  from "https://www.gstatic.com/firebasejs/10.12.0/firebase-app.js";
import { getAuth }
  from "https://www.gstatic.com/firebasejs/10.12.0/firebase-auth.js";
import { getFirestore, enableIndexedDbPersistence }
  from "https://www.gstatic.com/firebasejs/10.12.0/firebase-firestore.js";
import { getMessaging }
  from "https://www.gstatic.com/firebasejs/10.12.0/firebase-messaging.js";

const firebaseConfig = {
  apiKey:            "AIzaSyDgpI9Qn8Z_gvz9lruhq5VmZ8frEUlNKN4",
  authDomain:        "disaster-map-platform.firebaseapp.com",
  projectId:         "disaster-map-platform",
  storageBucket:     "disaster-map-platform.firebasestorage.app",
  messagingSenderId: "741032743359",
  appId:             "1:741032743359:web:bbe517d850e766e6ed910a",
};

// ── Initialize Firebase ────────────────────────────────────────
const app = initializeApp(firebaseConfig);

export const auth      = getAuth(app);
export const db        = getFirestore(app);
export const messaging = getMessaging(app);

// ── Enable Firestore offline persistence ───────────────────────
enableIndexedDbPersistence(db).catch((err) => {
  if (err.code === "failed-precondition") {
    console.warn("[Firestore] Persistence unavailable: multiple tabs open.");
  } else if (err.code === "unimplemented") {
    console.warn("[Firestore] Persistence not supported by this browser.");
  } else {
    console.warn("[Firestore] Persistence error:", err);
  }
});