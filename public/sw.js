// A minimal, intentionally no-op service worker. Its only job is to exist and be registered —
// Android/Chrome's installability heuristics look for an active service worker even when there's
// nothing to cache. It does not intercept fetches or cache anything; that's a separate, later
// "Offline" sub-project's job, which needs its own design given this app's real-time,
// server-authoritative architecture (match state is never meaningfully available offline the way
// a static page would be).
self.addEventListener('install', () => self.skipWaiting());
self.addEventListener('activate', (event) => event.waitUntil(self.clients.claim()));
