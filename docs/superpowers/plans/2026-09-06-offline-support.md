# Offline Support Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [x]`) syntax for tracking.

**Goal:** Let a local match (two players, one device) survive a page reload or a full app close+reopen — including with zero connectivity — provided it was already created and loaded at least once online; retry a failed match-completion sync automatically; and make the app shell itself loadable offline via a real (currently no-op) service worker cache.

**Architecture:** A new `lib/localMatchStorage.ts` persists local-mode match state to `localStorage`, becoming the source of truth for an already-loaded local match (the match page checks it before ever hitting the network). `store/match.ts`'s local-mode branches write through to it on every change. A small new `PendingSyncManager` component retries any match-completion POST that failed to sync. `public/sw.js` gains a real runtime cache (network-first, falling back to cache) so a previously-visited match URL can load with no connection at all. Remote mode is untouched throughout.

**Tech Stack:** TypeScript, Zustand, Vitest, the browser's `Storage`/`ServiceWorker`/`Cache` APIs — no new npm dependencies.

**Spec:** [2026-09-06-offline-support-design.md](../specs/2026-09-06-offline-support-design.md)

## Global Constraints

- Local mode only. Remote mode's code paths (`useRemoteMatchSync`, the throws/undo API routes, Ably) are not touched anywhere in this plan.
- Starting a brand-new local match still requires connectivity once (match creation is a server round-trip) — not changed by this plan.
- Every `localStorage` access must be wrapped in try/catch and degrade to a no-op/`null` rather than throwing — `localStorage` can throw (private browsing, quota exceeded, disabled). This project already treats non-critical side effects this way (`publishMatchEvent`, the completion POST itself).
- The service worker must never cache anything under `/api/*` — those responses either succeed live or fail explicitly; never served stale.
- No new npm dependencies. This project's `vitest.config.mts` uses `environment: 'node'` and `jsdom` is not installed — `lib/localMatchStorage.ts` is written against the bare global `localStorage` (identical at runtime to `window.localStorage` in every browser) so its tests can stub `globalThis.localStorage` with a small in-memory `Storage` implementation instead of adding jsdom as a dependency.
- Next.js's experimental `useOffline`/`next/offline` is not used anywhere in this plan (see the spec's section 1 for why).

---

### Task 1: `lib/localMatchStorage.ts` — persistence module + tests

**Files:**
- Create: `lib/localMatchStorage.ts`
- Create: `lib/localMatchStorage.test.ts`

**Interfaces:**
- Produces: `StoredLocalMatch` (type), `saveLocalMatch(matchId: string, snapshot: StoredLocalMatch): void`, `loadLocalMatch(matchId: string): StoredLocalMatch | null`, `clearLocalMatch(matchId: string): void`, `markPendingCompletion(matchId: string, winnerId: string | null): void`, `listPendingCompletions(): { matchId: string; snapshot: StoredLocalMatch }[]` — all consumed by Tasks 2, 3, and 4.

- [x] **Step 1: Write the failing tests**

Create `lib/localMatchStorage.test.ts`:

