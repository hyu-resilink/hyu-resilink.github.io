// api/notify.js
import { initializeApp, getApps, cert } from "firebase-admin/app";
import { getFirestore }                  from "firebase-admin/firestore";
import { getMessaging }                  from "firebase-admin/messaging";

// ── Init Firebase Admin (only once) ───────────────────────────
if (!getApps().length) {
  initializeApp({
    credential: cert({
      projectId:   process.env.FIREBASE_PROJECT_ID,
      clientEmail: process.env.FIREBASE_CLIENT_EMAIL,
      privateKey:  process.env.FIREBASE_PRIVATE_KEY
        ?.replace(/^"/, "")
        .replace(/"$/, "")
        .replace(/\\n/g, "\n"),
    }),
  });
}

const db        = getFirestore();
const messaging = getMessaging();

// ── Handler ────────────────────────────────────────────────────
export default async function handler(req, res) {
  res.setHeader("Access-Control-Allow-Origin",  "*");
  res.setHeader("Access-Control-Allow-Methods", "POST, OPTIONS");
  res.setHeader("Access-Control-Allow-Headers", "Content-Type");

  if (req.method === "OPTIONS") return res.status(200).end();
  if (req.method !== "POST")    return res.status(405).json({ error: "Method not allowed" });

  const { title, body } = req.body;
  if (!title || !body)  return res.status(400).json({ error: "Missing title or body" });

  try {
    const snapshot = await db.collection("fcmTokens").get();
    if (snapshot.empty) {
      return res.status(200).json({ message: "No tokens found" });
    }

    const tokens = snapshot.docs.map((d) => d.data().token).filter(Boolean);
    console.log(`[FCM] Sending to ${tokens.length} token(s)`);

    const response = await messaging.sendEachForMulticast({
      tokens,
      notification: {
        title,
        body,
      },
      android: {
        priority: "high",
        notification: {
          channelId:            "resilink_alerts",
          priority:             "high",
          defaultVibrateTimings: true,
          sound:                "default",
        },
      },
      webpush: {
        headers: {
          Urgency: "high",
        },
        notification: {
          title,
          body,
          icon:                "/icons/icon-192.png",
          badge:               "/icons/icon-192.png",
          vibrate:             [200, 100, 200],
          requireInteraction:  true,
        },
        fcmOptions: {
          link: "https://hyu-resilink.github.io",
        },
      },
    });

    console.log(`[FCM] Success: ${response.successCount}, Failed: ${response.failureCount}`);

    // Clean up stale tokens
    const batch = db.batch();
    response.responses.forEach((r, i) => {
      if (!r.success) {
        console.warn(`[FCM] Token failed: ${tokens[i]}`, r.error?.code);
        if (
          r.error?.code === "messaging/invalid-registration-token" ||
          r.error?.code === "messaging/registration-token-not-registered"
        ) {
          batch.delete(db.collection("fcmTokens").doc(tokens[i]));
        }
      }
    });
    await batch.commit();

    return res.status(200).json({
      success: response.successCount,
      failed:  response.failureCount,
    });

  } catch (err) {
    console.error("[FCM] notify error:", err);
    return res.status(500).json({ error: err.message });
  }
}