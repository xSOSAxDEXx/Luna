/* Luna Beatzzz service worker.
 *
 * - Install: precaches the whole web app, including every bundled sound, so
 *   the installed app works fully offline from the first launch. The file
 *   list and version are filled in by scripts/postexport-web.mjs after
 *   `expo export` (see `npm run build:web`).
 * - Page loads: network first, falling back to the cached app shell.
 * - Everything else from this site: cache first, stored the first time.
 * - Audio byte-range requests are answered from the cache with a 206, which
 *   Safari needs to play cached audio.
 */
const VERSION = '__LUNA_VERSION__';
const PRECACHE = /* __LUNA_PRECACHE__ */ [];

const CACHE = `luna-${VERSION}`;
// Paths are relative to the service worker's scope ("/" locally, "/Luna/" on
// GitHub Pages), so the same file works in both places.
const BASE = new URL(self.registration.scope).pathname;
const at = (p) => BASE + p.replace(/^\//, '');
const SHELL = ['', 'manifest.webmanifest', 'icons/icon-192.png', 'icons/icon-512.png'].map(at);

self.addEventListener('install', (event) => {
  event.waitUntil(
    caches
      .open(CACHE)
      .then((cache) => cache.addAll([...new Set([...SHELL, ...PRECACHE.map(at)])]))
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
            .filter((key) => key.startsWith('luna-') && key !== CACHE)
            .map((key) => caches.delete(key)),
        ),
      )
      .then(() => self.clients.claim()),
  );
});

/** Serves a byte range of a cached (or freshly fetched) file. */
async function rangeResponse(request) {
  const cache = await caches.open(CACHE);
  let full = await cache.match(request.url, { ignoreVary: true });
  if (!full) {
    full = await fetch(request.url);
    if (!full.ok) return full;
    cache.put(request.url, full.clone());
  }
  const buffer = await full.arrayBuffer();
  const size = buffer.byteLength;
  const match = /bytes=(\d*)-(\d*)/.exec(request.headers.get('range') || '');
  let start = match && match[1] ? Number(match[1]) : 0;
  let end = match && match[2] ? Number(match[2]) : size - 1;
  if (match && !match[1] && match[2]) {
    // Suffix range ("bytes=-500"): the last N bytes.
    start = Math.max(0, size - Number(match[2]));
    end = size - 1;
  }
  end = Math.min(end, size - 1);
  if (start >= size || start > end) {
    return new Response(null, { status: 416, headers: { 'Content-Range': `bytes */${size}` } });
  }
  return new Response(buffer.slice(start, end + 1), {
    status: 206,
    statusText: 'Partial Content',
    headers: {
      'Content-Type': full.headers.get('Content-Type') || 'application/octet-stream',
      'Content-Range': `bytes ${start}-${end}/${size}`,
      'Content-Length': String(end - start + 1),
      'Accept-Ranges': 'bytes',
    },
  });
}

self.addEventListener('fetch', (event) => {
  const { request } = event;
  if (request.method !== 'GET') return;
  const url = new URL(request.url);
  if (url.origin !== self.location.origin) return;

  if (request.headers.has('range')) {
    event.respondWith(rangeResponse(request));
    return;
  }

  if (request.mode === 'navigate') {
    event.respondWith(
      fetch(request)
        .then((response) => {
          const copy = response.clone();
          caches.open(CACHE).then((cache) => cache.put(BASE, copy));
          return response;
        })
        .catch(() => caches.match(BASE)),
    );
    return;
  }

  event.respondWith(
    caches.match(request, { ignoreVary: true }).then(
      (cached) =>
        cached ||
        fetch(request).then((response) => {
          if (response.ok) {
            const copy = response.clone();
            caches.open(CACHE).then((cache) => cache.put(request, copy));
          }
          return response;
        }),
    ),
  );
});