```ts
// lib/localMatchStorage.test.ts
import { describe, it, expect, beforeEach } from 'vitest';
import {
  saveLocalMatch,
  loadLocalMatch,
  clearLocalMatch,
  markPendingCompletion,
  listPendingCompletions,
  StoredLocalMatch,
} from './localMatchStorage';

/** A minimal in-memory Storage stand-in for Node's test environment (this project's vitest
 *  config uses environment: 'node', and jsdom is not installed) — implements exactly the
 *  Storage methods localMatchStorage.ts calls, nothing more. */
class FakeStorage {
  private store = new Map<string, string>();

  getItem(key: string): string | null {
    return this.store.has(key) ? this.store.get(key)! : null;
  }
  setItem(key: string, value: string): void {
    this.store.set(key, value);
  }
  removeItem(key: string): void {
    this.store.delete(key);
  }
  get length(): number {
    return this.store.size;
  }
  key(index: number): string | null {
    return Array.from(this.store.keys())[index] ?? null;
  }
}

beforeEach(() => {
  (globalThis as unknown as { localStorage: FakeStorage }).localStorage = new FakeStorage();
});

describe('saveLocalMatch / loadLocalMatch / clearLocalMatch', () => {
  it('round-trips a snapshot', () => {
    const snapshot: StoredLocalMatch = { gameId: 'x01', settings: { startingScore: 501 }, gameState: { foo: 1 } };
    saveLocalMatch('m1', snapshot);
    expect(loadLocalMatch('m1')).toEqual(snapshot);
  });

  it('returns null for a match id with no stored snapshot', () => {
    expect(loadLocalMatch('missing')).toBe(null);
  });

  it('clears a stored snapshot', () => {
    saveLocalMatch('m1', { gameId: 'x01', settings: {}, gameState: {} });
    clearLocalMatch('m1');
    expect(loadLocalMatch('m1')).toBe(null);
  });

  it('degrades gracefully when localStorage throws', () => {
    (globalThis as unknown as { localStorage: Storage }).localStorage = {
      getItem: () => {
        throw new Error('quota exceeded');
      },
      setItem: () => {
        throw new Error('quota exceeded');
      },
      removeItem: () => {
        throw new Error('quota exceeded');
      },
      length: 0,
      key: () => null,
      clear: () => {},
    };
    expect(() => saveLocalMatch('m1', { gameId: 'x01', settings: {}, gameState: {} })).not.toThrow();
    expect(loadLocalMatch('m1')).toBe(null);
  });
});

describe('markPendingCompletion / listPendingCompletions', () => {
  it('marks a pending completion on an existing snapshot', () => {
    saveLocalMatch('m1', { gameId: 'x01', settings: {}, gameState: {} });
    markPendingCompletion('m1', 'player1');
    expect(loadLocalMatch('m1')?.pendingCompletion).toEqual({ winnerId: 'player1' });
  });

  it('is a no-op if no snapshot exists for that match id', () => {
    markPendingCompletion('missing', 'player1');
    expect(loadLocalMatch('missing')).toBe(null);
  });

  it('lists only matches with a pending completion, alongside unrelated non-pending ones', () => {
    saveLocalMatch('m1', { gameId: 'x01', settings: {}, gameState: {} });
    saveLocalMatch('m2', { gameId: 'cricket', settings: {}, gameState: {} });
    markPendingCompletion('m2', null);
    const pending = listPendingCompletions();
    expect(pending).toHaveLength(1);
    expect(pending[0].matchId).toBe('m2');
    expect(pending[0].snapshot.pendingCompletion).toEqual({ winnerId: null });
  });
});
```

- [x] **Step 2: Run tests to verify they fail**

