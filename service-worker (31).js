// ════════════════════════════════════════════════════════════════════════════
// Footy Legends Quiz — Service Worker
// ════════════════════════════════════════════════════════════════════════════
//
// Strategy:
//   1. Cache the core app shell on install (HTML, manifest, icons)
//   2. Cache Google Fonts on demand (stale-while-revalidate)
//   3. Cache-first for app shell — fast loads, works offline
//   4. Network-first for HTML — ensures users get latest version when online
//   5. On new SW activation, send message to all clients to prompt reload
//
// IMPORTANT: When you ship a new build, BUMP CACHE_VERSION below. This
// triggers the install/activate cycle that purges the old cache and notifies
// clients that a new version is ready.
// ════════════════════════════════════════════════════════════════════════════

const CACHE_VERSION = 'v51';
const CORE_CACHE = 'footy-core-' + CACHE_VERSION;
const FONT_CACHE = 'footy-fonts-' + CACHE_VERSION;

// Files that make up the app shell — cached on install
const CORE_ASSETS = [
  '/',
  '/index.html',
  '/styles.css',
  '/db.js',
  '/storage.js',
  '/core.js',
  '/manifest.json',
  '/icon-192.png',
  '/icon-512.png',
  '/icon-192-maskable.png',
  '/icon-512-maskable.png'
];

// ─── INSTALL ────────────────────────────────────────────────────────────────
// Pre-cache the app shell. New SWs WAIT until the user explicitly
// activates them via the update banner (or all tabs close).
// This protects users from being interrupted mid-game.
self.addEventListener('install', event => {
  event.waitUntil(
    caches.open(CORE_CACHE)
      .then(cache => cache.addAll(CORE_ASSETS))
  );
});

// ─── ACTIVATE ───────────────────────────────────────────────────────────────
// Delete old caches and take control of all open clients.
// Then notify clients there's an update available.
self.addEventListener('activate', event => {
  event.waitUntil(
    caches.keys().then(keys => {
      return Promise.all(
        keys
          .filter(key => key !== CORE_CACHE && key !== FONT_CACHE)
          .map(key => caches.delete(key))
      );
    }).then(() => self.clients.claim())
  );
});

// ─── FETCH ──────────────────────────────────────────────────────────────────
self.addEventListener('fetch', event => {
  const req = event.request;
  const url = new URL(req.url);

  // Only handle GET — never cache POST/PUT/etc.
  if(req.method !== 'GET') return;

  // Strategy 1: Google Fonts — stale-while-revalidate
  // First load: fetch + cache. Subsequent: serve from cache, refresh in background.
  if(url.hostname === 'fonts.googleapis.com' || url.hostname === 'fonts.gstatic.com'){
    event.respondWith(
      caches.open(FONT_CACHE).then(cache =>
        cache.match(req).then(cached => {
          const fetchPromise = fetch(req).then(response => {
            if(response && response.status === 200){
              cache.put(req, response.clone());
            }
            return response;
          }).catch(() => cached); // offline fallback
          return cached || fetchPromise;
        })
      )
    );
    return;
  }

  // Strategy 2: Same-origin HTML — network-first
  // Tries network first to get fresh content. Falls back to cache when offline.
  if(req.mode === 'navigate' || (req.headers.get('accept') || '').includes('text/html')){
    event.respondWith(
      fetch(req)
        .then(response => {
          // Cache the fresh response for offline use
          const respClone = response.clone();
          caches.open(CORE_CACHE).then(cache => cache.put(req, respClone));
          return response;
        })
        .catch(() => caches.match(req).then(cached => cached || caches.match('/index.html')))
    );
    return;
  }

  // Strategy 3: Other same-origin assets (icons, manifest) — cache-first
  if(url.origin === self.location.origin){
    event.respondWith(
      caches.match(req).then(cached => {
        if(cached) return cached;
        return fetch(req).then(response => {
          if(response && response.status === 200){
            const respClone = response.clone();
            caches.open(CORE_CACHE).then(cache => cache.put(req, respClone));
          }
          return response;
        });
      })
    );
    return;
  }

  // Other cross-origin requests — pass through to network (no caching)
});

// ─── MESSAGE HANDLING ──────────────────────────────────────────────────────
// Allow client to trigger immediate activation of a waiting SW.
self.addEventListener('message', event => {
  if(event.data && event.data.type === 'SKIP_WAITING'){
    self.skipWaiting();
  }
});
