const CACHE_VERSION = 'v4';
const CACHE_PREFIX = 'rpg-todo';
const STATIC_CACHE = `${CACHE_PREFIX}-static-${CACHE_VERSION}`;
const RUNTIME_CACHE = `${CACHE_PREFIX}-runtime-${CACHE_VERSION}`;

const APP_SHELL = './index.html';

const STATIC_ASSETS = [
  './',
  APP_SHELL,
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

const staticAssetUrls = STATIC_ASSETS.map((asset) => new URL(asset, self.location.href).href);

const isStaticAsset = (url) => staticAssetUrls.includes(url.href);

const putInCache = (cacheName, request, response) =>
  caches.open(cacheName).then((cache) => cache.put(request, response));

self.addEventListener('install', (event) => {
  event.waitUntil(
    caches
      .open(STATIC_CACHE)
      .then((cache) =>
        Promise.all(
          STATIC_ASSETS.map((asset) =>
            // cache: 'reload' bypasses the HTTP cache so a stale CDN copy never poisons the app shell.
            cache.add(new Request(asset, { cache: 'reload' })).catch(() => undefined)
          )
        )
      )
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

self.addEventListener('message', (event) => {
  if (event.data && event.data.type === 'SKIP_WAITING') {
    self.skipWaiting();
  }
});

// Cache-first for precached assets, stale-while-revalidate for the rest
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

  // Navigations: network-first, falling back to the cached app shell so the
  // installed app opens with no connection (start_url carries a query string).
  if (request.mode === 'navigate') {
    event.respondWith(
      fetch(request)
        .then((response) => {
          if (response && response.ok) {
            const clone = response.clone();
            void putInCache(STATIC_CACHE, APP_SHELL, clone);
            return response;
          }
          throw new Error('navigation failed');
        })
        .catch(() =>
          caches
            .match(APP_SHELL)
            .then((cached) => cached || caches.match('./'))
            .then((cached) => cached || Response.error())
        )
    );
    return;
  }

  // Same-origin GET: cache-first with background refresh (stale-while-revalidate).
  event.respondWith(
    caches.match(request, { ignoreSearch: true }).then((cached) => {
      const networkUpdate = fetch(request)
        .then((response) => {
          if (response && response.ok && response.type === 'basic') {
            const clone = response.clone();
            void putInCache(isStaticAsset(url) ? STATIC_CACHE : RUNTIME_CACHE, request, clone);
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
