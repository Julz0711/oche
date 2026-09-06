// A runtime cache for offline support (see docs/superpowers/specs/2026-09-06-offline-support-design.md).
// Network-first for every same-origin GET except /api/* (which must always hit the network live,
// or fail explicitly — never served stale). On success, the response is stashed; on failure
// (offline), the last cached copy is served instead. This is a runtime cache, not a build-time
// precache manifest — it only ever serves a URL that was actually visited at least once while
// online, which matches this feature's stated scope (an already-visited match survives offline;
// a brand-new one still needs connectivity to load for the first time).
const CACHE_NAME = 'oche-runtime-v1';

self.addEventListener('install', () => self.skipWaiting());

self.addEventListener('activate', (event) => {
  event.waitUntil(
    (async () => {
      const keys = await caches.keys();
      await Promise.all(keys.filter((key) => key !== CACHE_NAME).map((key) => caches.delete(key)));
      await self.clients.claim();
    })()
  );
});

self.addEventListener('fetch', (event) => {
  const { request } = event;
  const url = new URL(request.url);

  if (request.method !== 'GET' || url.origin !== self.location.origin || url.pathname.startsWith('/api/')) {
    return;
  }

  event.respondWith(
    (async () => {
      const cache = await caches.open(CACHE_NAME);
      try {
        const response = await fetch(request);
        if (response.ok) {
          await cache.put(request, response.clone());
        }
        return response;
      } catch {
        const cached = await cache.match(request);
        if (cached) return cached;
        throw new Error('Offline and no cached response available for this request');
      }
    })()
  );
});
