# Offline Support Design

**Date:** 2026-09-06
**Status:** Approved for implementation
**Parent spec:** [2026-09-01-oche-mvp-architecture.md](2026-09-01-oche-mvp-architecture.md) (section 8, M5–M7 — the last of five sub-projects this phase decomposes into; live drawer, aggregate stats page, PWA installability, and share images all shipped earlier this session)

## 1. Scope

**In scope: local mode only.** This app has two structurally different modes. Remote mode is server-authoritative (every throw is a network call; state syncs via Ably) — a meaningful offline story there would mean conflict resolution and replay queues, a much bigger undertaking than fits a 2.5-weekend polish phase, and is explicitly out of scope. Local mode (two players sharing one device) already makes zero network calls per throw — `store/match.ts`'s `applyThrow`/`undo` update in-memory state directly for `mode === 'local'` — so it is the actual scope-fit for "offline support" in this phase.

**The real gap, precisely:** local mode already survives a network drop *while the tab stays open* (no per-throw network dependency). What it does **not** survive is a page reload or a full app close+reopen: `app/(match)/match/[id]/page.tsx`'s mount effect always does `fetch('/api/matches/:id')` to learn `gameId`/`settings`, and — critically — **always re-initializes** game state from `module.init(...)` rather than restoring progress, because no client-side persistence of in-progress state exists at all today. Offline, that fetch fails, the page shows a permanent "Match not found" error, and the match — including everything already played — is gone with no recovery.

