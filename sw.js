/* =========================================================
   Service worker for Vikash's personal site.

   Fixes the previous cache-FIRST worker (copied from another
   project) that served stale HTML/CSS forever and hid updates
   like the photography section. This one is:
     - versioned  → old caches are deleted on activate
     - network-FIRST for same-origin GETs → always fresh when
       online, falls back to cache only when offline
     - self-healing → skipWaiting + clients.claim so an already
       -installed stale worker is replaced immediately
   Bump CACHE_NAME whenever you want to guarantee a clean sweep.
   ========================================================= */
const CACHE_NAME = 'vikash-site-v2';

// Core files worth having available offline. Kept minimal and
// resilient — a missing entry won't abort installation.
const CORE_ASSETS = [
  '/',
  '/index.html',
  '/style.css',
  '/script.js',
  '/favicon.svg',
  '/manifest.json',
  '/photography/photography.css',
  '/photography/config.js',
  '/photography/seed-data.js',
  '/photography/data-adapter.js',
  '/photography/auth.js',
  '/photography/bento-grid.js',
  '/photography/lightbox.js',
  '/photography/photography.js'
];

self.addEventListener('install', (event) => {
  self.skipWaiting(); // take over as soon as possible
  event.waitUntil(
    caches.open(CACHE_NAME).then((cache) =>
      // cache each asset individually so one 404 doesn't fail the batch
      Promise.all(CORE_ASSETS.map((url) => cache.add(url).catch(() => null)))
    )
  );
});

self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches.keys()
      .then((names) => Promise.all(
        names.filter((n) => n !== CACHE_NAME).map((n) => caches.delete(n))
      ))
      .then(() => self.clients.claim())
  );
});

self.addEventListener('fetch', (event) => {
  const req = event.request;

  // Only handle same-origin GET requests; let everything else pass through.
  if (req.method !== 'GET' || new URL(req.url).origin !== self.location.origin) {
    return;
  }

  // Network-first: always try the network so updates are picked up
  // immediately; fall back to cache only when offline.
  event.respondWith(
    fetch(req)
      .then((res) => {
        if (res && res.status === 200 && res.type === 'basic') {
          const copy = res.clone();
          caches.open(CACHE_NAME).then((cache) => cache.put(req, copy));
        }
        return res;
      })
      .catch(() => caches.match(req).then((cached) => cached || caches.match('/index.html')))
  );
});
