# M3: Remote Play Design

**Date:** 2026-09-02
**Status:** Approved for implementation
**Parent spec:** [2026-09-01-oche-mvp-architecture.md](2026-09-01-oche-mvp-architecture.md) (section 8, M3)

## 1. Scope

M3 adds remote play: two players on separate devices join the same match via a room-code link, then play it out with the server as the single source of truth, syncing over Ably. This is the first milestone that requires real Mongo persistence of match state and per-visit Visit records — until now, everything lived only in the client's Zustand store.

**In scope:**
- A `guestId` identity primitive (cookie-based), reused for account users via session
- Room-code lobby: create, join, seat, start
- Server-authoritative throw submission, undo, and turn enforcement
- Ably-based live sync between the two seated clients
- Reconnection: a client that reloads or drops connection can always resume from persisted state
- Visit persistence, scoped to remote matches only

**Out of scope (deferred to later milestones or explicitly not needed for MVP):**
- Optimistic local UI prediction before server confirmation (M5–M7 polish candidate)
- Spectators/observers
- Account-claiming of guest-played matches (parent spec §5, separate future work)
- Cricket or any non-X01 module in remote mode (M4 adds Cricket; M3's sync layer is game-agnostic via `GameModule`, so this is a non-event once M4 lands)
- Abandoned-match cleanup/timeouts (an unfilled lobby or a match both players walk away from just sits there)
- Rate-limiting/anti-abuse on the throws endpoint
- Local-match persistence (local play remains pure client-side Zustand state, exactly as M1/M2 built it — zero risk to the already-shipped local flow)

## 2. Architecture Overview

The pure `GameModule<TState, TSettings>` engine (already built for X01, already used unmodified by local play) is reused as-is by the server. Remote play adds a sync layer around it; the engine itself needs no changes.

```
Player A's device                    Player B's device
   DartboardInput                       DartboardInput
        │ (their turn only)                  │ (their turn only)
        ▼                                     ▼
  POST /api/matches/:id/throws        POST /api/matches/:id/throws
        │                                     │
        └──────────────┬──────────────────────┘
                        ▼
              API route (server)
       1. load Match from Mongo
       2. verify requester === seat whose turn it is
       3. gameModule.applyThrow(state, throw, settings)  ← same pure fn as local
       4. persist new Match.state + new Visit row
       5. ably.channels.get(`match:${id}`).publish('state', newState)
                        │
                        ▼
              Ably channel (push only)
                 /              \
        Client A subscribes    Client B subscribes
        → setGameState(newState)   → setGameState(newState)
```

Local play (`mode: 'local'`) is untouched: `useMatchStore.applyThrow` still calls `gameModule.applyThrow` directly on the client, no network round-trip. Remote play (`mode: 'remote'`) is a new, additive path. Both converge on the same `GameModule` contract and the same UI components (`DartboardInput`, `HistoryPanel`, `PostMatchStats`, `ScoreboardSlot`) — those components don't know or care which mode produced the state they're rendering.

## 3. Player Identity

Neither local nor remote play has real player identity today — local matches hardcode `'player1'`/`'player2'` string ids. Remote play needs genuine per-device identity so the server can authorize "is this really the seat whose turn it is."

New: `lib/identity.ts`

```ts
export interface Identity {
  type: 'user' | 'guest';
  id: string; // session user id, or the guestId cookie value
}

export async function getIdentity(req: NextRequest, res: NextResponse): Promise<Identity>
```

Behavior:
1. If a NextAuth session exists, return `{ type: 'user', id: session.user.id }`.
2. Otherwise, read the `oche_guest_id` cookie. If present, return `{ type: 'guest', id: cookieValue }`.
3. Otherwise, generate a new random id (`crypto.randomUUID()`), set it on the response as a long-lived (1 year), `httpOnly: false` (so client-side code can also read it if ever needed), `sameSite: 'lax'` cookie named `oche_guest_id`, and return `{ type: 'guest', id: newId }`.

This is the identity used for `hostId`, each `players[]` entry, and to authorize every remote-match write (join, start, throw, undo). It intentionally does not build the account-claiming flow described in the parent spec's §5 — that remains future work.

## 4. Lobby Flow

1. **Create.** Dashboard gets a "Play Remote" button next to today's "New Match." `POST /api/matches` (existing route) is extended to accept `mode: 'local' | 'remote'`. For `'remote'`:
   - Resolve identity via `getIdentity`.
   - Generate a 6-character room code (uppercase, excluding ambiguous characters `0/O/1/I`) — `nanoid` with a custom alphabet is fine.
   - Retry generation on collision against any existing match with that code whose `status` is `'lobby'` or `'live'` (codes are free to reuse once a match completes — no need for a global unique index).
   - Create `Match{ gameId, mode: 'remote', status: 'lobby', roomCode, hostId: identity.id, players: [seatFor(identity, session, seat: 0)] }`, where `seatFor` maps an `Identity` to the existing `players[]` sub-schema: `{ userId: identity.type === 'user' ? identity.id : undefined, guestId: identity.type === 'guest' ? identity.id : undefined, name: session?.user?.name ?? 'Guest', seat, isGuest: identity.type === 'guest' }` (same name fallback the existing local-match creation route already uses).
   - Redirect the host to `/match/:id`.
2. **Lobby view.** The match page renders a new `MatchLobby` component whenever `status === 'lobby'`, showing: the room code, a shareable `/join/:code` link, and the seated player(s). It subscribes to the match's Ably channel (see §6) for a `'lobby'` event to live-update when the second player joins — no polling needed.
3. **Join.** `POST /api/matches/join/:code` (new route):
   - Resolve identity.
   - Look up the match by `roomCode` with `status: 'lobby'`. 404 if not found; 409 if already full (2 players seated) or the requester is already seated (re-joining the same tab is a no-op, just return the existing match id).
   - Add the joining identity as `players[1]` via the same `seatFor(identity, session, seat: 1)` mapping used at creation.
   - Publish a `'lobby'` event with the updated `players` array on `match:${id}`.
   - Return `{ id }`; the client (a page at `/join/[code]`, new) redirects to `/match/:id`.
4. **Start.** Once both seats are filled, the lobby view shows a "Start Match" button to the host only. `POST /api/matches/:id/start` (new route):
   - Verify requester is the host, `status === 'lobby'`, and exactly 2 players are seated (400 otherwise).
   - Call `gameModule.init(playerIds, gameModule.defaultSettings)`, where `playerIds = players.map(p => createPlayerId(p.userId ?? p.guestId))` — using the seated identities' own ids as the engine's `PlayerId`s (rather than local play's hardcoded `'player1'`/`'player2'`) is what lets `gameModule.currentPlayer(state)` be compared directly against a request's identity in §5, with no separate seat-index lookup. Settings customization isn't built for any mode yet (local play has the same limitation today); introducing it is out of scope for M3.
   - Persist `state`, set `status: 'live'`, `startedAt: new Date()`.
   - Publish a `'state'` event with the new state on `match:${id}`.

## 5. Live Play: Throws & Undo

**`POST /api/matches/:id/throws`** (new route), body `{ throw: Throw }`:
1. Resolve identity; load the match. 404 if missing, 409 if `status !== 'live'`.
2. Verify `identity.id === gameModule.currentPlayer(match.state)` — reject with 403 if it's not their turn. (This direct comparison works because `players` were seeded with the seated identities' own ids as `PlayerId`s at start time, per §4.) This is the enforcement point for the earlier decision that only the on-throw player can submit their own darts.
3. `const newState = gameModule.applyThrow(match.state, throw_, match.settings)` — the same pure function local play calls directly.
4. Persist `Match.state = newState` (every throw, including darts mid-visit — this alone is what makes reconnection mid-visit lossless; see §7).
5. A `Visit` row represents one completed turn (`{ throws: Throw[], scoreBefore, scoreAfter, busted, isCheckout }`), matching the parent spec's Visit Log Data Model and the engine's own `visitHistory` — not one row per dart. So: if this throw caused `newState.visitHistory` to gain a new entry (i.e. the visit just completed — third dart, a bust, or an early checkout), insert one `Visit` row mirroring that newest `visitHistory` entry. A throw that's merely the 1st or 2nd dart of an in-progress visit writes no `Visit` row (its data still lives in `Match.state.currentVisit`, already persisted in step 4).
6. If `gameModule.isComplete(newState)`: also set `status: 'complete'`, `winnerId: gameModule.winner(newState)`, `completedAt: new Date()`.
7. Publish a `'state'` event with `{ state: newState, status }` on `match:${id}`.

**`POST /api/matches/:id/undo`** (new route):
- Verify requester is one of the two seated players (either can undo, per the approved design — no per-throw ownership check) and `status === 'live'`.
- `const newState = gameModule.undo(match.state)`, persist.
- `gameModule.undo` removes the last completed visit (or clears an in-progress one). If it removed a completed visit — i.e. `match.state.visitHistory` was longer than `newState.visitHistory` — delete the most recently inserted `Visit` row for this match so persisted history stays consistent with in-memory state. If undo only cleared an in-progress visit's darts (no `visitHistory` entry existed for it), there is no `Visit` row to delete.
- Publish `'state'`.

**Failed throws (client-side):** if the POST fails for any reason (network error, 403 stale-turn, 409 stale-status), the client shows an inline error near `DartboardInput` ("Couldn't send that throw — try again") and leaves the input active for the player to retry the same dart. No silent retry, no silent drop.

## 6. Sync Transport (Ably)

- One channel per match: `match:${matchId}`.
- Two event types: `'lobby'` (payload: updated `players` array) and `'state'` (payload: `{ state, status }`, and on completion also `winnerId`).
- **Auth:** `GET /api/ably/token` (new route) issues a token request scoped to `match:${matchId}` capabilities, but only after verifying (via identity) that the requester is actually one of the match's seated players — a client can't subscribe to a match it's not part of.
- **Publishing the full state** (not just a change notification) keeps clients simple: on receipt, a client just calls `setGameState(payload.state)` and doesn't need a follow-up fetch. X01 state is small JSON, well within Ably's per-message payload limits.
- **Reconnection safety net:** when the Ably client's connection transitions from a disconnected state back to `'connected'`, the client re-fetches `GET /api/matches/:id` once (see §7) to cover any messages published while it was offline, rather than relying on Ably's own history/recovery features.

## 7. Client Integration

`GET /api/matches/:id` (existing route) is extended to return the full resumable snapshot: `{ gameId, mode, status, state, settings, players, roomCode, you }` (previously only `{ gameId, status }`), where `you` is the requester's own `PlayerId` — computed server-side via `getIdentity` the same way `/throws` does — so the client never needs to parse its own cookie to know "which seat am I."

**Zustand store (`store/match.ts`):**
- New fields: `mode: 'local' | 'remote'`, `you: PlayerId | null` (the requester's own identity, for remote matches only).
- `setMatch(...)` extended to also accept `mode`, `status`, `players` (for the lobby view), and `you`.
- `applyThrow(throw_)`:
  - `mode === 'local'`: unchanged — calls `gameModule.applyThrow` directly.
  - `mode === 'remote'`: POSTs to `/api/matches/:id/throws`. Does not mutate `gameState` itself — the store only updates when the Ably `'state'` event arrives (no optimistic prediction this milestone, per §1).
- `undo()`: same local/remote branch, remote POSTs to `/api/matches/:id/undo`.
- New: `useRemoteMatchSync(matchId)` hook — on mount, fetches an Ably token, subscribes to `match:${matchId}`, and dispatches `'lobby'`/`'state'` events into the store; on reconnect, re-fetches `GET /api/matches/:id` (per §6); detaches the subscription on unmount.

**Match page (`app/(match)/match/[id]/page.tsx`):**
- On mount: fetch `GET /api/matches/:id`. If `mode === 'remote'`, always hydrate from the returned `state`/`status` (never re-`init`, since state is persisted — this is what makes a page refresh resume correctly). If `mode === 'local'`, behavior is unchanged (fresh `module.init(...)` on every mount, as today — local matches were never meant to survive a refresh, and fixing that is out of scope here).
- If `mode === 'remote'`, also call `useRemoteMatchSync(id)`.
- Render branches on `status`: `'lobby'` → `<MatchLobby>` (new component: room code, share link, seated players, host-only Start button); `'live'` → the existing scoreboard/history/board UI, unchanged, except in remote mode `DartboardInput`'s `disabled` prop is also `true` whenever `gameModule.currentPlayer(gameState) !== you` (the store's `you` field, from §6/§7's `GET` snapshot) — the server enforces this regardless (§5); this is purely to avoid a pointless rejected request and give instant feedback; `'complete'` → the existing `PostMatchStats`, unchanged.

**GameModule / X01 engine:** no changes. `applyThrow`, `undo`, `isComplete`, `winner`, and every accessor (`visitHistory`, `heatmap`, `matchStats`, etc.) operate purely on `TState` and have no notion of how that state arrived.

## 8. Testing

- No changes to the existing X01 engine test suite (40 tests) or `matchStats` tests (4 tests) — the engine is untouched.
- New integration-level tests around the API routes: turn enforcement (rejecting a throw from the wrong seat), undo permission (either seated player, rejected for non-participants), room-code join edge cases (already full, already seated, unknown code), and the identity helper (session vs. cookie vs. fresh-cookie-issued paths).
- Ably itself is not unit-tested (thin pub/sub transport); the sync loop gets a manual two-browser-session live-verification pass, consistent with how UI-facing work has been verified throughout this project.

## 9. Summary

M3 turns on remote play without touching the pure engine or the M1/M2 UI components local play already built and validated — it adds an identity primitive, a room-code lobby, three new API routes (join/start/throws, plus undo) that reuse `gameModule.applyThrow`/`undo` server-side, and an Ably sync layer that keeps two clients' Zustand stores in agreement. Local play's code path is untouched; remote play converges on the exact same `GameModule` contract and UI, one layer up.
