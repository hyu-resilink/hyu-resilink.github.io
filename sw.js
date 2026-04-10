// sw.js — Resilink Service Worker
// Handles offline caching for the PWA.
// Cache strategies:
//   App shell (HTML/CSS/JS) → Cache First
//   Map tiles (OpenStreetMap) → Stale While Revalidate
//   CDN + Firebase SDK (Leaflet, Fonts, gstatic) → Cache First with network fallback
//   Firebase Auth/Firestore API calls → Skip (Firebase SDK handles its own offline)
//
// FIX v2: Firebase SDK scripts (www.gstatic.com/firebasejs/) are now actively
// cached by the SW instead of being skipped. Previously we relied on the browser's
// HTTP cache which can expire or be cleared, causing a blank screen on cold offline
// starts. Now the SDK is cached in CDN_CACHE on first load and served from there.

const CACHE_VERSION = 'v2'; // bumped so new cache rules take effect immediately
const APP_CACHE     = `resilink-app-${CACHE_VERSION}`;
const TILE_CACHE    = `resilink-tiles-${CACHE_VERSION}`;
const CDN_CACHE     = `resilink-cdn-${CACHE_VERSION}`;

// ── APP SHELL ──────────────────────────────────────────────────
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

// ── INSTALL ────────────────────────────────────────────────────
self.addEventListener('install', (event) => {
  event.waitUntil(
    caches.open(APP_CACHE)
      .then((cache) => cache.addAll(APP_SHELL))
      .then(() => self.skipWaiting())
  );
});

// ── ACTIVATE ───────────────────────────────────────────────────
self.addEventListener('activate', (event) => {
  const validCaches = [APP_CACHE, TILE_CACHE, CDN_CACHE];

  event.waitUntil(
    caches.keys()
      .then((keys) => Promise.all(
        keys
          .filter((key) => !validCaches.includes(key))
          .map((key) => caches.delete(key))
      ))
      .then(() => self.clients.claim())
  );
});

// ── FETCH ──────────────────────────────────────────────────────
self.addEventListener('fetch', (event) => {
  const url = new URL(event.request.url);

  // ── 1. Skip Firebase Auth/Firestore/database API calls only ──
  // These are runtime API calls — Firebase SDK handles offline persistence
  // for these natively. We must NOT intercept them.
  // NOTE: We no longer skip www.gstatic.com/firebasejs/ here — those are
  // the SDK *script files* which we now actively cache in CDN_CACHE below.
  if (
    url.hostname.includes('firebase.googleapis.com') ||
    url.hostname.includes('firebaseio.com') ||
    url.hostname.includes('firestore.googleapis.com') ||
    url.hostname.includes('identitytoolkit.googleapis.com') ||
    url.hostname.includes('securetoken.googleapis.com') ||
    url.hostname.includes('firebaseapp.com') ||
    url.hostname === 'www.googleapis.com'
  ) {
    return; // Let Firebase SDK handle these natively
  }

  // ── 2. Map tiles — Stale While Revalidate ──
  if (url.hostname.includes('tile.openstreetmap.org')) {
    event.respondWith(staleWhileRevalidate(event.request, TILE_CACHE));
    return;
  }

  // ── 3. CDN assets + Firebase SDK scripts — Cache First ──
  // Firebase SDK scripts live on www.gstatic.com/firebasejs/ — we now
  // actively cache these so cold offline starts work reliably without
  // depending on the browser's HTTP cache.
  if (
    url.hostname.includes('unpkg.com') ||
    url.hostname.includes('fonts.googleapis.com') ||
    url.hostname.includes('fonts.gstatic.com') ||
    url.hostname.includes('raw.githubusercontent.com') ||
    url.hostname.includes('cdnjs.cloudflare.com') ||
    (url.hostname === 'www.gstatic.com' && url.pathname.startsWith('/firebasejs/'))
  ) {
    event.respondWith(cacheFirst(event.request, CDN_CACHE));
    return;
  }

  // ── 4. App shell — Cache First with network fallback ──
  event.respondWith(cacheFirst(event.request, APP_CACHE));
});

// ── CACHE STRATEGIES ───────────────────────────────────────────

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
    if (request.mode === 'navigate') {
      const fallback = await caches.match('/index.html');
      if (fallback) return fallback;
    }
    return new Response('Offline — resource not cached', {
      status: 503,
      headers: { 'Content-Type': 'text/plain' }
    });
  }
}

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
self.addEventListener('message', (event) => {
  if (event.data === 'skipWaiting') {
    self.skipWaiting();
  }
});