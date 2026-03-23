// sw.js — Resilink Service Worker
// Handles offline caching for the PWA.
// Cache strategies:
//   App shell (HTML/CSS/JS) → Cache First
//   Map tiles (OpenStreetMap) → Stale While Revalidate
//   CDN (Leaflet, Fonts) → Cache First with network fallback
//   Firebase SDK/API → Skip (Firebase SDK handles its own offline)

const CACHE_VERSION = 'v1';
const APP_CACHE     = `resilink-app-${CACHE_VERSION}`;
const TILE_CACHE    = `resilink-tiles-${CACHE_VERSION}`;
const CDN_CACHE     = `resilink-cdn-${CACHE_VERSION}`;

// ── APP SHELL ──────────────────────────────────────────────────
// All local files that make the app work offline
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
// Cache the app shell immediately on first install
self.addEventListener('install', (event) => {
  event.waitUntil(
    caches.open(APP_CACHE)
      .then((cache) => cache.addAll(APP_SHELL))
      .then(() => self.skipWaiting()) // Activate immediately, don't wait
  );
});

// ── ACTIVATE ───────────────────────────────────────────────────
// Clean up old caches from previous versions
self.addEventListener('activate', (event) => {
  const validCaches = [APP_CACHE, TILE_CACHE, CDN_CACHE];

  event.waitUntil(
    caches.keys()
      .then((keys) => Promise.all(
        keys
          .filter((key) => !validCaches.includes(key))
          .map((key) => caches.delete(key))
      ))
      .then(() => self.clients.claim()) // Take control of all tabs immediately
  );
});

// ── FETCH ──────────────────────────────────────────────────────
self.addEventListener('fetch', (event) => {
  const url = new URL(event.request.url);

  // ── 1. Skip Firebase SDK & API calls completely ──
  // Firebase Auth, Firestore, and the Firebase JS SDK handle
  // their own offline persistence — we must not interfere.
  if (
    url.hostname.includes('firebasejs') ||
    url.hostname.includes('firebase.googleapis.com') ||
    url.hostname.includes('firebaseio.com') ||
    url.hostname.includes('firestore.googleapis.com') ||
    url.hostname.includes('identitytoolkit.googleapis.com') ||
    url.hostname.includes('securetoken.googleapis.com') ||
    url.hostname.includes('firebaseapp.com') ||
    url.hostname === 'www.googleapis.com'
  ) {
    return; // Let the browser (and Firebase SDK) handle it natively
  }

  // ── 2. Map tiles — Stale While Revalidate ──
  // Show cached tiles instantly, update in background
  if (url.hostname.includes('tile.openstreetmap.org')) {
    event.respondWith(staleWhileRevalidate(event.request, TILE_CACHE));
    return;
  }

  // ── 3. CDN assets (Leaflet, Google Fonts, pointhi markers) — Cache First ──
  if (
    url.hostname.includes('unpkg.com') ||
    url.hostname.includes('fonts.googleapis.com') ||
    url.hostname.includes('fonts.gstatic.com') ||
    url.hostname.includes('raw.githubusercontent.com') ||
    url.hostname.includes('cdnjs.cloudflare.com')
  ) {
    event.respondWith(cacheFirst(event.request, CDN_CACHE));
    return;
  }

  // ── 4. App shell — Cache First with network fallback ──
  event.respondWith(cacheFirst(event.request, APP_CACHE));
});

// ── CACHE STRATEGIES ───────────────────────────────────────────

/**
 * Cache First: Return cached response if available.
 * If not cached, fetch from network and cache the result.
 * Falls back to a simple offline response if both fail.
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
    // If it's a navigation request and we're offline, return index.html
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

/**
 * Stale While Revalidate: Return cached immediately (even if stale),
 * then update the cache in the background from the network.
 * Perfect for map tiles.
 */
async function staleWhileRevalidate(request, cacheName) {
  const cache  = await caches.open(cacheName);
  const cached = await cache.match(request);

  // Always try to update in background
  const fetchPromise = fetch(request)
    .then((response) => {
      if (response && response.ok) {
        cache.put(request, response.clone());
      }
      return response;
    })
    .catch(() => null);

  // Return cached immediately, or wait for network if nothing cached
  return cached || await fetchPromise ||
    new Response('', { status: 204 }); // Empty response for missing tiles
}

// ── MESSAGE HANDLER ────────────────────────────────────────────
// Allow the app to send messages to the service worker
self.addEventListener('message', (event) => {
  if (event.data === 'skipWaiting') {
    self.skipWaiting();
  }
});