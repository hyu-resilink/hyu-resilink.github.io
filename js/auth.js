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
import { loadIncidents, setUserRole }          from "./incidents.js";
import { setSidebarUser }                      from "./sidebar.js";
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
// Show immediately if we already know we're offline before auth resolves.
if (!isOnline()) {
  showOfflineBanner();
}

// ── COLD-START OFFLINE FALLBACK ────────────────────────────────
// If offline on load, onAuthStateChanged may be delayed while the
// Firebase SDK reads from IndexedDB. After 5 s with no resolution,
// show guest mode so the user isn't stuck on a blank screen.
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

    // If the user was stuck on the guest screen, reload for a proper auth check.
    const guestScreen = document.getElementById('guestOfflineScreen');
    if (guestScreen && guestScreen.style.display !== 'none') {
      setTimeout(() => window.location.reload(), 1200);
      return;
    }

    // Re-subscribe announcements so the latest data loads.
    syncAnnouncements();

  } else {
    showOfflineBanner();
  }
});

// ── AUTH STATE LISTENER ────────────────────────────────────────
onAuthStateChanged(auth, async (user) => {
  // Mark resolved so the cold-start timeout doesn't trigger guest mode.
  _authResolved = true;

  if (!user) {
    if (isOnline()) {
      window.location.href = 'login.html';
    } else {
      showGuestOfflineMode();
    }
    return;
  }

  // ── User is authenticated ──────────────────────────────────
  // Firebase Auth persists the session to IndexedDB automatically,
  // so this branch runs correctly even when offline.
  let role;
  let profileData;

  if (isOnline()) {
    // ── ONLINE PATH — read from Firestore ──────────────────────
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

      // Persist latest profile to IndexedDB for future offline loads.
      await saveUserProfileCache(user.uid, profileData);

    } catch (err) {
      // Firestore read failed (e.g. spotty connection). Fall back to cache.
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
    // ── OFFLINE PATH — read from IndexedDB cache ───────────────
    // Firestore's enableIndexedDbPersistence (set in firebase.js) means
    // getDoc() will still work here using locally cached data.
    showOfflineBanner('Offline — showing cached data');

    const cached = await loadUserProfileCache(user.uid);
    if (cached) {
      role = cached.role || 'community';
      profileData = cached;
    } else {
      // Auth state cached but no Firestore profile cached yet.
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

  // Firestore offline persistence means loadIncidents works offline too
  // (shows cached incidents only — new ones won't appear until reconnected).
  loadIncidents();

  // initAnnouncements receives uid so it can cache/load per-user.
  initAnnouncements(role, user.uid);
});

// ── LOGOUT ─────────────────────────────────────────────────────
const logoutBtn = document.getElementById('logoutBtn');
if (logoutBtn) {
  logoutBtn.addEventListener('click', async () => {
    await signOut(auth);
    window.location.href = 'login.html';
  });
}