Run: `npx vitest run lib/localMatchStorage.test.ts`
Expected: FAIL — `Cannot find module './localMatchStorage'` or similar (the module doesn't exist yet).

- [x] **Step 3: Write the implementation**

Create `lib/localMatchStorage.ts`:

```ts
// lib/localMatchStorage.ts
const KEY_PREFIX = 'oche:local-match:';

export interface StoredLocalMatch {
  gameId: string;
  settings: unknown;
  gameState: unknown;
  pendingCompletion?: { winnerId: string | null } | null;
}

function keyFor(matchId: string): string {
  return `${KEY_PREFIX}${matchId}`;
}

/** Persists a local match's current state. Best-effort: localStorage can throw (private
 *  browsing, quota exceeded, disabled) — local-mode play still works entirely in memory either
 *  way; only offline-reload recovery is lost if this fails. */
export function saveLocalMatch(matchId: string, snapshot: StoredLocalMatch): void {
  try {
    localStorage.setItem(keyFor(matchId), JSON.stringify(snapshot));
  } catch {
    // See doc comment above.
  }
}

export function loadLocalMatch(matchId: string): StoredLocalMatch | null {
  try {
    const raw = localStorage.getItem(keyFor(matchId));
    if (!raw) return null;
    return JSON.parse(raw) as StoredLocalMatch;
  } catch {
    return null;
  }
}

export function clearLocalMatch(matchId: string): void {
  try {
    localStorage.removeItem(keyFor(matchId));
  } catch {
    // Best-effort — see saveLocalMatch.
  }
}

/** Marks an already-stored local match as having a completion sync that needs retrying (e.g.
 *  the completion POST failed because the match finished while offline). A no-op if no snapshot
 *  exists for this match id — there is nothing to retry without the match's final state. */
export function markPendingCompletion(matchId: string, winnerId: string | null): void {
  const existing = loadLocalMatch(matchId);
  if (!existing) return;
  saveLocalMatch(matchId, { ...existing, pendingCompletion: { winnerId } });
}

/** Scans every stored local match for one with a pending completion sync. Used by
 *  PendingSyncManager to retry them on mount and when connectivity returns. */
export function listPendingCompletions(): { matchId: string; snapshot: StoredLocalMatch }[] {
  const results: { matchId: string; snapshot: StoredLocalMatch }[] = [];
  try {
    for (let i = 0; i < localStorage.length; i++) {
      const key = localStorage.key(i);
      if (!key || !key.startsWith(KEY_PREFIX)) continue;
      const raw = localStorage.getItem(key);
      if (!raw) continue;
      try {
        const snapshot = JSON.parse(raw) as StoredLocalMatch;
        if (snapshot.pendingCompletion) {
          results.push({ matchId: key.slice(KEY_PREFIX.length), snapshot });
        }
      } catch {
        continue;
      }
    }
  } catch {
    return [];
  }
  return results;
}
```

- [x] **Step 4: Run tests to verify they pass**

Run: `npx vitest run lib/localMatchStorage.test.ts`
Expected: PASS — 7 tests.

- [x] **Step 5: Commit**

```bash
git add lib/localMatchStorage.ts lib/localMatchStorage.test.ts
git commit -m "feat(offline): lib/localMatchStorage — local-match persistence (pure, tested)"
```

---

### Task 2: Wire `store/match.ts` to persist local-mode state

**Files:**
- Modify: `store/match.ts`

**Interfaces:**
- Consumes: `saveLocalMatch` (Task 1, `@/lib/localMatchStorage`).
- Produces: every local-mode state change (`setMatch`, `applyThrow`, `undo`) now also writes through to `localStorage` — consumed by Task 3's mount-effect reorder.

- [x] **Step 1: Add the import**

At the top of `store/match.ts`, add one import line after the existing ones:

```ts
// store/match.ts
import { create } from 'zustand';
import { GameModule, PlayerId, Throw, Visit } from '@/lib/types';
import { saveLocalMatch } from '@/lib/localMatchStorage';
```

- [x] **Step 2: Persist on `setMatch`**

Change:

```ts
  setMatch: ({
    matchId,
    gameModule,
    gameState,
    settings,
    mode = 'local',
    status = 'live',
    players = [],
    you = null,
    hostId = null,
    roomCode = null,
  }) => set({ matchId, gameModule, gameState, settings, mode, status, players, you, hostId, roomCode }),
```

to:

```ts
  setMatch: ({
    matchId,
    gameModule,
    gameState,
    settings,
    mode = 'local',
    status = 'live',
    players = [],
    you = null,
    hostId = null,
    roomCode = null,
  }) => {
    set({ matchId, gameModule, gameState, settings, mode, status, players, you, hostId, roomCode });
    if (mode === 'local') {
      saveLocalMatch(matchId, { gameId: gameModule.id, settings, gameState });
    }
  },
```

- [x] **Step 3: Persist on `applyThrow`'s local branch**

Change:

```ts
    if (state.mode === 'local') {
      const newGameState = state.gameModule.applyThrow(state.gameState, throw_, state.settings);
      set({ gameState: newGameState });
      return;
    }
```

to:

```ts
    if (state.mode === 'local') {
      const newGameState = state.gameModule.applyThrow(state.gameState, throw_, state.settings);
      set({ gameState: newGameState });
      saveLocalMatch(state.matchId, {
        gameId: state.gameModule.id,
        settings: state.settings,
        gameState: newGameState,
      });
      return;
    }
```

- [x] **Step 4: Persist on `undo`'s local branch**

Change:

```ts
    if (state.mode === 'local') {
      const newGameState = state.gameModule.undo(state.gameState);
      set({ gameState: newGameState });
      return;
    }
```

to:

```ts
    if (state.mode === 'local') {
      const newGameState = state.gameModule.undo(state.gameState);
      set({ gameState: newGameState });
      saveLocalMatch(state.matchId, {
        gameId: state.gameModule.id,
        settings: state.settings,
        gameState: newGameState,
      });
      return;
    }
```

- [x] **Step 5: Verify types**

Run: `npx tsc --noEmit`
Expected: clean, no errors.

- [x] **Step 6: Manual verification**

No automated tests exist for `store/match.ts` anywhere in this project (a Zustand store; verification for it has always been manual/integration-level). Run `npm run dev`, start a local match, throw a few darts, and confirm in Chrome DevTools → Application → Local Storage that a key named `oche:local-match:<the match id>` now exists and its JSON value's `gameState` updates after each throw and after Undo.

- [x] **Step 7: Commit**

```bash
git add store/match.ts
git commit -m "feat(offline): persist local-mode match state to localStorage"
```

---

### Task 3: Match page — check localStorage before the network fetch

**Files:**
- Modify: `app/(match)/match/[id]/page.tsx`

**Interfaces:**
- Consumes: `loadLocalMatch` (Task 1, `@/lib/localMatchStorage`).
- Produces: a local match with a stored snapshot now hydrates with zero network calls, online or offline — the core deliverable of this whole plan.

- [x] **Step 1: Add the import**

At the top of the file, alongside the existing imports (currently ending with `import { identityIdOf, MatchPlayerDoc } from '@/lib/matchLobby';`), add:

```ts
import { loadLocalMatch } from '@/lib/localMatchStorage';
```

- [x] **Step 2: Reorder the mount effect**

The current mount effect (inside `useEffect(() => { const init = async () => { ... }; init(); }, [id]);`) reads:

```ts
    const init = async () => {
      try {
        const res = await fetch(`/api/matches/${id}`);
        if (!res.ok) {
          setError('Match not found');
          setLoading(false);
          return;
        }
        const snapshot = await res.json();
        const module = await getGameModule(snapshot.gameId as GameId);

        if (snapshot.mode === 'remote') {
          useMatchStore.getState().setMatch({
            matchId: id,
            gameModule: module,
            gameState: snapshot.state,
            settings: snapshot.settings ?? module.defaultSettings,
            mode: 'remote',
            status: snapshot.status,
            players: snapshot.players,
            you: snapshot.you,
            hostId: snapshot.hostId,
            roomCode: snapshot.roomCode,
          });
        } else {
          const settings = snapshot.settings ?? module.defaultSettings;
          const initialState = module.init([createPlayerId('player1'), createPlayerId('player2')], settings);
          useMatchStore.getState().setMatch({
            matchId: id,
            gameModule: module,
            gameState: initialState,
            settings,
            mode: 'local',
            status: 'live',
          });
        }
        setLoading(false);
      } catch {
        setError('Unable to load this match');
        setLoading(false);
      }
    };
```

Replace it with (adding a localStorage-first branch before the existing fetch logic):

```ts
    const init = async () => {
      const stored = loadLocalMatch(id);
      if (stored) {
        try {
          const module = await getGameModule(stored.gameId as GameId);
          useMatchStore.getState().setMatch({
            matchId: id,
            gameModule: module,
            gameState: stored.gameState,
            settings: stored.settings,
            mode: 'local',
            status: 'live',
          });
          setLoading(false);
          return;
        } catch {
          // Fall through to the network path below — e.g. a stored gameId that no longer
          // resolves to a registered game module. Don't strand the user on a broken
          // localStorage entry when the server might still have a valid one.
        }
      }

      try {
        const res = await fetch(`/api/matches/${id}`);
        if (!res.ok) {
          setError('Match not found');
          setLoading(false);
          return;
        }
        const snapshot = await res.json();
        const module = await getGameModule(snapshot.gameId as GameId);

        if (snapshot.mode === 'remote') {
          useMatchStore.getState().setMatch({
            matchId: id,
            gameModule: module,
            gameState: snapshot.state,
            settings: snapshot.settings ?? module.defaultSettings,
            mode: 'remote',
            status: snapshot.status,
            players: snapshot.players,
            you: snapshot.you,
            hostId: snapshot.hostId,
            roomCode: snapshot.roomCode,
          });
        } else {
          const settings = snapshot.settings ?? module.defaultSettings;
          const initialState = module.init([createPlayerId('player1'), createPlayerId('player2')], settings);
          useMatchStore.getState().setMatch({
            matchId: id,
            gameModule: module,
            gameState: initialState,
            settings,
            mode: 'local',
            status: 'live',
          });
        }
        setLoading(false);
      } catch {
        setError('Unable to load this match');
        setLoading(false);
      }
    };
```

- [x] **Step 3: Verify types**

Run: `npx tsc --noEmit`
Expected: clean, no errors.

- [x] **Step 4: Manual verification**

Run `npm run dev`. Start a local match, throw a few darts (leaving it mid-leg), then reload the page. Confirm the match resumes exactly where it left off (same leg, same darts-so-far) rather than restarting from a fresh `init()` — this is the core "don't lose a reload" behavior, testable online first before Task 5 adds true offline-shell loading.

- [x] **Step 5: Commit**

```bash
git add "app/(match)/match/[id]/page.tsx"
git commit -m "feat(offline): match page prefers localStorage over the network fetch for local mode"
```

---

### Task 4: Completion retry — mark/clear pending sync + `PendingSyncManager`

**Files:**
- Modify: `app/(match)/match/[id]/page.tsx` (the completion-POST effect)
- Create: `components/PendingSyncManager.tsx`
- Modify: `app/layout.tsx` (mount the new component)

**Interfaces:**
- Consumes: `clearLocalMatch`, `markPendingCompletion`, `listPendingCompletions` (Task 1, `@/lib/localMatchStorage`).
- Produces: a local match whose completion POST fails is retried automatically on next app load or when connectivity returns — closes the aggregate-stats plan's already-documented "unrecoverable failed completion" gap.

- [x] **Step 1: Add the import to the match page**

Add to the match page's existing imports:

```ts
import { loadLocalMatch, clearLocalMatch, markPendingCompletion } from '@/lib/localMatchStorage';
```

(This replaces the `loadLocalMatch`-only import line added in Task 3 — one combined import line for all three functions this file now uses.)

- [x] **Step 2: Extend the completion effect**

Change:

```ts
  useEffect(() => {
    if (mode !== 'local' || !gameModule || !gameState) return;
    if (!gameModule.isComplete(gameState)) return;
    if (completionSentRef.current) return;
    completionSentRef.current = true;

    fetch(`/api/matches/${id}/complete`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ state: gameState, winnerId: gameModule.winner(gameState) }),
    }).catch(() => {
      // Best-effort, matching how this project treats non-critical side effects
      // (e.g. publishMatchEvent): a failed write means this match won't show up in
      // history, not a broken match.
    });
  }, [mode, gameModule, gameState, id]);
```

to:

```ts
  useEffect(() => {
    if (mode !== 'local' || !gameModule || !gameState) return;
    if (!gameModule.isComplete(gameState)) return;
    if (completionSentRef.current) return;
    completionSentRef.current = true;

    const winnerId = gameModule.winner(gameState);
    fetch(`/api/matches/${id}/complete`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ state: gameState, winnerId }),
    })
      .then((res) => {
        if (res.ok) {
          clearLocalMatch(id);
        } else {
          markPendingCompletion(id, winnerId);
        }
      })
      .catch(() => {
        // Offline (or some other network failure) at the moment of completion — mark it for
        // PendingSyncManager to retry later instead of silently losing the sync forever.
        markPendingCompletion(id, winnerId);
      });
  }, [mode, gameModule, gameState, id]);
```

- [x] **Step 3: Create the retry manager component**

Create `components/PendingSyncManager.tsx`:

```tsx
// components/PendingSyncManager.tsx
'use client';
import { useEffect } from 'react';
import { listPendingCompletions, clearLocalMatch } from '@/lib/localMatchStorage';

/** Retries any local match completions that failed to sync (e.g. the match finished while
 *  offline) — on mount and whenever the browser regains connectivity. Renders nothing; this is
 *  a side-effect-only component, following the same pattern as PwaRegistration.tsx. */
export function PendingSyncManager() {
  useEffect(() => {
    const retryPending = () => {
      for (const { matchId, snapshot } of listPendingCompletions()) {
        fetch(`/api/matches/${matchId}/complete`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            state: snapshot.gameState,
            winnerId: snapshot.pendingCompletion?.winnerId ?? null,
          }),
        })
          .then((res) => {
            if (res.ok) clearLocalMatch(matchId);
          })
          .catch(() => {
            // Still offline or still failing — leave it marked pending, try again next time.
          });
      }
    };

    retryPending();
    window.addEventListener('online', retryPending);
    return () => window.removeEventListener('online', retryPending);
  }, []);

  return null;
}
```

- [x] **Step 4: Mount it in the root layout**

In `app/layout.tsx`, add the import and mount it alongside the existing `PwaRegistration`:

```tsx
import type { Metadata } from "next";
import { Bricolage_Grotesque, Inter_Tight } from "next/font/google";
import { SessionProvider } from "next-auth/react";
import { PwaRegistration } from "@/components/PwaRegistration";
import { PendingSyncManager } from "@/components/PendingSyncManager";
import "./globals.css";
```

And change:

```tsx
      <body className="min-h-full flex flex-col">
        <PwaRegistration />
        <SessionProvider>{children}</SessionProvider>
      </body>
```

to:

```tsx
      <body className="min-h-full flex flex-col">
        <PwaRegistration />
        <PendingSyncManager />
        <SessionProvider>{children}</SessionProvider>
      </body>
```

- [x] **Step 5: Verify types**

Run: `npx tsc --noEmit`
Expected: clean, no errors.

- [x] **Step 6: Manual verification**

Run `npm run dev`. Start a local match with a short leg count, open Chrome DevTools → Network → set to **Offline**, finish the match (throw the winning dart). Confirm in DevTools → Application → Local Storage that `oche:local-match:<id>`'s JSON now has a `pendingCompletion` field set. Switch DevTools back to **Online**, wait a moment (or reload the page, which re-mounts `PendingSyncManager`), and confirm the localStorage entry for that match is gone (synced) — then check `/stats` shows that match in the history list.

- [x] **Step 7: Commit**

```bash
git add "app/(match)/match/[id]/page.tsx" components/PendingSyncManager.tsx app/layout.tsx
git commit -m "feat(offline): retry failed local-match completion syncs (PendingSyncManager)"
```

---

### Task 5: Real service worker runtime cache

**Files:**
- Modify: `public/sw.js`

**Interfaces:** None — this task has no TypeScript interface; it's a standalone browser-loaded script with no imports/exports.

- [x] **Step 1: Replace the no-op service worker with a runtime cache**

The current file:

```js
// A minimal, intentionally no-op service worker. Its only job is to exist and be registered —
// Android/Chrome's installability heuristics look for an active service worker even when there's
// nothing to cache. It does not intercept fetches or cache anything; that's a separate, later
// "Offline" sub-project's job, which needs its own design given this app's real-time,
// server-authoritative architecture (match state is never meaningfully available offline the way
// a static page would be).
self.addEventListener('install', () => self.skipWaiting());
self.addEventListener('activate', (event) => event.waitUntil(self.clients.claim()));
```

Replace it entirely with:

```js
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
```

- [x] **Step 2: Manual verification**

Service workers behave most predictably against a production build, so run `npm run build && npm start` (not `npm run dev`). Open the app in Chrome, sign in, start and play a local match (this visits `/match/<id>` at least once while online, so the service worker caches its shell). In DevTools → Application → Service Workers, confirm a worker is active and `oche-runtime-v1` appears under Application → Cache Storage with entries. Set DevTools → Network → **Offline**, then fully reload that same match URL (a hard refresh). Confirm the page still renders (the cached shell loads) rather than showing the browser's own offline error page — the match's actual game state then resumes via Task 3's localStorage-first hydration once the JS runs.

- [x] **Step 3: Commit**

```bash
git add public/sw.js
git commit -m "feat(offline): real runtime cache in the service worker (network-first, cache fallback)"
```

---

### Task 6: Offline indicator banner

**Files:**
- Create: `components/OfflineBanner.tsx`
- Modify: `app/layout.tsx`

**Interfaces:** None consumed from earlier tasks; this is a self-contained UI component using only browser APIs (`navigator.onLine`, `window`'s `online`/`offline` events).

- [x] **Step 1: Create the banner**

Create `components/OfflineBanner.tsx`:

```tsx
// components/OfflineBanner.tsx
'use client';
import { useEffect, useState } from 'react';

/** A small banner shown whenever the browser reports no network connection. Local matches keep
 *  working regardless (see lib/localMatchStorage.ts and the match page's mount effect) — this is
 *  purely informational. */
export function OfflineBanner() {
  const [isOffline, setIsOffline] = useState(false);

  useEffect(() => {
    setIsOffline(!navigator.onLine);
    const goOffline = () => setIsOffline(true);
    const goOnline = () => setIsOffline(false);
    window.addEventListener('offline', goOffline);
    window.addEventListener('online', goOnline);
    return () => {
      window.removeEventListener('offline', goOffline);
      window.removeEventListener('online', goOnline);
    };
  }, []);

  if (!isOffline) return null;

  return (
    <div
      role="status"
      className="fixed top-0 inset-x-0 z-50 bg-wire text-oche text-center text-xs font-bold uppercase tracking-widest py-1.5"
    >
      You&apos;re offline — local matches keep working
    </div>
  );
}
```

- [x] **Step 2: Mount it in the root layout**

In `app/layout.tsx`, add the import and mount it alongside the other two side-effect/utility components:

```tsx
import { PwaRegistration } from "@/components/PwaRegistration";
import { PendingSyncManager } from "@/components/PendingSyncManager";
import { OfflineBanner } from "@/components/OfflineBanner";
import "./globals.css";
```

```tsx
      <body className="min-h-full flex flex-col">
        <PwaRegistration />
        <PendingSyncManager />
        <OfflineBanner />
        <SessionProvider>{children}</SessionProvider>
      </body>
```

- [x] **Step 3: Verify types**

Run: `npx tsc --noEmit`
Expected: clean, no errors.

- [x] **Step 4: Manual verification**

Run `npm run dev`, open the app, toggle Chrome DevTools → Network → **Offline**. Confirm the banner appears at the top of the screen. Toggle back to **Online** and confirm it disappears.

- [x] **Step 5: Commit**

```bash
git add components/OfflineBanner.tsx app/layout.tsx
git commit -m "feat(offline): offline indicator banner"
```

---

### Task 7: Integration verification

No code changes — this task verifies the whole feature works end-to-end, the same way the Copycat and aggregate-stats plans closed out.

**Files:** none.

- [x] **Step 1: Final regression check**

Run: `npx tsc --noEmit && npx vitest run`
Expected: clean, all tests passing — the existing suite plus the 7 new `lib/localMatchStorage.test.ts` tests from Task 1, no other count change.

- [x] **Step 2: The end-to-end scenario with no automated substitute**

This is the one thing genuinely worth a live pass beyond what Tasks 2–6 already manually verified in isolation: the full "close the app, go offline, reopen, resume" flow, combining Task 3 (localStorage-first hydration) and Task 5 (service worker shell caching) together.

Run `npm run build && npm start`. In Chrome: sign in, start a local match, throw a few darts. Set DevTools → Network → **Offline**. Fully close the tab. Reopen it (paste the same `/match/<id>` URL, or use the PWA if installed) while still offline. Confirm: the app shell loads (from the service worker's cache) and the match resumes exactly where it was left (from localStorage) — not a blank error page, not a fresh restart.

- [x] **Step 3: Report**

No commit for this task — verification only. Summarize what was verified and any acknowledged gaps (e.g. if a true full-device-restart test wasn't feasible in the environment, note that explicitly rather than skipping it silently, consistent with this project's established convention from the Copycat and aggregate-stats plans).
