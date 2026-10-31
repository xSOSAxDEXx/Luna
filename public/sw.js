/* Luna Beats service worker.
 *
 * Step 1 scope: make the installed web app open offline.
 *  - Page loads: network first, falling back to the cached app shell.
 *  - Everything else from this site (JS bundles, fonts, images, sounds):
 *    cache first, stored the first time it's fetched.
 *
 * Step 3 adds precaching of every bundled sound at install time so the
 * library works offline before a sound has ever been played.
 *
 * Bump VERSION to drop old caches after a breaking change.
 */
const VERSION = 'v1';
const SHELL_CACHE = `luna-shell-${VERSION}`;
const ASSET_CACHE = `luna-assets-${VERSION}`;
const SHELL = ['/', '/manifest.webmanifest', '/icons/icon-192.png', '/icons/icon-512.png'];

self.addEventListener('install', (event) => {
  event.waitUntil(
    caches
      .open(SHELL_CACHE)
      .then((cache) => cache.addAll(SHELL))
      .then(() => self.skipWaiting()),
  );
});

self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches
      .keys()
      .then((keys) =>
        Promise.all(
          keys
            .filter((key) => key.startsWith('luna-') && key !== SHELL_CACHE && key !== ASSET_CACHE)
            .map((key) => caches.delete(key)),
        ),
      )
      .then(() => self.clients.claim()),
  );
});

self.addEventListener('fetch', (event) => {
  const { request } = event;
  if (request.method !== 'GET') return;
  const url = new URL(request.url);
  if (url.origin !== self.location.origin) return;

  // Audio elements ask for byte ranges; let the browser handle those directly
  // until step 3 adds proper range support from the cache.
  if (request.headers.has('range')) return;

  if (request.mode === 'navigate') {
    event.respondWith(
      fetch(request)
        .then((response) => {
          const copy = response.clone();
          caches.open(SHELL_CACHE).then((cache) => cache.put('/', copy));
          return response;
        })
        .catch(() => caches.match('/')),
    );
    return;
  }

  event.respondWith(
    caches.match(request).then(
      (cached) =>
        cached ||
        fetch(request).then((response) => {
          if (response.ok) {
            const copy = response.clone();
            caches.open(ASSET_CACHE).then((cache) => cache.put(request, copy));
          }
          return response;
        }),
    ),
  );
});
