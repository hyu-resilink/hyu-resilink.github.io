// sw.js — Resilink Service Worker v4
// ─────────────────────────────────────────────────────────────
// Cache strategies:
//   App shell (HTML/CSS/JS) → Cache First (pre-cached on install, CRITICAL)
//   Firebase SDK scripts    → Cache First (best-effort pre-cache on install)
//   Map tiles (OSM)         → Stale While Revalidate
//   Other CDN assets        → Cache First with network fallback
//   Firebase API calls      → Skip (SDK handles offline natively)
//
// FIX v4:
//   • App shell cache failure now throws (critical — must succeed).
//   • Firebase SDK cache failure is caught separately and non-fatal
//     (user may be offline at install time; SDK will be cached on first
//     online use instead).
//   • skipWaiting() is always called even if SDK pre-cache fails,
//     so the SW activates and claims the page as fast as possible.
//   • Bumped CACHE_VERSION to v4 so old caches are purged immediately.
// ─────────────────────────────────────────────────────────────

const CACHE_VERSION = 'v4';
const APP_CACHE     = `resilink-app-${CACHE_VERSION}`;
const TILE_CACHE    = `resilink-tiles-${CACHE_VERSION}`;
const CDN_CACHE     = `resilink-cdn-${CACHE_VERSION}`;

// ── APP SHELL — pre-cached on install (CRITICAL) ───────────────
// These MUST be cached for the app to function offline at all.
// If any of these fail, the install fails and the SW won't activate.
const APP_SHELL = [
  '/',
  '/index.html',
  '/login.html',
  '/guides.html',
  '/register.html',
  '/complete-profile.html',
  '/reset-password.html',
  '/mobile.css',
  '/js/main.js',
  '/js/firebase.js',
  '/js/auth.js',
  '/js/map.js',
  '/js/incidents.js',
  '/js/announcements.js',
  '/js/guides.js',
  '/js/evacuation.js',
  '/js/heritage.js',
  '/js/sidebar.js',
  '/js/utils.js',
  '/js/offline.js',
];

// ── FIREBASE SDK — best-effort pre-cache on install ────────────
// These are cached during install when the user is online.
// If the user installs the PWA while already offline, this list
// will fail to fetch — that's acceptable. The SDK scripts will be
// cached the next time the user opens the app online (via the
// cache-first fetch handler below). The app must not fail to
// install just because gstatic.com was unreachable.
const FIREBASE_SDK = [
  'https://www.gstatic.com/firebasejs/10.7.1/firebase-app.js',
  'https://www.gstatic.com/firebasejs/10.7.1/firebase-auth.js',
  'https://www.gstatic.com/firebasejs/10.7.1/firebase-firestore.js',
];

// ── INSTALL ────────────────────────────────────────────────────
self.addEventListener('install', (event) => {
  event.waitUntil(
    (async () => {
      // ── Step 1: App shell — CRITICAL, must succeed ─────────────
      // These are all local files served from the same origin.
      // If any fail (e.g. a typo in a filename), we want the SW
      // install to fail loudly so the bug is caught immediately.
      const appCache = await caches.open(APP_CACHE);
      await appCache.addAll(APP_SHELL);
      console.log('[SW] App shell pre-cached ✓');

      // ── Step 2: Firebase SDK — BEST EFFORT, non-fatal ──────────
      // Wrapped in its own try/catch so a network failure here does
      // NOT abort the SW install. The SDK will be lazily cached on
      // first online request via the cacheFirst() fetch handler.
      try {
        const cdnCache = await caches.open(CDN_CACHE);
        await cdnCache.addAll(FIREBASE_SDK);
        console.log('[SW] Firebase SDK pre-cached ✓');
      } catch (err) {
        console.warn(
          '[SW] Firebase SDK pre-cache skipped — likely offline at install time.',
          'SDK will be cached on first online visit.',
          err
        );
      }

      // Always skip waiting so the new SW activates immediately
      // and can call clients.claim() to control the current page.
      console.log('[SW] Install complete — activating immediately.');
      self.skipWaiting();
    })()
  );
});

