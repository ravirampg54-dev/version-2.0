const CACHE_VERSION = 'v3';
const CACHE_PREFIX = 'rpg-todo';
const STATIC_CACHE = `${CACHE_PREFIX}-static-${CACHE_VERSION}`;
const RUNTIME_CACHE = `${CACHE_PREFIX}-runtime-${CACHE_VERSION}`;

const STATIC_ASSETS = [
  './',
  './index.html',
  './manifest.json',
  './style.css',
  './app.js',
  './vendor/capacitor.js',
  './vendor/capacitor-app.js',
  './vendor/local-notifications.js',
  './assets/favicon-16.png',
  './assets/favicon-32.png',
  './assets/apple-touch-icon.png',
  './assets/icon-192.png',
  './assets/icon-512.png',
  './assets/icon-maskable-192.png',
  './assets/icon-maskable-512.png',
];

const isStaticAsset = (url) =>
  url.origin === self.location.origin && STATIC_ASSETS.some((asset) => new URL(asset, self.location.origin).href === url.href);

self.addEventListener('install', (event) => {
  event.waitUntil(
    caches
      .open(STATIC_CACHE)
      .then((cache) => cache.addAll(STATIC_ASSETS))
      .catch((error) => {
        // A failed prefetch (e.g. offline first install) must not break the install.
        void error;
      })
      .then(() => self.skipWaiting())
  );
});

self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches
      .keys()
      .then((keys) =>
        Promise.all(
          keys
            .filter((key) => key.startsWith(CACHE_PREFIX) && !key.endsWith(CACHE_VERSION))
            .map((key) => caches.delete(key))
        )
      )
      .then(() => self.clients.claim())
  );
});

// Cache-first for static assets, stale-while-revalidate for everything else
// (this app has no remote API; "dynamic" requests fall back to network then cache).
self.addEventListener('fetch', (event) => {
  const request = event.request;

  if (request.method !== 'GET') {
    return;
  }

  const url = new URL(request.url);
  if (url.origin !== self.location.origin) {
    return;
  }

  // Navigations: network-first, falling back to the cached app shell.
  if (request.mode === 'navigate') {
    event.respondWith(
      fetch(request)
        .then((response) => {
          if (response && response.ok) {
            const clone = response.clone();
            caches.open(STATIC_CACHE).then((cache) => cache.put('./index.html', clone));
            return response;
          }
          throw new Error('navigation failed');
        })
        .catch(() => caches.match('./index.html'))
    );
    return;
  }

  // Same-origin GET: cache-first with background refresh (stale-while-revalidate).
  event.respondWith(
    caches.match(request).then((cached) => {
      const networkUpdate = fetch(request)
        .then((response) => {
          if (response && response.ok && response.type === 'basic') {
            const clone = response.clone();
            caches.open(isStaticAsset(url) ? STATIC_CACHE : RUNTIME_CACHE).then((cache) => cache.put(request, clone));
          }
          return response;
        })
        .catch(() => cached);

      if (cached) {
        return cached;
      }
      return networkUpdate;
    })
  );
});