// functions/index.js
// ─────────────────────────────────────────────────────────────
// Firebase Cloud Functions — push notification triggers.
//
// Triggers:
//  1. onAnnouncementCreated  → fires when LGU posts to "announcements"
//  2. onIncidentPinned       → fires when anyone saves to "incidents"
//
// Both fetch all tokens from "fcmTokens" collection and broadcast.
// Invalid/expired tokens are automatically cleaned up.
//
// Setup:
//   cd functions
//   npm install
//   firebase deploy --only functions
// ─────────────────────────────────────────────────────────────

const { onDocumentCreated } = require("firebase-functions/v2/firestore");
const { initializeApp }     = require("firebase-admin/app");
const { getFirestore }      = require("firebase-admin/firestore");
const { getMessaging }      = require("firebase-admin/messaging");

initializeApp();

const db        = getFirestore();
const fcm       = getMessaging();

// ── HELPER: fetch all valid tokens from Firestore ──────────────
async function getAllTokens() {
  const snap = await db.collection("fcmTokens").get();
  return snap.docs.map((d) => d.data().token).filter(Boolean);
}

// ── HELPER: send multicast + clean up bad tokens ───────────────
async function broadcast(notification, data = {}) {
  const tokens = await getAllTokens();
  if (tokens.length === 0) {
    console.log("[FCM] No tokens registered — skipping send.");
    return;
  }

  console.log(`[FCM] Sending to ${tokens.length} token(s).`);

  // FCM multicast supports max 500 tokens per call — chunk if needed
  const CHUNK = 500;
  const staleTokens = [];

  for (let i = 0; i < tokens.length; i += CHUNK) {
    const chunk = tokens.slice(i, i + CHUNK);

    const response = await fcm.sendEachForMulticast({
      tokens: chunk,
      notification: {
        title: notification.title,
        body:  notification.body,
      },
      webpush: {
        notification: {
          icon:  "/icons/icon.png",
          badge: "/icons/icon-192.png",
          ...notification,
        },
        fcmOptions: {
          link: "/",   // clicking the notification opens the app
        },
      },
      data, // optional key-value pairs forwarded to the client
    });

    // Collect tokens that are no longer valid
    response.responses.forEach((res, idx) => {
      if (!res.success) {
        const code = res.error?.code;
        console.warn(`[FCM] Token ${chunk[idx]} failed:`, code);
        if (
          code === "messaging/invalid-registration-token" ||
          code === "messaging/registration-token-not-registered"
        ) {
          staleTokens.push(chunk[idx]);
        }
      }
    });

    console.log(
      `[FCM] Batch ${Math.floor(i / CHUNK) + 1}: ` +
      `${response.successCount} sent, ${response.failureCount} failed.`
    );
  }

  // Delete stale tokens in parallel
  if (staleTokens.length > 0) {
    console.log(`[FCM] Cleaning up ${staleTokens.length} stale token(s).`);
    await Promise.all(
      staleTokens.map((t) => db.collection("fcmTokens").doc(t).delete())
    );
  }
}

// ── TRIGGER 1: LGU Announcement ───────────────────────────────
exports.onAnnouncementCreated = onDocumentCreated(
  "announcements/{docId}",
  async (event) => {
    const data = event.data?.data();
    if (!data) return;

    const priorityEmoji = {
      critical: "🔴",
      warning:  "🟡",
      normal:   "🔵",
      green:    "🟢",
    }[data.priority || "normal"] || "🔵";

    await broadcast(
      {
        title: `${priorityEmoji} ${data.title}`,
        body:  data.body,
      },
      {
        type:     "announcement",
        docId:    event.params.docId,
        priority: data.priority || "normal",
      }
    );
  }
);

// ── TRIGGER 2: New Incident Pin ────────────────────────────────
// Adjust "incidents" to whatever collection name your incidents.js uses.
exports.onIncidentPinned = onDocumentCreated(
  "incidents/{docId}",
  async (event) => {
    const data = event.data?.data();
    if (!data) return;

    // Build a human-readable location string if coordinates are stored
    const locationHint = data.barangay
      ? `in ${data.barangay}`
      : data.address
      ? `at ${data.address}`
      : "nearby";

    await broadcast(
      {
        title: `📍 New Incident Reported`,
        body:  `${data.type || "Incident"} reported ${locationHint}. Tap to view on map.`,
      },
      {
        type:  "incident",
        docId: event.params.docId,
        lat:   String(data.lat  ?? data.latitude  ?? ""),
        lng:   String(data.lng  ?? data.longitude ?? ""),
      }
    );
  }
);