// ── ACTIVATE ───────────────────────────────────────────────────
// Delete any old cache versions so stale assets are cleared.
self.addEventListener('activate', (event) => {
  const validCaches = [APP_CACHE, TILE_CACHE, CDN_CACHE];

  event.waitUntil(
    caches.keys()
      .then((keys) => Promise.all(
        keys
          .filter((key) => !validCaches.includes(key))
          .map((key) => {
            console.log('[SW] Deleting old cache:', key);
            return caches.delete(key);
          })
      ))
      .then(() => {
        console.log('[SW] Activate complete — old caches cleared.');
        // Claim all open clients immediately so the page that triggered
        // this SW install/update is controlled without a reload.
        return self.clients.claim();
      })
  );
});

// ── FETCH ──────────────────────────────────────────────────────
self.addEventListener('fetch', (event) => {
  const url = new URL(event.request.url);

  // ── 1. Skip Firebase Auth/Firestore/Database API calls ────────
  // These are runtime API calls. The Firebase SDK handles its own
  // offline persistence for these via IndexedDB — we must not intercept.
  // NOTE: www.gstatic.com/firebasejs/ is NOT skipped here — those are
  // SDK script files which we cache and serve from CDN_CACHE.
  if (
    url.hostname.includes('firebase.googleapis.com')        ||
    url.hostname.includes('firebaseio.com')                 ||
    url.hostname.includes('firestore.googleapis.com')       ||
    url.hostname.includes('identitytoolkit.googleapis.com') ||
    url.hostname.includes('securetoken.googleapis.com')     ||
    url.hostname.includes('firebaseapp.com')                ||
    url.hostname === 'www.googleapis.com'
  ) {
    return; // Pass through — Firebase SDK handles these
  }

  // ── 2. Map tiles — Stale While Revalidate ─────────────────────
  // Serve from cache instantly, then update cache in background.
  if (url.hostname.includes('tile.openstreetmap.org')) {
    event.respondWith(staleWhileRevalidate(event.request, TILE_CACHE));
    return;
  }

  // ── 3. Firebase SDK scripts + other CDN assets — Cache First ──
  // Firebase SDK scripts may have been pre-cached during install.
  // If not (offline install), they are lazily cached here on first
  // online request and served from cache on subsequent offline visits.
  if (
    url.hostname === 'www.gstatic.com'                 ||
    url.hostname.includes('unpkg.com')                 ||
    url.hostname.includes('fonts.googleapis.com')      ||
    url.hostname.includes('fonts.gstatic.com')         ||
    url.hostname.includes('raw.githubusercontent.com') ||
    url.hostname.includes('cdnjs.cloudflare.com')
  ) {
    event.respondWith(cacheFirst(event.request, CDN_CACHE));
    return;
  }

  // ── 4. App shell — Cache First with network fallback ──────────
  event.respondWith(cacheFirst(event.request, APP_CACHE));
});

// ── CACHE STRATEGIES ───────────────────────────────────────────

/**
 * Cache First: serve from cache if available, else fetch and cache.
 * For navigation requests (page loads), fall back to /index.html.
 */
async function cacheFirst(request, cacheName) {
  const cached = await caches.match(request);
  if (cached) return cached;

  try {
    const response = await fetch(request);
    if (response && response.ok && request.method === 'GET') {
      const cache = await caches.open(cacheName);
      cache.put(request, response.clone());
    }
    return response;
  } catch {
    // Network failed — try index.html fallback for navigation requests
    if (request.mode === 'navigate') {
      const fallback = await caches.match('/index.html');
      if (fallback) return fallback;
    }
    return new Response('Offline — resource not cached', {
      status: 503,
      headers: { 'Content-Type': 'text/plain' },
    });
  }
}

/**
 * Stale While Revalidate: serve cached version immediately,
 * then update cache from network in the background.
 * Used for map tiles where slightly stale data is acceptable.
 */
async function staleWhileRevalidate(request, cacheName) {
  const cache  = await caches.open(cacheName);
  const cached = await cache.match(request);

  const fetchPromise = fetch(request)
    .then((response) => {
      if (response && response.ok) {
        cache.put(request, response.clone());
      }
      return response;
    })
    .catch(() => null);

  return cached || await fetchPromise ||
    new Response('', { status: 204 });
}

// ── MESSAGE HANDLER ────────────────────────────────────────────
// Allows the page to tell the SW to activate immediately
// (used when a new SW version is detected).
self.addEventListener('message', (event) => {
  if (event.data === 'skipWaiting') {
    self.skipWaiting();
  }
});