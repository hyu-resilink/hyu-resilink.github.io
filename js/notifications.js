// js/notifications.js
// ─────────────────────────────────────────────────────────────
// Push notification setup for the client side.
//
// Responsibilities:
//  1. Request notification permission from the user
//  2. Get FCM token and save it to Firestore (fcmTokens collection)
//  3. Handle foreground messages (app is open) with a toast banner
//  4. Clean up stale token when user logs out
// ─────────────────────────────────────────────────────────────

import { messaging, db, auth } from "./firebase.js";
import { getToken, onMessage }
  from "https://www.gstatic.com/firebasejs/10.12.0/firebase-messaging.js";
import { doc, setDoc, deleteDoc, serverTimestamp }
  from "https://www.gstatic.com/firebasejs/10.12.0/firebase-firestore.js";

// ── PASTE YOUR VAPID KEY HERE ──────────────────────────────────
// Firebase Console → Project Settings → Cloud Messaging →
// Web Push certificates → Generate key pair → copy the Key pair value
const VAPID_KEY = "YOUR_VAPID_PUBLIC_KEY_HERE";

// ── REQUEST PERMISSION + SAVE TOKEN ───────────────────────────
/**
 * Call this once after the user logs in.
 * Asks for notification permission and saves the FCM token to Firestore.
 */
export async function initPushNotifications() {
  // Only supported in secure contexts (localhost or HTTPS)
  if (!("Notification" in window)) {
    console.warn("[FCM] Notifications not supported in this browser.");
    return;
  }

  // Don't prompt again if already granted
  if (Notification.permission === "denied") {
    console.warn("[FCM] Notifications were blocked by the user.");
    return;
  }

  try {
    const permission = await Notification.requestPermission();
    if (permission !== "granted") {
      console.log("[FCM] Permission not granted.");
      return;
    }

    const token = await getToken(messaging, { vapidKey: VAPID_KEY });
    if (!token) {
      console.warn("[FCM] No token returned — service worker may not be registered yet.");
      return;
    }

    await _saveFcmToken(token);
    console.log("[FCM] Token saved:", token);

    // Start listening for foreground messages
    _setupForegroundListener();

  } catch (err) {
    console.error("[FCM] initPushNotifications error:", err);
  }
}

// ── SAVE TOKEN TO FIRESTORE ────────────────────────────────────
async function _saveFcmToken(token) {
  const user = auth.currentUser;
  // Document keyed by token so it auto-deduplicates on re-registration
  await setDoc(doc(db, "fcmTokens", token), {
    token,
    uid:       user?.uid    || null,
    email:     user?.email  || null,
    role:      user?.role   || null,   // populated if you store role on the auth user
    updatedAt: serverTimestamp(),
  });
}

// ── DELETE TOKEN ON LOGOUT ─────────────────────────────────────
/**
 * Call this when the user signs out so they stop receiving notifications.
 * @param {string} token - the FCM token to delete
 */
export async function removeFcmToken(token) {
  if (!token) return;
  try {
    await deleteDoc(doc(db, "fcmTokens", token));
    console.log("[FCM] Token removed.");
  } catch (err) {
    console.error("[FCM] removeFcmToken error:", err);
  }
}

// ── FOREGROUND MESSAGE LISTENER ────────────────────────────────
// When the app is open, FCM doesn't show a native OS notification.
// We intercept it here and show our own in-app toast banner.
function _setupForegroundListener() {
  onMessage(messaging, (payload) => {
    console.log("[FCM] Foreground message:", payload);

    const title = payload.notification?.title || "New Update";
    const body  = payload.notification?.body  || "";
    const icon  = payload.notification?.icon  || "/icons/icon.png";

    _showToast(title, body, icon);
  });
}

// ── TOAST BANNER ───────────────────────────────────────────────
function _showToast(title, body, icon) {
  // Remove any existing toast first
  document.querySelector(".fcm-toast")?.remove();

  const toast = document.createElement("div");
  toast.className = "fcm-toast";
  toast.innerHTML = `
    <img src="${icon}" alt="" class="fcm-toast-icon" onerror="this.style.display='none'">
    <div class="fcm-toast-text">
      <div class="fcm-toast-title">${title}</div>
      <div class="fcm-toast-body">${body}</div>
    </div>
    <button class="fcm-toast-close" aria-label="Dismiss">✕</button>
  `;

  // Dismiss on click
  toast.querySelector(".fcm-toast-close").addEventListener("click", () => {
    toast.classList.add("fcm-toast--hide");
    setTimeout(() => toast.remove(), 300);
  });

  document.body.appendChild(toast);

  // Auto-dismiss after 6 seconds
  setTimeout(() => {
    toast.classList.add("fcm-toast--hide");
    setTimeout(() => toast.remove(), 300);
  }, 6000);
}

// ── TOAST CSS (injected once) ──────────────────────────────────
// Add this once when the module loads so no separate CSS file is needed
(function _injectToastStyles() {
  if (document.getElementById("fcm-toast-styles")) return;
  const style = document.createElement("style");
  style.id = "fcm-toast-styles";
  style.textContent = `
    .fcm-toast {
      position: fixed;
      top: 20px;
      right: 20px;
      z-index: 99999;
      display: flex;
      align-items: flex-start;
      gap: 12px;
      padding: 14px 16px;
      max-width: 360px;
      background: #1e2330;
      border: 1px solid rgba(255,255,255,0.1);
      border-left: 4px solid #e8be7a;
      border-radius: 10px;
      box-shadow: 0 8px 32px rgba(0,0,0,0.45);
      color: #e8ecf4;
      font-family: 'DM Sans', sans-serif;
      animation: fcm-slide-in 0.3s ease;
    }
    .fcm-toast--hide {
      animation: fcm-slide-out 0.3s ease forwards;
    }
    .fcm-toast-icon {
      width: 36px;
      height: 36px;
      border-radius: 8px;
      object-fit: contain;
      flex-shrink: 0;
    }
    .fcm-toast-text {
      flex: 1;
      min-width: 0;
    }
    .fcm-toast-title {
      font-size: 13.5px;
      font-weight: 700;
      margin-bottom: 3px;
      color: #e8be7a;
    }
    .fcm-toast-body {
      font-size: 12.5px;
      color: #a8b0c2;
      line-height: 1.4;
      white-space: pre-wrap;
      word-break: break-word;
    }
    .fcm-toast-close {
      background: none;
      border: none;
      color: #6b7280;
      cursor: pointer;
      font-size: 14px;
      padding: 0 0 0 6px;
      flex-shrink: 0;
      line-height: 1;
    }
    .fcm-toast-close:hover { color: #e8ecf4; }
    @keyframes fcm-slide-in {
      from { transform: translateX(110%); opacity: 0; }
      to   { transform: translateX(0);    opacity: 1; }
    }
    @keyframes fcm-slide-out {
      from { transform: translateX(0);    opacity: 1; }
      to   { transform: translateX(110%); opacity: 0; }
    }
    @media (max-width: 480px) {
      .fcm-toast {
        top: auto;
        bottom: 80px;
        right: 12px;
        left: 12px;
        max-width: 100%;
      }
    }
  `;
  document.head.appendChild(style);
}());