**In scope:**
- Local matches survive a reload or full close+reopen while mid-match, including fully offline, **provided the match was already created and loaded at least once while online.** Starting a brand-new match still requires connectivity once (it's created server-side) — not solved here, per the approved design conversation.
- A retry mechanism for the completion POST (added in the aggregate-stats work) when it fails — e.g. because the match finished while offline — closing an already-documented gap from that plan's final review (a failed completion POST was previously unrecoverable).
- Real service-worker caching (the existing `public/sw.js` is a deliberate no-op) sufficient to let a previously-visited match URL load its shell with zero connection.
- A simple offline indicator during local play.

**Explicitly out of scope:**
- Remote mode resilience of any kind (dropped Ably connection, replay/sync queues, conflict resolution) — a structurally bigger project, deliberately not attempted here.
- Starting a brand-new local match with zero connectivity (match creation is a server round-trip; not changed here).
- A full asset-precaching strategy (e.g. via Serwist) — the hand-rolled runtime-cache approach below was chosen over a new dependency, per the approved design conversation; this project already has this precedent (icon generation in the PWA plan preferred no new dependency where a small custom approach sufficed).
- Push notifications, background sync APIs, or any other PWA capability beyond what's needed for this scope.
- Next.js's experimental `useOffline`/`next/offline` — investigated during design (this Next.js version ships it as a real, documented feature). Rejected for two concrete reasons, not just "avoid experimental flags": (1) it only auto-retries `<Link>` navigations, prefetches, and Server Actions — this app's match page uses a plain client-side `fetch()`, which the feature explicitly does not intercept; (2) its own docs state a full page reload while offline still needs a service worker regardless, which this design already provides. Its `useOffline()` hook would only ever be used here for a boolean signal that `window`'s standard `online`/`offline` events already provide without an experimental flag.

## 2. Client-side match persistence (`lib/localMatchStorage.ts`)

New file, pure functions over `window.localStorage`, wrapped in try/catch throughout — localStorage can throw (private browsing, quota exceeded, disabled); every function degrades to a no-op/`null` return rather than throwing, matching this project's established best-effort treatment of non-critical side effects (`publishMatchEvent`, the completion POST itself).

```ts
interface StoredLocalMatch {
  gameId: string;
  settings: unknown;
  gameState: unknown;
  pendingCompletion?: { winnerId: string | null } | null;
}

function saveLocalMatch(matchId: string, snapshot: StoredLocalMatch): void
function loadLocalMatch(matchId: string): StoredLocalMatch | null
function clearLocalMatch(matchId: string): void
function markPendingCompletion(matchId: string, winnerId: string | null): void
function listPendingCompletions(): { matchId: string; snapshot: StoredLocalMatch }[]
```

Keyed as `oche:local-match:<matchId>` in localStorage, JSON-serialized. `listPendingCompletions` scans `localStorage` keys by this prefix and filters to entries with a non-null `pendingCompletion` — used by the retry manager (section 4).

## 3. Store and match-page wiring

**`store/match.ts`:** the local-mode branches of `setMatch`, `applyThrow`, and `undo` each call `saveLocalMatch(matchId, {gameId: gameModule.id, settings, gameState})` after updating in-memory state — the single choke point where local-mode state already changes, matching this file's existing role as the one place local-mode mutations happen.

**`app/(match)/match/[id]/page.tsx`'s mount effect:** the order changes. Today it always fetches, then branches on the response's `mode`. Now:

1. Call `loadLocalMatch(id)` first — no network involved. If found, this **is** a local match by construction (only local mode ever writes an entry), so hydrate directly: load the `gameModule` via `getGameModule(snapshot.gameId)`, then `setMatch({..., gameState: snapshot.gameState, settings: snapshot.settings, mode: 'local'})`. No fetch happens at all, online or offline.
2. Only if no local snapshot exists (first-ever load of a match right after creation, or localStorage was cleared) does the existing `fetch('/api/matches/:id')` path run, exactly as today. Once that fetch succeeds and `module.init(...)` runs for a local match, the resulting state flows through `setMatch`'s local branch, which persists it — so the *next* reload of the same match finds a snapshot and takes the offline-safe path.

This makes local mode's server round-trip a one-time bootstrap rather than something every reload repeats and then discards.

## 4. Completion retry

The aggregate-stats plan's completion effect (`app/(match)/match/[id]/page.tsx`) POSTs to `/api/matches/:id/complete` once `gameModule.isComplete` is true, catching and ignoring failures. This design extends it:

- **On success:** call `clearLocalMatch(id)` — the match is synced, no reason to keep it.
- **On failure:** call `markPendingCompletion(id, winnerId)` instead of silently dropping it. The match's full final `gameState` is already in that localStorage entry from section 3's wiring, so nothing extra needs to be captured.

**New component `components/PendingSyncManager.tsx`** — a side-effect-only component (no render), following the exact precedent of `components/PwaRegistration.tsx`: mounted in `app/layout.tsx` alongside it. On mount, and on the browser's `online` event, it calls `listPendingCompletions()` and re-POSTs each to `/api/matches/:matchId/complete`; on success, `clearLocalMatch(matchId)`. The completion route already has an idempotency guard (from the aggregate-stats hardening pass — atomic `findOneAndUpdate` scoped to `status: 'live'`), so a retry against an already-synced match is safely a no-op, and a retry against a match that was *also* completed through some other path (there is no such other path for local mode, but the guard exists regardless) can't double-write.

## 5. Service worker runtime cache (`public/sw.js`)

The existing file is a deliberate no-op (`install`/`activate` only, explicitly commented as deferring caching to "a separate, later 'Offline' sub-project"). This is that sub-project. Extend it with a `fetch` handler:

- Ignore (pass through to network untouched, no caching either direction) any request that is not a same-origin GET, or whose URL path starts with `/api/` — API responses must never be served stale or cached; they either succeed live or the caller's existing error handling applies.
- For every other same-origin GET (page navigations, `_next/static` JS/CSS, icons, the manifest): try the network first. On success, clone the response into a named `Cache` (e.g. `oche-runtime-v1`) and return it. On failure, fall back to whatever is in that cache for the same request; if nothing is cached (a route never visited while online), the request fails as it would with no service worker at all — an accepted, explicit boundary matching this design's stated scope (only an already-visited match survives offline).
- `activate` gains a cleanup step: delete any previously-named runtime cache that doesn't match the current `oche-runtime-v1` name, so a future cache-strategy change doesn't accumulate stale caches indefinitely. (Bumping the cache name by hand when this file's caching logic changes is the versioning mechanism — no build tooling needed for something this small.)

This is a runtime cache (populated organically as pages/assets are actually requested), not a build-time precache manifest — deliberately, since Turbopack's hashed asset filenames change every build and a hand-maintained precache list would go stale; a library like Serwist solves that properly, but was rejected for this scope (section 1).

## 6. Offline indicator

A small client component (e.g. `components/OfflineBanner.tsx`) using `window.addEventListener('online'/'offline', ...)` plus `navigator.onLine` for its initial value, rendering a small "You're offline — local matches keep working" banner when offline. Mounted in the match page (or the root layout, for visibility everywhere) — a design/placement detail for the implementation plan to finalize against this project's existing gamified UI conventions (bordered panels, `bg-slate`/`text-sisal` tokens), not specified further here since it's a small, low-risk visual component.

## 7. Testing

- `lib/localMatchStorage.ts` gets real unit tests: save/load/clear round-trip, `markPendingCompletion`/`listPendingCompletions` behavior, and a localStorage-throws case (e.g. mock `Storage.prototype.setItem` to throw) confirming graceful degradation — plain function tests against jsdom's built-in `localStorage`, no mocking framework, matching `lib/matchLobby.test.ts`'s precedent.
- The match-page mount reordering (localStorage-first, fetch-fallback) and the retry manager are integration-shaped and get manual verification, per this project's established precedent for anything DB/browser-facing that isn't pure logic (no route in this project has automated tests; the pure logic underneath does).
- The service worker and full offline UX (the actual "close the app, go offline, reopen, resume" scenario) get manual verification via Chrome DevTools' Network→Offline panel and a real reload — the same testing approach the PWA installability plan already used, since no automated browser-test infrastructure exists in this project.

## 8. Summary

Local mode already has no per-throw network dependency; the actual gap was that nothing survived a reload, because no client-side persistence existed. This design adds exactly that (localStorage, made the source of truth for an already-loaded local match), extends the existing no-op service worker with a runtime cache so the app shell itself can load with zero connection, and closes a second, related, already-known gap (unrecoverable failed completion POSTs) using the same persistence layer. Next.js's own experimental offline feature was investigated and deliberately not used, for concrete technical reasons tied to how this app's pages actually fetch data — not just to avoid an experimental flag. Remote mode is untouched.
