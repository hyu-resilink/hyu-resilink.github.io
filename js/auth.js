// js/auth.js
// ─────────────────────────────────────────────────────────────
// Authentication + offline-aware initialization.
//
// Behavior matrix:
//   Online  + user exists     → normal app load
//   Online  + no user         → redirect to login.html
//   Offline + user cached     → load app with IndexedDB profile & announcements
//   Offline + no user ever    → show guest mode (guides only)
// ─────────────────────────────────────────────────────────────

import { auth, db } from "./firebase.js";
import { loadIncidents, setUserRole } from "./incidents.js";
import { setSidebarUser }    from "./sidebar.js";
import { initAnnouncements, syncAnnouncements } from "./announcements.js";
import {
  isOnline,
  onNetworkChange,
  showOfflineBanner,
  showOnlineBanner,
  saveUserProfileCache,
  loadUserProfileCache,
  showGuestOfflineMode,
} from "./offline.js";

import { onAuthStateChanged, signOut }
  from "https://www.gstatic.com/firebasejs/10.7.1/firebase-auth.js";
import { doc, getDoc }
  from "https://www.gstatic.com/firebasejs/10.7.1/firebase-firestore.js";

// ── OFFLINE BANNER ON STARTUP ──────────────────────────────────
// Show immediately if we already know we're offline before auth resolves
if (!isOnline()) {
  showOfflineBanner();
}

// ── NETWORK CHANGE HANDLER ─────────────────────────────────────
onNetworkChange(async (online) => {
  if (online) {
    // Came back online
    showOnlineBanner("Back online — syncing…");

    // If the user was stuck on the guest screen, reload to do a proper auth check
    const guestScreen = document.getElementById('guestOfflineScreen');
    if (guestScreen && guestScreen.style.display !== 'none') {
      setTimeout(() => window.location.reload(), 1200);
      return;
    }

    // Otherwise re-subscribe announcements so the latest data loads
    syncAnnouncements();

  } else {
    // Went offline
    showOfflineBanner();
  }
});

// ── AUTH STATE LISTENER ────────────────────────────────────────
onAuthStateChanged(auth, async (user) => {
  if (!user) {
    // No authenticated user
    if (isOnline()) {
      // Online + no user → go to login
      window.location.href = "login.html";
    } else {
      // Offline + no user → show guest mode (guides only, no login required)
      showGuestOfflineMode();
    }
    return;
  }

  // ── User is authenticated (Firebase Auth persists this offline) ──
  let role;
  let profileData;

  if (isOnline()) {
    // ── ONLINE PATH — read from Firestore ──────────────────────
    try {
      const userDoc = await getDoc(doc(db, "users", user.uid));

      if (!userDoc.exists()) {
        // Authenticated but no Firestore profile → complete profile setup
        window.location.href = "complete-profile.html";
        return;
      }

      const data = userDoc.data();
      role = (data.role || "community").toLowerCase();
      profileData = {
        username:    data.username    || user.displayName || user.email?.split("@")[0] || "User",
        email:       data.email       || user.email,
        createdAt:   data.createdAt   || null,
        photoBase64: data.photoBase64 || null,
        role,
      };

      // Always save the latest profile to IndexedDB so it's available offline
      await saveUserProfileCache(user.uid, profileData);

    } catch (err) {
      // Firestore read failed even though navigator.onLine is true
      // (e.g. spotty connection). Fall back to cached profile.
      console.warn("[auth] Firestore read failed, using cache:", err);
      const cached = await loadUserProfileCache(user.uid);
      if (cached) {
        role = cached.role || "community";
        profileData = cached;
      } else {
        role = "community";
        profileData = {
          username:    user.displayName || user.email?.split("@")[0] || "User",
          email:       user.email,
          createdAt:   null,
          photoBase64: null,
          role,
        };
      }
    }

  } else {
    // ── OFFLINE PATH — read from IndexedDB cache ───────────────
    showOfflineBanner("Offline — showing cached data");

    const cached = await loadUserProfileCache(user.uid);
    if (cached) {
      role = cached.role || "community";
      profileData = cached;
    } else {
      // User is logged in (Firebase Auth state cached) but we have no
      // Firestore profile cached — show what we can from Firebase Auth
      role = "community";
      profileData = {
        username:    user.displayName || user.email?.split("@")[0] || "User",
        email:       user.email,
        createdAt:   null,
        photoBase64: null,
        role,
      };
    }
  }

  // ── INIT APP ───────────────────────────────────────────────────
  setUserRole(role);

  setSidebarUser(user, role, profileData);

  // loadIncidents: Firestore's offline persistence means this works offline too,
  // though the map will only show cached incidents, not new ones.
  loadIncidents();

  // initAnnouncements now receives uid so it can cache/load per-user
  initAnnouncements(role, user.uid);
});

// ── LOGOUT ─────────────────────────────────────────────────────
const logoutBtn = document.getElementById("logoutBtn");
if (logoutBtn) {
  logoutBtn.addEventListener("click", async () => {
    await signOut(auth);
    window.location.href = "login.html";
  });
}