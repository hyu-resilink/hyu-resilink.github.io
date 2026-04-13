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
import { loadIncidents, setUserRole }           from "./incidents.js";
import { setSidebarUser }                       from "./sidebar.js";
import { initAnnouncements, syncAnnouncements } from "./announcements.js";
import { initPushNotifications }                from "./notifications.js";
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
  from "https://www.gstatic.com/firebasejs/10.12.0/firebase-auth.js";
import { doc, getDoc }
  from "https://www.gstatic.com/firebasejs/10.12.0/firebase-firestore.js";

// ── OFFLINE BANNER ON STARTUP ──────────────────────────────────
if (!isOnline()) {
  showOfflineBanner();
}

// ── COLD-START OFFLINE FALLBACK ────────────────────────────────
let _authResolved = false;
if (!isOnline()) {
  setTimeout(() => {
    if (!_authResolved) {
      console.warn(
        '[auth] onAuthStateChanged did not fire within 5 s while offline — showing guest mode'
      );
      showGuestOfflineMode();
    }
  }, 5000);
}

// ── NETWORK CHANGE HANDLER ─────────────────────────────────────
onNetworkChange(async (online) => {
  if (online) {
    showOnlineBanner('Back online — syncing…');

    const guestScreen = document.getElementById('guestOfflineScreen');
    if (guestScreen && guestScreen.style.display !== 'none') {
      setTimeout(() => window.location.reload(), 1200);
      return;
    }

    syncAnnouncements();

  } else {
    showOfflineBanner();
  }
});

// ── AUTH STATE LISTENER ────────────────────────────────────────
onAuthStateChanged(auth, async (user) => {
  _authResolved = true;

  if (!user) {
    if (isOnline()) {
      window.location.href = 'login.html';
    } else {
      showGuestOfflineMode();
    }
    return;
  }

  let role;
  let profileData;

  if (isOnline()) {
    try {
      const userDoc = await getDoc(doc(db, 'users', user.uid));

      if (!userDoc.exists()) {
        window.location.href = 'complete-profile.html';
        return;
      }

      const data = userDoc.data();
      role = (data.role || 'community').toLowerCase();
      profileData = {
        username:    data.username    || user.displayName || user.email?.split('@')[0] || 'User',
        email:       data.email       || user.email,
        createdAt:   data.createdAt   || null,
        photoBase64: data.photoBase64 || null,
        role,
      };

      await saveUserProfileCache(user.uid, profileData);

    } catch (err) {
      console.warn('[auth] Firestore read failed, using cache:', err);
      const cached = await loadUserProfileCache(user.uid);
      if (cached) {
        role = cached.role || 'community';
        profileData = cached;
      } else {
        role = 'community';
        profileData = {
          username:    user.displayName || user.email?.split('@')[0] || 'User',
          email:       user.email,
          createdAt:   null,
          photoBase64: null,
          role,
        };
      }
    }

  } else {
    showOfflineBanner('Offline — showing cached data');

    const cached = await loadUserProfileCache(user.uid);
    if (cached) {
      role = cached.role || 'community';
      profileData = cached;
    } else {
      role = 'community';
      profileData = {
        username:    user.displayName || user.email?.split('@')[0] || 'User',
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
  loadIncidents();
  initAnnouncements(role, user.uid);

  // ── INIT PUSH NOTIFICATIONS ────────────────────────────────────
  // Only request permission when online — no point offline
  if (isOnline()) {
    initPushNotifications().catch((err) =>
      console.warn('[auth] Push notification init failed:', err)
    );
  }
});

// ── LOGOUT ─────────────────────────────────────────────────────
const logoutBtn = document.getElementById('logoutBtn');
if (logoutBtn) {
  logoutBtn.addEventListener('click', async () => {
    await signOut(auth);
    window.location.href = 'login.html';
  });
}