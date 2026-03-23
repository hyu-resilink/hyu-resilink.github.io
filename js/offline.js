  // js/offline.js
  // ─────────────────────────────────────────────────────────────
  // Offline manager for Resilink PWA.
  // Handles:
  //   • IndexedDB storage for announcements (per user) + user profile
  //   • Online / offline detection
  //   • Offline banner UI
  //   • Guest offline screen (for users who have never logged in)
  // ─────────────────────────────────────────────────────────────

  const DB_NAME    = 'resilink-offline';
  const DB_VERSION = 1;

  // ── OPEN INDEXEDDB ─────────────────────────────────────────────
  function openDB() {
    return new Promise((resolve, reject) => {
      const req = indexedDB.open(DB_NAME, DB_VERSION);

      req.onupgradeneeded = (e) => {
        const db = e.target.result;

        // Announcements: keyed by user UID
        // Shape: { uid, items: [...], savedAt: timestamp }
        if (!db.objectStoreNames.contains('announcements')) {
          db.createObjectStore('announcements', { keyPath: 'uid' });
        }

        // User profile: keyed by user UID
        if (!db.objectStoreNames.contains('userProfile')) {
          db.createObjectStore('userProfile', { keyPath: 'uid' });
        }
      };

      req.onsuccess = (e) => resolve(e.target.result);
      req.onerror   = (e) => reject(e.target.error);
    });
  }

  // ── ANNOUNCEMENTS CACHE ────────────────────────────────────────

  /**
   * Save announcements array to IndexedDB for a specific user.
   * Timestamps must already be serialized (ISO strings) before calling.
   */
  export async function saveAnnouncementsCache(uid, items) {
    if (!uid) return;
    try {
      const db = await openDB();
      await new Promise((resolve, reject) => {
        const tx    = db.transaction('announcements', 'readwrite');
        tx.objectStore('announcements').put({ uid, items, savedAt: Date.now() });
        tx.oncomplete = resolve;
        tx.onerror    = () => reject(tx.error);
      });
    } catch (err) {
      console.warn('[offline] saveAnnouncementsCache failed:', err);
    }
  }

  /**
   * Load cached announcements for a specific user.
   * Returns an empty array if nothing is cached.
   */
  export async function loadAnnouncementsCache(uid) {
    if (!uid) return [];
    try {
      const db = await openDB();
      return await new Promise((resolve) => {
        const req     = db.transaction('announcements').objectStore('announcements').get(uid);
        req.onsuccess = (e) => resolve(e.target.result?.items || []);
        req.onerror   = ()  => resolve([]);
      });
    } catch {
      return [];
    }
  }

  // ── USER PROFILE CACHE ─────────────────────────────────────────

  /**
   * Save the user's Firestore profile to IndexedDB.
   * Called every time a successful Firestore read happens online.
   */
  export async function saveUserProfileCache(uid, profile) {
    if (!uid) return;
    try {
      const db = await openDB();
      await new Promise((resolve, reject) => {
        const tx    = db.transaction('userProfile', 'readwrite');
        tx.objectStore('userProfile').put({ uid, ...profile, cachedAt: Date.now() });
        tx.oncomplete = resolve;
        tx.onerror    = () => reject(tx.error);
      });
    } catch (err) {
      console.warn('[offline] saveUserProfileCache failed:', err);
    }
  }

  /**
   * Load a previously cached user profile from IndexedDB.
   * Returns null if nothing is cached for this UID.
   */
  export async function loadUserProfileCache(uid) {
    if (!uid) return null;
    try {
      const db = await openDB();
      return await new Promise((resolve) => {
        const req     = db.transaction('userProfile').objectStore('userProfile').get(uid);
        req.onsuccess = (e) => resolve(e.target.result || null);
        req.onerror   = ()  => resolve(null);
      });
    } catch {
      return null;
    }
  }

  // ── ONLINE / OFFLINE STATUS ────────────────────────────────────

  /** Returns true if the browser believes it is currently online. */
  export function isOnline() {
    return navigator.onLine;
  }

  /**
   * Register a callback that fires whenever connection status changes.
   * callback(true)  → came back online
   * callback(false) → went offline
   */
  export function onNetworkChange(callback) {
    window.addEventListener('online',  () => callback(true));
    window.addEventListener('offline', () => callback(false));
  }

  // ── OFFLINE / ONLINE BANNER ────────────────────────────────────
  let _bannerEl    = null;
  let _bannerTimer = null;

  function _ensureBanner() {
    if (_bannerEl) return _bannerEl;

    _bannerEl = document.createElement('div');
    _bannerEl.id = 'offlineBanner';
    _bannerEl.style.display = 'none';
    _bannerEl.innerHTML = `
      <span id="obIcon" class="ob-icon"></span>
      <span id="obText"></span>
    `;
    document.body.appendChild(_bannerEl);

    if (!document.getElementById('offlineBannerCSS')) {
      const style = document.createElement('style');
      style.id = 'offlineBannerCSS';
      style.textContent = `
        #offlineBanner {
          position: fixed; bottom: 20px; left: 50%;
          transform: translateX(-50%);
          z-index: 9999;
          display: flex; align-items: center; gap: 8px;
          padding: 10px 20px; border-radius: 30px;
          background: rgba(15, 22, 35, 0.97);
          backdrop-filter: blur(14px);
          border: 1px solid rgba(212, 160, 84, 0.35);
          color: #e8be7a;
          font-family: 'DM Sans', sans-serif;
          font-size: 13px; font-weight: 600;
          box-shadow: 0 8px 28px rgba(0, 0, 0, 0.55);
          white-space: nowrap;
          animation: ob-up 0.3s ease;
          pointer-events: none;
        }
        #offlineBanner.ob-online {
          border-color: rgba(93, 184, 138, 0.35);
          color: #80d4a8;
        }
        .ob-icon svg { width: 15px; height: 15px; display: block; }
        @keyframes ob-up {
          from { transform: translateX(-50%) translateY(16px); opacity: 0; }
          to   { transform: translateX(-50%) translateY(0);    opacity: 1; }
        }
        @media (max-width: 480px) {
          #offlineBanner { font-size: 12px; padding: 9px 15px; bottom: 12px; }
        }
      `;
      document.head.appendChild(style);
    }
    return _bannerEl;
  }

  const _WIFI_OFF_SVG = `
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"
        stroke-linecap="round" stroke-linejoin="round">
      <line x1="1" y1="1" x2="23" y2="23"/>
      <path d="M16.72 11.06A10.94 10.94 0 0 1 19 12.55"/>
      <path d="M5 12.55a10.94 10.94 0 0 1 5.17-2.39"/>
      <path d="M10.71 5.05A16 16 0 0 1 22.56 9"/>
      <path d="M1.42 9a15.91 15.91 0 0 1 4.7-2.88"/>
      <path d="M8.53 16.11a6 6 0 0 1 6.95 0"/>
      <line x1="12" y1="20" x2="12.01" y2="20"/>
    </svg>`;

  const _WIFI_ON_SVG = `
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"
        stroke-linecap="round" stroke-linejoin="round">
      <path d="M5 12.55a11 11 0 0 1 14.08 0"/>
      <path d="M1.42 9a16 16 0 0 1 21.16 0"/>
      <path d="M8.53 16.11a6 6 0 0 1 6.95 0"/>
      <line x1="12" y1="20" x2="12.01" y2="20"/>
    </svg>`;

  /** Show the offline (amber) banner. Stays until dismissed or back online. */
  export function showOfflineBanner(msg = "You're offline — showing cached content") {
    clearTimeout(_bannerTimer);
    const banner = _ensureBanner();
    banner.classList.remove('ob-online');
    document.getElementById('obIcon').innerHTML = _WIFI_OFF_SVG;
    document.getElementById('obText').textContent = msg;
    banner.style.display = 'flex';
  }

  /** Show the back-online (green) banner, then auto-hide after 3.5 s. */
  export function showOnlineBanner(msg = "Back online — syncing…") {
    clearTimeout(_bannerTimer);
    const banner = _ensureBanner();
    banner.classList.add('ob-online');
    document.getElementById('obIcon').innerHTML = _WIFI_ON_SVG;
    document.getElementById('obText').textContent = msg;
    banner.style.display = 'flex';
    _bannerTimer = setTimeout(hideBanner, 3500);
  }

  /** Hide the banner immediately. */
  export function hideBanner() {
    if (_bannerEl) _bannerEl.style.display = 'none';
  }

  // ── GUEST OFFLINE SCREEN ───────────────────────────────────────
  // Shown when: offline + user has NEVER logged in.
  // Allows access to Survival Guides only — no login required.

  let _guestScreenEl = null;

  export function showGuestOfflineMode() {
    // Tuck the sidebar away
    const sidebar     = document.getElementById('sidebar');
    const mainContent = document.getElementById('main-content');
    if (sidebar)     sidebar.style.display = 'none';
    if (mainContent) mainContent.style.left = '0';

    if (_guestScreenEl) {
      _guestScreenEl.style.display = 'flex';
      return;
    }

    if (!document.getElementById('guestScreenCSS')) {
      const style = document.createElement('style');
      style.id = 'guestScreenCSS';
      style.textContent = `
        #guestOfflineScreen {
          position: fixed; inset: 0; z-index: 8000;
          background: linear-gradient(160deg, #0d1520 0%, #111827 50%, #0f1d2a 100%);
          display: flex; align-items: center; justify-content: center;
          padding: 20px;
          font-family: 'DM Sans', sans-serif;
        }
        .gos-card {
          max-width: 380px; width: 100%; text-align: center;
          background: rgba(21, 30, 46, 0.88);
          border: 1px solid rgba(255, 255, 255, 0.08);
          border-radius: 22px; padding: 40px 28px 32px;
          box-shadow: 0 24px 60px rgba(0, 0, 0, 0.55);
          animation: gos-in 0.4s cubic-bezier(0.4, 0, 0.2, 1);
        }
        @keyframes gos-in {
          from { transform: translateY(20px) scale(0.97); opacity: 0; }
          to   { transform: none; opacity: 1; }
        }
        .gos-logo {
          width: 62px; height: 62px; border-radius: 16px;
          background: linear-gradient(135deg, #5ba4c8, #7c82d4);
          display: flex; align-items: center; justify-content: center;
          font-size: 28px; margin: 0 auto 18px;
          box-shadow: 0 6px 20px rgba(91, 164, 200, 0.3);
        }
        .gos-offline-badge {
          display: inline-flex; align-items: center; gap: 6px;
          padding: 4px 12px; border-radius: 20px; margin-bottom: 18px;
          background: rgba(212, 160, 84, 0.08);
          border: 1px solid rgba(212, 160, 84, 0.25);
          color: #e8be7a;
          font-size: 10.5px; font-weight: 700;
          font-family: 'DM Mono', monospace; letter-spacing: 0.08em;
        }
        .gos-title {
          font-family: 'Space Grotesk', sans-serif;
          font-size: 22px; font-weight: 700;
          color: #e0ecfa; letter-spacing: -0.02em; margin: 0 0 10px;
        }
        .gos-sub {
          font-size: 14px; color: #7a92b2;
          line-height: 1.65; margin: 0 0 28px;
        }
        .gos-sub strong { color: #c5d5e8; }
        .gos-guides-btn {
          display: flex; align-items: center; justify-content: center; gap: 9px;
          width: 100%; padding: 14px; border-radius: 13px; border: none;
          background: linear-gradient(135deg, #5ba4c8, #7c82d4);
          color: #fff; font-family: 'DM Sans', sans-serif;
          font-size: 14px; font-weight: 700; cursor: pointer;
          margin-bottom: 12px;
          box-shadow: 0 4px 18px rgba(91, 164, 200, 0.28);
          transition: opacity 0.2s, transform 0.15s;
          -webkit-tap-highlight-color: transparent;
        }
        .gos-guides-btn:active { opacity: 0.88; transform: scale(0.98); }
        .gos-guides-btn svg { width: 16px; height: 16px; flex-shrink: 0; }
        .gos-or { color: #2a3a50; font-size: 11px; margin: 2px 0 12px; }
        .gos-login-link {
          display: flex; align-items: center; justify-content: center;
          padding: 12px; border-radius: 12px;
          border: 1px solid rgba(91, 164, 200, 0.22);
          background: rgba(91, 164, 200, 0.06);
          color: #5ba4c8; font-size: 13.5px; font-weight: 600;
          text-decoration: none; margin-bottom: 22px;
          transition: background 0.18s;
          -webkit-tap-highlight-color: transparent;
        }
        .gos-login-link:active { background: rgba(91, 164, 200, 0.14); }
        .gos-hint {
          font-size: 11.5px; color: #354a5e;
          line-height: 1.7; margin: 0;
        }
      `;
      document.head.appendChild(style);
    }

    _guestScreenEl = document.createElement('div');
    _guestScreenEl.id = 'guestOfflineScreen';
    _guestScreenEl.innerHTML = `
      <div class="gos-card">
        <div class="gos-logo">🗺️</div>
        <div class="gos-offline-badge">
          <svg width="10" height="10" viewBox="0 0 24 24" fill="none"
              stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round">
            <line x1="1" y1="1" x2="23" y2="23"/>
            <path d="M16.72 11.06A10.94 10.94 0 0 1 19 12.55"/>
            <path d="M5 12.55a10.94 10.94 0 0 1 5.17-2.39"/>
          </svg>
          OFFLINE MODE
        </div>
        <h2 class="gos-title">Resilink</h2>
        <p class="gos-sub">
          You're offline and not logged in.<br>
          You can still view the <strong>Survival Guides</strong>
          for emergency preparedness — no login needed.
        </p>
        <button class="gos-guides-btn" id="gosOpenGuides">
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"
              stroke-linecap="round" stroke-linejoin="round">
            <path d="M2 3h6a4 4 0 0 1 4 4v14a3 3 0 0 0-3-3H2z"/>
            <path d="M22 3h-6a4 4 0 0 0-4 4v14a3 3 0 0 1 3-3h7z"/>
          </svg>
          Open Survival Guides
        </button>
        <div class="gos-or">— or —</div>
        <a href="login.html" class="gos-login-link">Sign in when you're back online</a>
        <p class="gos-hint">
          Connect to the internet and log in to access live announcements,
          the incident map, evacuation centers, and heritage sites.
        </p>
      </div>
    `;
    document.body.appendChild(_guestScreenEl);

    // Wire "Open Survival Guides" button
    document.getElementById('gosOpenGuides').addEventListener('click', () => {
      if (mainContent) mainContent.style.display = 'block';
      _guestScreenEl.style.display = 'none';

      // Open guides panel — it was already initialized by main.js
      const guidesPanel = document.getElementById('guidesPanel');
      if (guidesPanel) {
        guidesPanel.classList.add('open');

        // When guides panel closes, show the guest screen again
        const closeBtn = document.getElementById('closeGuidesPanel');
        if (closeBtn) {
          closeBtn.addEventListener('click', () => {
            if (_guestScreenEl) _guestScreenEl.style.display = 'flex';
          }, { once: true });
        }
      }
    });
  }

  /** Hide the guest screen (called when network comes back and app reloads). */
  export function hideGuestOfflineMode() {
    if (_guestScreenEl) _guestScreenEl.style.display = 'none';
    const sidebar     = document.getElementById('sidebar');
    const mainContent = document.getElementById('main-content');
    if (sidebar)     sidebar.style.display = '';
    if (mainContent) mainContent.style.left = '';
  }