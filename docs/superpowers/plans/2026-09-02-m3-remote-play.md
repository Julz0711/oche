# M3: Remote Play Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Two players on separate devices can create/join a remote match via a room-code link, play it out with the server as the source of truth, and stay in sync over Ably.

**Architecture:** A new identity primitive (`guestId` cookie or session), a room-code lobby, and four new server-authoritative API routes (join/start/throws/undo) that call the existing pure `GameModule` engine server-side, persist the result to Mongo, and broadcast it over one Ably channel per match. Clients subscribe and re-render — no client ever computes remote match state itself. Local play's code path is completely untouched.

**Tech Stack:** Next.js 16 App Router route handlers, Mongoose, Ably (`ably` npm package, server `Rest` client + browser `Realtime` client), Zustand, Vitest.

**Spec:** [docs/superpowers/specs/2026-09-02-m3-remote-play-design.md](../specs/2026-09-02-m3-remote-play-design.md) (read this too — it has the full rationale for each design decision; this plan implements it task-by-task).

## Global Constraints

- Local play (`mode: 'local'`) must not change behavior at all. Every existing test must stay green (44 tests as of this plan: 40 in `lib/games/x01/engine.test.ts`, 4 in `lib/games/x01/matchStats.test.ts`).
- The pure X01 engine (`lib/games/x01/engine.ts`) is not modified. The only interface change is one new additive `GameModule` accessor, `lastCompletedVisit` (Task 1) — no existing accessor's behavior changes.
- Server-side route handlers only ever call `GameModule` methods generically (via `getGameModule`/the `GameModule<any,any>` interface) — never reach into X01-specific state shape (`X01State` fields) directly. This is what keeps the sync layer game-agnostic for M4's Cricket module.
- Business/decision logic (identity resolution, room codes, lobby seating rules, turn/visit detection) is written as small pure functions with their own unit tests; route handlers stay thin glue (Mongo read → pure-function decision → Mongo write → Ably publish) and are verified via manual live two-browser testing rather than HTTP-level integration tests, matching the spec's own testing section (§8) and this project's existing "pure engine + thin UI" philosophy. No new test-infra dependency (e.g. `mongodb-memory-server`) is introduced for this milestone.
- Guest identity cookie name: `oche_guest_id`. Room codes: 6 characters, alphabet `ABCDEFGHJKLMNPQRSTUVWXYZ23456789` (excludes ambiguous `0/O/1/I`).
- Ably: server uses a `Rest` client with a private `ABLY_API_KEY` env var (server-only, never sent to the browser); the browser only ever holds a short-lived token obtained from our own `/api/ably/token` route (never a raw Ably API key client-side). Channel naming: `match:${matchId}`. Event names: `'lobby'` and `'state'`.
- Settings customization is out of scope (local play doesn't have it either) — remote matches always use `gameModule.defaultSettings`.

---

### Task 1: `lastCompletedVisit` GameModule accessor

**Files:**
- Modify: `lib/types.ts` (add one method to the `GameModule` interface)
- Modify: `lib/games/x01/index.ts` (implement it, wire into the exported module object)
- Create: `lib/games/x01/index.test.ts`

**Interfaces:**
- Produces: `GameModule<TState, TSettings>.lastCompletedVisit(state: TState, playerId: PlayerId): { throws: Throw[]; scoreBefore: number; scoreAfter: number; busted: boolean; isCheckout: boolean } | null` — later consumed by Task 8 (throws route).

- [ ] **Step 1: Add the method to the `GameModule` interface**

In `lib/types.ts`, inside the `GameModule<TState, TSettings>` interface, immediately after the existing `heatmap` method, add:

```ts
  /**
   * The single most recently completed visit for a player, regardless of which leg it belonged
   * to (unlike `visitHistory`, which is scoped to the current leg for UI display). Returns null
   * if the player has no completed visits yet in this match. Exists for remote-play's
   * server-side Visit persistence, which needs a leg-boundary-safe read even when the completed
   * visit also ended a leg.
   */
  lastCompletedVisit: (
    state: TState,
    playerId: PlayerId
  ) => { throws: Throw[]; scoreBefore: number; scoreAfter: number; busted: boolean; isCheckout: boolean } | null;
```

- [ ] **Step 2: Write the failing test**

Create `lib/games/x01/index.test.ts`:

```ts
// lib/games/x01/index.test.ts
import { describe, it, expect } from 'vitest';
import X01Module from './index';
import { createPlayerId } from '@/lib/types';
import { X01DefaultSettings } from './schema';

describe('X01Module.lastCompletedVisit', () => {
  const player1 = createPlayerId('p1');
  const player2 = createPlayerId('p2');

  it('returns null when the player has no completed visits yet', () => {
    const state = X01Module.init([player1, player2], X01DefaultSettings);
    expect(X01Module.lastCompletedVisit(state, player1)).toBe(null);
  });

  it('returns a normal in-leg visit', () => {
    let state = X01Module.init([player1, player2], X01DefaultSettings);
    const dart = { sector: 20 as const, ring: 'T' as const, points: 60, order: 0 as const };
    state = X01Module.applyThrow(state, dart, X01DefaultSettings);
    state = X01Module.applyThrow(state, dart, X01DefaultSettings);
    state = X01Module.applyThrow(state, dart, X01DefaultSettings); // 3rd dart commits the visit

    const visit = X01Module.lastCompletedVisit(state, player1);
    expect(visit).not.toBe(null);
    expect(visit!.throws).toHaveLength(3);
    expect(visit!.scoreBefore).toBe(501);
    expect(visit!.scoreAfter).toBe(501 - 180);
    expect(visit!.busted).toBe(false);
    expect(visit!.isCheckout).toBe(false);
  });

  it('still returns a visit that ended a leg, even though visitHistory no longer does', () => {
    let state = X01Module.init([player1, player2], X01DefaultSettings); // firstTo: 3, so leg 1 ending doesn't end the match
    state.playerScores[player1] = 40;
    const finishDart = { sector: 20 as const, ring: 'D' as const, points: 40, order: 0 as const };
    state = X01Module.applyThrow(state, finishDart, X01DefaultSettings);

    expect(state.currentLegNumber).toBe(2); // leg advanced as part of this same throw
    expect(X01Module.visitHistory(state, player1)).toHaveLength(0); // filtered out — this is the bug this accessor fixes

    const visit = X01Module.lastCompletedVisit(state, player1);
    expect(visit).not.toBe(null);
    expect(visit!.scoreBefore).toBe(40);
    expect(visit!.scoreAfter).toBe(0);
    expect(visit!.isCheckout).toBe(true);
  });
});
```

- [ ] **Step 3: Run the test to verify it fails**

Run: `npx vitest run lib/games/x01/index.test.ts`
Expected: FAIL — `X01Module.lastCompletedVisit is not a function`.

- [ ] **Step 4: Implement it in `lib/games/x01/index.ts`**

Add this const near the other accessors (after `heatmap`, before the `X01Module` object literal):

```ts
const lastCompletedVisit = (
  state: X01State,
  playerId: PlayerId
): { throws: Throw[]; scoreBefore: number; scoreAfter: number; busted: boolean; isCheckout: boolean } | null => {
  const entries = state.visitHistory.filter((entry) => entry.playerId === playerId);
  if (entries.length === 0) return null;
  const latest = entries[entries.length - 1];
  return {
    throws: latest.throws,
    scoreBefore: latest.scoreBefore,
    scoreAfter: latest.scoreAfter,
    busted: latest.busted,
    isCheckout: latest.wasCheckout,
  };
};
```

Then add `lastCompletedVisit,` to the `X01Module` object literal, right after `heatmap,`.

- [ ] **Step 5: Run the test to verify it passes**

Run: `npx vitest run lib/games/x01/index.test.ts`
Expected: PASS (3 tests).

- [ ] **Step 6: Run the full suite and typecheck**

Run: `npx tsc --noEmit && npx vitest run`
Expected: tsc clean; 47/47 tests passing (44 existing + 3 new).

- [ ] **Step 7: Commit**

```bash
git add lib/types.ts lib/games/x01/index.ts lib/games/x01/index.test.ts
git commit -m "feat(x01): add lastCompletedVisit accessor for leg-boundary-safe visit reads"
```

---

### Task 2: Identity primitive & room code generator

**Files:**
- Create: `lib/identity.ts`
- Create: `lib/identity.test.ts`
- Create: `lib/roomCode.ts`
- Create: `lib/roomCode.test.ts`

**Interfaces:**
- Consumes: `auth()` from `@/lib/auth` (existing NextAuth helper, returns `Promise<Session | null>`, `session.user.id` is a string).
- Produces: `Identity { type: 'user' | 'guest'; id: string }`, `resolveIdentity(sessionUserId?, existingGuestCookie?): { identity: Identity; newGuestCookie?: string }`, `getIdentity(req: NextRequest): Promise<{ identity: Identity; newGuestCookie?: string }>`, `applyIdentityCookie(response: NextResponse, newGuestCookie?: string): NextResponse`, `GUEST_COOKIE_NAME = 'oche_guest_id'` — all consumed by every route task from Task 5 onward. `generateRoomCode(): string` — consumed by Task 5 (match creation).

- [ ] **Step 1: Write the failing tests for `resolveIdentity`**

Create `lib/identity.test.ts`:

```ts
// lib/identity.test.ts
import { describe, it, expect } from 'vitest';
import { resolveIdentity } from './identity';

describe('resolveIdentity', () => {
  it('prefers a session user id over any guest cookie', () => {
    const { identity, newGuestCookie } = resolveIdentity('user-123', 'guest-abc');
    expect(identity).toEqual({ type: 'user', id: 'user-123' });
    expect(newGuestCookie).toBeUndefined();
  });

  it('uses an existing guest cookie when there is no session', () => {
    const { identity, newGuestCookie } = resolveIdentity(undefined, 'guest-abc');
    expect(identity).toEqual({ type: 'guest', id: 'guest-abc' });
    expect(newGuestCookie).toBeUndefined();
  });

  it('issues a new guest id when there is neither a session nor a cookie', () => {
    const { identity, newGuestCookie } = resolveIdentity(undefined, undefined);
    expect(identity.type).toBe('guest');
    expect(identity.id).toMatch(/^[0-9a-f-]{36}$/); // a UUID
    expect(newGuestCookie).toBe(identity.id);
  });
});
```

- [ ] **Step 2: Run to verify it fails**

Run: `npx vitest run lib/identity.test.ts`
Expected: FAIL — `resolveIdentity is not exported` / module not found.

- [ ] **Step 3: Implement `lib/identity.ts`**

```ts
// lib/identity.ts
import { randomUUID } from 'crypto';
import { NextRequest, NextResponse } from 'next/server';
import { auth } from '@/lib/auth';

export interface Identity {
  type: 'user' | 'guest';
  id: string;
}

export const GUEST_COOKIE_NAME = 'oche_guest_id';
const GUEST_COOKIE_MAX_AGE = 60 * 60 * 24 * 365; // 1 year

/** Pure decision: given an optional session user id and an optional existing guest cookie
 *  value, decide the caller's identity and whether a new guest cookie needs to be issued. */
export function resolveIdentity(
  sessionUserId: string | undefined,
  existingGuestCookie: string | undefined
): { identity: Identity; newGuestCookie?: string } {
  if (sessionUserId) {
    return { identity: { type: 'user', id: sessionUserId } };
  }
  if (existingGuestCookie) {
    return { identity: { type: 'guest', id: existingGuestCookie } };
  }
  const newId = randomUUID();
  return { identity: { type: 'guest', id: newId }, newGuestCookie: newId };
}

/** IO wrapper: reads the session and cookie off a real request, resolves identity via the pure
 *  function above. Does not itself mutate a response — call `applyIdentityCookie` on whatever
 *  response the calling route returns, so a newly issued guest cookie actually reaches the
 *  browser. */
export async function getIdentity(req: NextRequest): Promise<{ identity: Identity; newGuestCookie?: string }> {
  const session = await auth();
  const existingGuestCookie = req.cookies.get(GUEST_COOKIE_NAME)?.value;
  return resolveIdentity(session?.user?.id, existingGuestCookie);
}

/** Sets the guest cookie on `response` if `getIdentity` issued a new one. Every route that calls
 *  `getIdentity` must pass its result's `newGuestCookie` through this before returning. */
export function applyIdentityCookie(response: NextResponse, newGuestCookie: string | undefined): NextResponse {
  if (newGuestCookie) {
    response.cookies.set(GUEST_COOKIE_NAME, newGuestCookie, {
      maxAge: GUEST_COOKIE_MAX_AGE,
      sameSite: 'lax',
      path: '/',
    });
  }
  return response;
}
```

- [ ] **Step 4: Run to verify it passes**

Run: `npx vitest run lib/identity.test.ts`
Expected: PASS (3 tests).

- [ ] **Step 5: Write the failing tests for `generateRoomCode`**

Create `lib/roomCode.test.ts`:

```ts
// lib/roomCode.test.ts
import { describe, it, expect } from 'vitest';
import { generateRoomCode } from './roomCode';

describe('generateRoomCode', () => {
  it('generates a 6-character code using only the allowed alphabet', () => {
    for (let i = 0; i < 50; i++) {
      const code = generateRoomCode();
      expect(code).toHaveLength(6);
      expect(code).toMatch(/^[A-HJ-NP-Z2-9]{6}$/); // excludes 0, O, 1, I
    }
  });
});
```

- [ ] **Step 6: Run to verify it fails**

Run: `npx vitest run lib/roomCode.test.ts`
Expected: FAIL — module not found.

- [ ] **Step 7: Implement `lib/roomCode.ts`**

```ts
// lib/roomCode.ts
import { randomInt } from 'crypto';

const ROOM_CODE_ALPHABET = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789'; // excludes ambiguous 0/O/1/I
const ROOM_CODE_LENGTH = 6;

export function generateRoomCode(): string {
  let code = '';
  for (let i = 0; i < ROOM_CODE_LENGTH; i++) {
    code += ROOM_CODE_ALPHABET[randomInt(ROOM_CODE_ALPHABET.length)];
  }
  return code;
}
```

- [ ] **Step 8: Run to verify it passes**

Run: `npx vitest run lib/roomCode.test.ts`
Expected: PASS.

- [ ] **Step 9: Full suite + typecheck**

Run: `npx tsc --noEmit && npx vitest run`
Expected: tsc clean; 51/51 tests passing.

- [ ] **Step 10: Commit**

```bash
git add lib/identity.ts lib/identity.test.ts lib/roomCode.ts lib/roomCode.test.ts
git commit -m "feat(remote): add guest identity primitive and room code generator"
```

---

### Task 3: Ably server helper & token route

**Files:**
- Create: `lib/realtime.ts`
- Create: `app/api/ably/token/route.ts`

**Interfaces:**
- Consumes: `getIdentity`, `applyIdentityCookie` (Task 2); `connectDB` (`@/lib/db`, existing); `Match` (`@/lib/db/models`, existing).
- Produces: `matchChannelName(matchId: string): string`, `publishMatchEvent(matchId: string, event: MatchEvent): Promise<void>` where `MatchEvent = { name: 'lobby'; data: { players: unknown[] } } | { name: 'state'; data: { state: unknown; status: string; winnerId?: string | null } }` — consumed by Tasks 6, 7, 8, 9. `GET /api/ably/token?matchId=...` route — consumed by Task 12 (client sync hook).

- [ ] **Step 1: Implement `lib/realtime.ts`**

No unit test for this file — it's a thin wrapper around the `ably` SDK's own `Rest` client (network IO), verified via live two-browser testing once the full sync loop exists (Task 8 onward), consistent with the spec's testing approach (§8).

```ts
// lib/realtime.ts
import { Rest } from 'ably';

let restClient: Rest | null = null;

function getRestClient(): Rest {
  if (!restClient) {
    const key = process.env.ABLY_API_KEY;
    if (!key) throw new Error('ABLY_API_KEY not set');
    restClient = new Rest({ key });
  }
  return restClient;
}

export function matchChannelName(matchId: string): string {
  return `match:${matchId}`;
}

export type MatchEvent =
  | { name: 'lobby'; data: { players: unknown[] } }
  | { name: 'state'; data: { state: unknown; status: string; winnerId?: string | null } };

export async function publishMatchEvent(matchId: string, event: MatchEvent): Promise<void> {
  const channel = getRestClient().channels.get(matchChannelName(matchId));
  await channel.publish(event.name, event.data);
}

export async function createMatchToken(matchId: string, clientId: string) {
  const client = getRestClient();
  return client.auth.createTokenRequest({
    clientId,
    capability: { [matchChannelName(matchId)]: ['subscribe'] },
  });
}
```

- [ ] **Step 2: Implement the token route**

Create `app/api/ably/token/route.ts`:

```ts
// app/api/ably/token/route.ts
import { NextRequest, NextResponse } from 'next/server';
import mongoose from 'mongoose';
import { connectDB } from '@/lib/db';
import { Match } from '@/lib/db/models';
import { getIdentity, applyIdentityCookie } from '@/lib/identity';
import { createMatchToken } from '@/lib/realtime';

export async function GET(req: NextRequest) {
  const matchId = req.nextUrl.searchParams.get('matchId');
  if (!matchId || !mongoose.Types.ObjectId.isValid(matchId)) {
    return NextResponse.json({ error: 'Invalid or missing matchId' }, { status: 400 });
  }

  const { identity, newGuestCookie } = await getIdentity(req);

  await connectDB();
  const match = await Match.findById(matchId);
  if (!match) {
    return NextResponse.json({ error: 'Match not found' }, { status: 404 });
  }

  const isSeated = match.players.some(
    (p: { userId?: string; guestId?: string }) => p.userId === identity.id || p.guestId === identity.id
  );
  if (!isSeated) {
    return NextResponse.json({ error: 'Not a participant in this match' }, { status: 403 });
  }

  const tokenRequest = await createMatchToken(matchId, identity.id);
  return applyIdentityCookie(NextResponse.json(tokenRequest), newGuestCookie);
}
```

- [ ] **Step 3: Typecheck**

Run: `npx tsc --noEmit`
Expected: clean. (No new tests in this task — see Step 1's note. `npx vitest run` should still show 51/51 unaffected.)

- [ ] **Step 4: Commit**

```bash
git add lib/realtime.ts app/api/ably/token/route.ts
git commit -m "feat(remote): add Ably publish helper and per-match token route"
```

---

### Task 4: Lobby pure logic

**Files:**
- Create: `lib/matchLobby.ts`
- Create: `lib/matchLobby.test.ts`

**Interfaces:**
- Consumes: `Identity` (Task 2).
- Produces: `MatchPlayerDoc { userId?: string; guestId?: string; name: string; seat: number; isGuest: boolean }`, `seatFor(identity: Identity, name: string, seat: number): MatchPlayerDoc`, `identityIdOf(player: MatchPlayerDoc): string`, `isSeated(players: MatchPlayerDoc[], identity: Identity): boolean`, `canJoinLobby(match: { status: string; players: MatchPlayerDoc[] }, identity: Identity): { ok: true } | { ok: false; status: number; error: string }`, `canStartMatch(match: { status: string; players: MatchPlayerDoc[]; hostId: string }, identity: Identity): { ok: true } | { ok: false; status: number; error: string }` — consumed by Task 5 (`seatFor` at creation), Task 6 (`seatFor`, `isSeated`, `canJoinLobby`), Task 7 (`canStartMatch`, `identityIdOf`).

- [ ] **Step 1: Write the failing tests**

Create `lib/matchLobby.test.ts`:

```ts
// lib/matchLobby.test.ts
import { describe, it, expect } from 'vitest';
import { seatFor, identityIdOf, isSeated, canJoinLobby, canStartMatch, MatchPlayerDoc } from './matchLobby';
import { Identity } from './identity';

describe('seatFor / identityIdOf', () => {
  it('maps a user identity to a userId-based seat', () => {
    const identity: Identity = { type: 'user', id: 'u1' };
    const seat = seatFor(identity, 'Alex', 0);
    expect(seat).toEqual({ userId: 'u1', guestId: undefined, name: 'Alex', seat: 0, isGuest: false });
    expect(identityIdOf(seat)).toBe('u1');
  });

  it('maps a guest identity to a guestId-based seat', () => {
    const identity: Identity = { type: 'guest', id: 'g1' };
    const seat = seatFor(identity, 'Guest', 1);
    expect(seat).toEqual({ userId: undefined, guestId: 'g1', name: 'Guest', seat: 1, isGuest: true });
    expect(identityIdOf(seat)).toBe('g1');
  });
});

describe('isSeated', () => {
  const players: MatchPlayerDoc[] = [seatFor({ type: 'guest', id: 'g1' }, 'Host', 0)];

  it('is true when the identity matches a seated player', () => {
    expect(isSeated(players, { type: 'guest', id: 'g1' })).toBe(true);
  });

  it('is false otherwise', () => {
    expect(isSeated(players, { type: 'guest', id: 'g2' })).toBe(false);
  });
});

describe('canJoinLobby', () => {
  const host = seatFor({ type: 'guest', id: 'g1' }, 'Host', 0);

  it('allows joining an open lobby with one seat filled', () => {
    expect(canJoinLobby({ status: 'lobby', players: [host] }, { type: 'guest', id: 'g2' })).toEqual({ ok: true });
  });

  it('is idempotent for a player who already joined', () => {
    expect(canJoinLobby({ status: 'lobby', players: [host] }, { type: 'guest', id: 'g1' })).toEqual({ ok: true });
  });

  it('rejects joining a full lobby', () => {
    const guest = seatFor({ type: 'guest', id: 'g2' }, 'Guest', 1);
    const result = canJoinLobby({ status: 'lobby', players: [host, guest] }, { type: 'guest', id: 'g3' });
    expect(result).toEqual({ ok: false, status: 409, error: 'Match is full' });
  });

  it('rejects joining a match that already started', () => {
    const result = canJoinLobby({ status: 'live', players: [host] }, { type: 'guest', id: 'g2' });
    expect(result).toEqual({ ok: false, status: 409, error: 'Match is not open for joining' });
  });
});

describe('canStartMatch', () => {
  const host = seatFor({ type: 'guest', id: 'g1' }, 'Host', 0);
  const guest = seatFor({ type: 'guest', id: 'g2' }, 'Guest', 1);

  it('allows the host to start a full lobby', () => {
    const match = { status: 'lobby', players: [host, guest], hostId: 'g1' };
    expect(canStartMatch(match, { type: 'guest', id: 'g1' })).toEqual({ ok: true });
  });

  it('rejects a non-host', () => {
    const match = { status: 'lobby', players: [host, guest], hostId: 'g1' };
    const result = canStartMatch(match, { type: 'guest', id: 'g2' });
    expect(result).toEqual({ ok: false, status: 403, error: 'Only the host can start the match' });
  });

  it('rejects starting with only one player seated', () => {
    const match = { status: 'lobby', players: [host], hostId: 'g1' };
    const result = canStartMatch(match, { type: 'guest', id: 'g1' });
    expect(result).toEqual({ ok: false, status: 400, error: 'Match needs exactly 2 players to start' });
  });

  it('rejects starting a match that is not in lobby status', () => {
    const match = { status: 'live', players: [host, guest], hostId: 'g1' };
    const result = canStartMatch(match, { type: 'guest', id: 'g1' });
    expect(result).toEqual({ ok: false, status: 409, error: 'Match already started' });
  });
});
```

- [ ] **Step 2: Run to verify it fails**

Run: `npx vitest run lib/matchLobby.test.ts`
Expected: FAIL — module not found.

- [ ] **Step 3: Implement `lib/matchLobby.ts`**

```ts
// lib/matchLobby.ts
import { Identity } from './identity';

export interface MatchPlayerDoc {
  userId?: string;
  guestId?: string;
  name: string;
  seat: number;
  isGuest: boolean;
}

export function seatFor(identity: Identity, name: string, seat: number): MatchPlayerDoc {
  return {
    userId: identity.type === 'user' ? identity.id : undefined,
    guestId: identity.type === 'guest' ? identity.id : undefined,
    name,
    seat,
    isGuest: identity.type === 'guest',
  };
}

export function identityIdOf(player: MatchPlayerDoc): string {
  return (player.userId ?? player.guestId) as string;
}

export function isSeated(players: MatchPlayerDoc[], identity: Identity): boolean {
  return players.some((p) => identityIdOf(p) === identity.id);
}

type LobbyResult = { ok: true } | { ok: false; status: number; error: string };

export function canJoinLobby(match: { status: string; players: MatchPlayerDoc[] }, identity: Identity): LobbyResult {
  if (match.status !== 'lobby') {
    return { ok: false, status: 409, error: 'Match is not open for joining' };
  }
  if (isSeated(match.players, identity)) {
    return { ok: true }; // idempotent re-join
  }
  if (match.players.length >= 2) {
    return { ok: false, status: 409, error: 'Match is full' };
  }
  return { ok: true };
}

export function canStartMatch(
  match: { status: string; players: MatchPlayerDoc[]; hostId: string },
  identity: Identity
): LobbyResult {
  if (identity.id !== match.hostId) {
    return { ok: false, status: 403, error: 'Only the host can start the match' };
  }
  if (match.status !== 'lobby') {
    return { ok: false, status: 409, error: 'Match already started' };
  }
  if (match.players.length !== 2) {
    return { ok: false, status: 400, error: 'Match needs exactly 2 players to start' };
  }
  return { ok: true };
}
```

- [ ] **Step 4: Run to verify it passes**

Run: `npx vitest run lib/matchLobby.test.ts`
Expected: PASS (10 tests).

- [ ] **Step 5: Full suite + typecheck**

Run: `npx tsc --noEmit && npx vitest run`
Expected: tsc clean; 61/61 tests passing.

- [ ] **Step 6: Commit**

```bash
git add lib/matchLobby.ts lib/matchLobby.test.ts
git commit -m "feat(remote): add pure lobby-seating and start/join authorization logic"
```

---

### Task 5: Match creation & snapshot API

**Files:**
- Modify: `app/api/matches/route.ts` (extend `POST` for `mode: 'remote'`)
- Modify: `app/api/matches/[id]/route.ts` (extend `GET` to return the full snapshot)

**Interfaces:**
- Consumes: `getIdentity`, `applyIdentityCookie` (Task 2); `generateRoomCode` (Task 2); `seatFor`, `isSeated` (Task 4).
- Produces: `POST /api/matches` body now accepts `{ gameId: string; mode?: 'local' | 'remote' }` (default `'local'`, unchanged for existing callers); for `mode: 'remote'` returns `{ id, roomCode }`. `GET /api/matches/:id` now returns `{ gameId, mode, status, state, settings, players, roomCode, you }` — consumed by Task 11 (store), Task 13 (MatchLobby), Task 14 (match page).

- [ ] **Step 1: Read the current files**

Read `app/api/matches/route.ts` and `app/api/matches/[id]/route.ts` in full before editing — both are short (under 35 lines each).

- [ ] **Step 2: Extend `POST /api/matches`**

Replace the full contents of `app/api/matches/route.ts` with:

```ts
// app/api/matches/route.ts
import { connectDB } from '@/lib/db';
import { Match } from '@/lib/db/models';
import { NextRequest, NextResponse } from 'next/server';
import { auth } from '@/lib/auth';
import { gameRegistry } from '@/lib/games/registry';
import { getIdentity, applyIdentityCookie } from '@/lib/identity';
import { generateRoomCode } from '@/lib/roomCode';
import { seatFor } from '@/lib/matchLobby';

export async function POST(req: NextRequest) {
  let body: unknown;
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: 'Invalid JSON body' }, { status: 400 });
  }

  const gameId = (body as { gameId?: unknown })?.gameId;
  if (typeof gameId !== 'string' || !Object.prototype.hasOwnProperty.call(gameRegistry, gameId)) {
    return NextResponse.json({ error: 'Invalid or unrecognized gameId' }, { status: 400 });
  }

  const modeInput = (body as { mode?: unknown })?.mode;
  const mode = modeInput === 'remote' ? 'remote' : 'local';

  await connectDB();

  if (mode === 'local') {
    const session = await auth();
    const match = await Match.create({
      gameId,
      mode: 'local',
      status: 'live',
      players: [
        { name: session?.user?.name || 'Guest 1', isGuest: !session },
        { name: 'Guest 2', isGuest: true },
      ],
    });
    return NextResponse.json({ id: match._id.toString() });
  }

  // mode === 'remote'
  const { identity, newGuestCookie } = await getIdentity(req);
  const session = await auth();

  let roomCode = generateRoomCode();
  while (await Match.exists({ roomCode, status: { $in: ['lobby', 'live'] } })) {
    roomCode = generateRoomCode();
  }

  const match = await Match.create({
    gameId,
    mode: 'remote',
    status: 'lobby',
    roomCode,
    hostId: identity.id,
    players: [seatFor(identity, session?.user?.name ?? 'Guest', 0)],
  });

  return applyIdentityCookie(NextResponse.json({ id: match._id.toString(), roomCode }), newGuestCookie);
}
```

- [ ] **Step 3: Extend `GET /api/matches/:id`**

Replace the full contents of `app/api/matches/[id]/route.ts` with:

```ts
// app/api/matches/[id]/route.ts
import { connectDB } from '@/lib/db';
import { Match } from '@/lib/db/models';
import { NextRequest, NextResponse } from 'next/server';
import mongoose from 'mongoose';
import { getIdentity, applyIdentityCookie } from '@/lib/identity';
import { isSeated } from '@/lib/matchLobby';

export async function GET(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;

  if (!mongoose.Types.ObjectId.isValid(id)) {
    return NextResponse.json({ error: 'Invalid match id' }, { status: 400 });
  }

  await connectDB();
  const match = await Match.findById(id);

  if (!match) {
    return NextResponse.json({ error: 'Match not found' }, { status: 404 });
  }

  const { identity, newGuestCookie } = await getIdentity(req);

  return applyIdentityCookie(
    NextResponse.json({
      gameId: match.gameId,
      mode: match.mode,
      status: match.status,
      state: match.state ?? null,
      settings: match.settings ?? null,
      players: match.players,
      roomCode: match.roomCode ?? null,
      you: isSeated(match.players, identity) ? identity.id : null,
    }),
    newGuestCookie
  );
}
```

- [ ] **Step 4: Typecheck**

Run: `npx tsc --noEmit`
Expected: clean.

- [ ] **Step 5: Run the full suite**

Run: `npx vitest run`
Expected: 61/61 passing (no test changes in this task — these routes are thin glue over already-tested pure functions, verified live in Task 14 once the whole flow exists end-to-end).

- [ ] **Step 6: Manually verify local play is unaffected**

Run: `npm run dev`, open the dashboard, click "New Match" (still the only button — Task 13 adds "Play Remote"), confirm it creates a local match and the scoreboard loads exactly as before. This is the regression check for this task's changes to the shared `POST /api/matches` route.

- [ ] **Step 7: Commit**

```bash
git add app/api/matches/route.ts "app/api/matches/[id]/route.ts"
git commit -m "feat(remote): extend match creation and snapshot routes for remote mode"
```

---

### Task 6: Join route

**Files:**
- Create: `app/api/matches/join/[code]/route.ts`

**Interfaces:**
- Consumes: `getIdentity`, `applyIdentityCookie` (Task 2); `canJoinLobby`, `isSeated`, `seatFor` (Task 4); `publishMatchEvent` (Task 3).
- Produces: `POST /api/matches/join/:code` → `{ id: string }` on success. Consumed by Task 15 (`/join/[code]` page).

- [ ] **Step 1: Implement the route**

Create `app/api/matches/join/[code]/route.ts`:

```ts
// app/api/matches/join/[code]/route.ts
import { connectDB } from '@/lib/db';
import { Match } from '@/lib/db/models';
import { NextRequest, NextResponse } from 'next/server';
import { auth } from '@/lib/auth';
import { getIdentity, applyIdentityCookie } from '@/lib/identity';
import { canJoinLobby, isSeated, seatFor } from '@/lib/matchLobby';
import { publishMatchEvent } from '@/lib/realtime';

export async function POST(req: NextRequest, { params }: { params: Promise<{ code: string }> }) {
  const { code } = await params;

  await connectDB();
  const match = await Match.findOne({ roomCode: code.toUpperCase() });
  if (!match) {
    return NextResponse.json({ error: 'Room not found' }, { status: 404 });
  }

  const { identity, newGuestCookie } = await getIdentity(req);
  const check = canJoinLobby({ status: match.status, players: match.players }, identity);
  if (!check.ok) {
    return NextResponse.json({ error: check.error }, { status: check.status });
  }

  if (!isSeated(match.players, identity)) {
    const session = await auth();
    match.players.push(seatFor(identity, session?.user?.name ?? 'Guest', match.players.length));
    await match.save();
    await publishMatchEvent(match._id.toString(), { name: 'lobby', data: { players: match.players } });
  }

  return applyIdentityCookie(NextResponse.json({ id: match._id.toString() }), newGuestCookie);
}
```

- [ ] **Step 2: Typecheck**

Run: `npx tsc --noEmit`
Expected: clean.

- [ ] **Step 3: Commit**

```bash
git add "app/api/matches/join/[code]/route.ts"
git commit -m "feat(remote): add room-code join route"
```

---

### Task 7: Start route

**Files:**
- Create: `app/api/matches/[id]/start/route.ts`

**Interfaces:**
- Consumes: `getIdentity` (Task 2); `canStartMatch`, `identityIdOf` (Task 4); `publishMatchEvent` (Task 3); `getGameModule` (`@/lib/games/registry`, existing); `createPlayerId` (`@/lib/types`, existing).
- Produces: `POST /api/matches/:id/start` → `{ ok: true }` on success, flips `status` to `'live'`. Consumed by Task 13 (MatchLobby's Start button).

- [ ] **Step 1: Implement the route**

Create `app/api/matches/[id]/start/route.ts`:

```ts
// app/api/matches/[id]/start/route.ts
import { connectDB } from '@/lib/db';
import { Match } from '@/lib/db/models';
import { NextRequest, NextResponse } from 'next/server';
import mongoose from 'mongoose';
import { getIdentity } from '@/lib/identity';
import { canStartMatch, identityIdOf } from '@/lib/matchLobby';
import { publishMatchEvent } from '@/lib/realtime';
import { getGameModule, GameId } from '@/lib/games/registry';
import { createPlayerId } from '@/lib/types';

export async function POST(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  if (!mongoose.Types.ObjectId.isValid(id)) {
    return NextResponse.json({ error: 'Invalid match id' }, { status: 400 });
  }

  await connectDB();
  const match = await Match.findById(id);
  if (!match) {
    return NextResponse.json({ error: 'Match not found' }, { status: 404 });
  }

  const { identity } = await getIdentity(req);
  const check = canStartMatch({ status: match.status, players: match.players, hostId: match.hostId }, identity);
  if (!check.ok) {
    return NextResponse.json({ error: check.error }, { status: check.status });
  }

  const gameModule = await getGameModule(match.gameId as GameId);
  const playerIds = match.players
    .sort((a: { seat: number }, b: { seat: number }) => a.seat - b.seat)
    .map((p: any) => createPlayerId(identityIdOf(p)));

  const state = gameModule.init(playerIds, gameModule.defaultSettings);

  match.state = state;
  match.settings = gameModule.defaultSettings;
  match.status = 'live';
  match.startedAt = new Date();
  await match.save();

  await publishMatchEvent(id, { name: 'state', data: { state, status: 'live' } });

  return NextResponse.json({ ok: true });
}
```

- [ ] **Step 2: Typecheck**

Run: `npx tsc --noEmit`
Expected: clean.

- [ ] **Step 3: Commit**

```bash
git add "app/api/matches/[id]/start/route.ts"
git commit -m "feat(remote): add host-only match-start route"
```

---

### Task 8: Throws route

**Files:**
- Create: `lib/matchThrows.ts`
- Create: `lib/matchThrows.test.ts`
- Create: `app/api/matches/[id]/throws/route.ts`

**Interfaces:**
- Consumes: `lastCompletedVisit` (Task 1, via `GameModule`); `getIdentity` (Task 2); `publishMatchEvent` (Task 3).
- Produces: `canSubmitThrow(gameModule, state, identityId): { ok: true } | { ok: false; status: number; error: string }`, `newlyCompletedVisit(gameModule, newState, playerId): { playerId: string; throws: Throw[]; scoreBefore: number; scoreAfter: number; busted: boolean; isCheckout: boolean } | null` — consumed by the throws route in this task. `POST /api/matches/:id/throws` — consumed by Task 11 (store's remote `applyThrow`).

- [ ] **Step 1: Write the failing tests**

Create `lib/matchThrows.test.ts`:

```ts
// lib/matchThrows.test.ts
import { describe, it, expect } from 'vitest';
import { canSubmitThrow, newlyCompletedVisit } from './matchThrows';
import X01Module from './games/x01/index';
import { createPlayerId } from './types';
import { X01DefaultSettings } from './games/x01/schema';

describe('canSubmitThrow', () => {
  const player1 = createPlayerId('p1');
  const player2 = createPlayerId('p2');
  const state = X01Module.init([player1, player2], X01DefaultSettings);

  it('allows the player whose turn it is', () => {
    expect(canSubmitThrow(X01Module, state, 'p1')).toEqual({ ok: true });
  });

  it('rejects anyone else', () => {
    expect(canSubmitThrow(X01Module, state, 'p2')).toEqual({ ok: false, status: 403, error: 'Not your turn' });
  });
});

describe('newlyCompletedVisit', () => {
  const player1 = createPlayerId('p1');
  const player2 = createPlayerId('p2');

  it('returns null while a visit is still in progress', () => {
    let state = X01Module.init([player1, player2], X01DefaultSettings);
    const dart = { sector: 20 as const, ring: 'T' as const, points: 60, order: 0 as const };
    state = X01Module.applyThrow(state, dart, X01DefaultSettings);
    expect(newlyCompletedVisit(X01Module, state, player1)).toBe(null);
  });

  it('returns the visit once the 3rd dart commits it', () => {
    let state = X01Module.init([player1, player2], X01DefaultSettings);
    const dart = { sector: 20 as const, ring: 'T' as const, points: 60, order: 0 as const };
    state = X01Module.applyThrow(state, dart, X01DefaultSettings);
    state = X01Module.applyThrow(state, dart, X01DefaultSettings);
    state = X01Module.applyThrow(state, dart, X01DefaultSettings);

    const visit = newlyCompletedVisit(X01Module, state, player1);
    expect(visit).not.toBe(null);
    expect(visit!.playerId).toBe('p1');
    expect(visit!.throws).toHaveLength(3);
    expect(visit!.scoreAfter).toBe(501 - 180);
  });

  it('returns a leg-ending checkout visit (the case lastCompletedVisit exists for)', () => {
    let state = X01Module.init([player1, player2], X01DefaultSettings);
    state.playerScores[player1] = 40;
    const finishDart = { sector: 20 as const, ring: 'D' as const, points: 40, order: 0 as const };
    state = X01Module.applyThrow(state, finishDart, X01DefaultSettings);

    const visit = newlyCompletedVisit(X01Module, state, player1);
    expect(visit).not.toBe(null);
    expect(visit!.isCheckout).toBe(true);
  });
});
```

- [ ] **Step 2: Run to verify it fails**

Run: `npx vitest run lib/matchThrows.test.ts`
Expected: FAIL — module not found.

- [ ] **Step 3: Implement `lib/matchThrows.ts`**

```ts
// lib/matchThrows.ts
import { GameModule, PlayerId, Throw } from './types';

export function canSubmitThrow(
  gameModule: GameModule<any, any>,
  state: any,
  identityId: string
): { ok: true } | { ok: false; status: number; error: string } {
  const current = gameModule.currentPlayer(state);
  if (current !== identityId) {
    return { ok: false, status: 403, error: 'Not your turn' };
  }
  return { ok: true };
}

export interface VisitDocFields {
  playerId: string;
  throws: Throw[];
  scoreBefore: number;
  scoreAfter: number;
  busted: boolean;
  isCheckout: boolean;
}

/** If the throw just applied completed a visit (regardless of whether it also ended a leg or
 *  the match), returns that visit's fields for persistence. Returns null if the visit is still
 *  in progress. `newState` must be the state *after* the throw that's being checked. */
export function newlyCompletedVisit(
  gameModule: GameModule<any, any>,
  newState: any,
  playerId: PlayerId
): VisitDocFields | null {
  if (gameModule.visitProgress(newState).darts !== 0) return null;
  const visit = gameModule.lastCompletedVisit(newState, playerId);
  if (!visit) return null;
  return { playerId: playerId as unknown as string, ...visit };
}
```

- [ ] **Step 4: Run to verify it passes**

Run: `npx vitest run lib/matchThrows.test.ts`
Expected: PASS (5 tests).

- [ ] **Step 5: Implement the throws route**

Create `app/api/matches/[id]/throws/route.ts`:

```ts
// app/api/matches/[id]/throws/route.ts
import { connectDB } from '@/lib/db';
import { Match, Visit } from '@/lib/db/models';
import { NextRequest, NextResponse } from 'next/server';
import mongoose from 'mongoose';
import { getIdentity } from '@/lib/identity';
import { canSubmitThrow, newlyCompletedVisit } from '@/lib/matchThrows';
import { publishMatchEvent } from '@/lib/realtime';
import { getGameModule, GameId } from '@/lib/games/registry';
import { createPlayerId, Throw } from '@/lib/types';

export async function POST(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  if (!mongoose.Types.ObjectId.isValid(id)) {
    return NextResponse.json({ error: 'Invalid match id' }, { status: 400 });
  }

  let body: unknown;
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: 'Invalid JSON body' }, { status: 400 });
  }
  const throw_ = (body as { throw?: Throw })?.throw;
  if (!throw_ || typeof throw_.sector !== 'number' || typeof throw_.ring !== 'string') {
    return NextResponse.json({ error: 'Invalid throw' }, { status: 400 });
  }

  await connectDB();
  const match = await Match.findById(id);
  if (!match) {
    return NextResponse.json({ error: 'Match not found' }, { status: 404 });
  }
  if (match.status !== 'live') {
    return NextResponse.json({ error: 'Match is not live' }, { status: 409 });
  }

  const { identity } = await getIdentity(req);
  const gameModule = await getGameModule(match.gameId as GameId);

  const check = canSubmitThrow(gameModule, match.state, identity.id);
  if (!check.ok) {
    return NextResponse.json({ error: check.error }, { status: check.status });
  }

  const playerId = createPlayerId(identity.id);
  const newState = gameModule.applyThrow(match.state, throw_, match.settings);

  const visit = newlyCompletedVisit(gameModule, newState, playerId);
  if (visit) {
    await Visit.create({ matchId: id, ...visit, enteredBy: identity.id });
  }

  match.state = newState;
  let status = match.status;
  if (gameModule.isComplete(newState)) {
    status = 'complete';
    match.status = 'complete';
    match.winnerId = gameModule.winner(newState);
    match.completedAt = new Date();
  }
  await match.save();

  await publishMatchEvent(id, { name: 'state', data: { state: newState, status, winnerId: match.winnerId } });

  return NextResponse.json({ ok: true });
}
```

- [ ] **Step 6: Full suite + typecheck**

Run: `npx tsc --noEmit && npx vitest run`
Expected: tsc clean; 66/66 tests passing (61 + 5 new).

- [ ] **Step 7: Commit**

```bash
git add lib/matchThrows.ts lib/matchThrows.test.ts "app/api/matches/[id]/throws/route.ts"
git commit -m "feat(remote): add server-authoritative throws route with visit persistence"
```

---

### Task 9: Undo route

**Files:**
- Create: `app/api/matches/[id]/undo/route.ts`

**Interfaces:**
- Consumes: `getIdentity` (Task 2); `identityIdOf`, `isSeated` (Task 4); `publishMatchEvent` (Task 3).
- Produces: `POST /api/matches/:id/undo` — consumed by Task 11 (store's remote `undo`).

- [ ] **Step 1: Implement the route**

Create `app/api/matches/[id]/undo/route.ts`:

```ts
// app/api/matches/[id]/undo/route.ts
import { connectDB } from '@/lib/db';
import { Match, Visit } from '@/lib/db/models';
import { NextRequest, NextResponse } from 'next/server';
import mongoose from 'mongoose';
import { getIdentity } from '@/lib/identity';
import { isSeated } from '@/lib/matchLobby';
import { publishMatchEvent } from '@/lib/realtime';
import { getGameModule, GameId } from '@/lib/games/registry';

export async function POST(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  if (!mongoose.Types.ObjectId.isValid(id)) {
    return NextResponse.json({ error: 'Invalid match id' }, { status: 400 });
  }

  await connectDB();
  const match = await Match.findById(id);
  if (!match) {
    return NextResponse.json({ error: 'Match not found' }, { status: 404 });
  }
  if (match.status !== 'live') {
    return NextResponse.json({ error: 'Match is not live' }, { status: 409 });
  }

  const { identity } = await getIdentity(req);
  if (!isSeated(match.players, identity)) {
    return NextResponse.json({ error: 'Not a participant in this match' }, { status: 403 });
  }

  const gameModule = await getGameModule(match.gameId as GameId);
  const newState = gameModule.undo(match.state);

  match.state = newState;
  await match.save();

  // A Visit row is written iff a visit actually completed (see the throws route), and undo
  // always pops exactly one completed visit when any exist (or is a no-op) — so deleting the
  // newest row is the correct inverse in every case, including "nothing to delete."
  await Visit.findOneAndDelete({ matchId: id }).sort({ createdAt: -1 });

  await publishMatchEvent(id, { name: 'state', data: { state: newState, status: match.status } });

  return NextResponse.json({ ok: true });
}
```

- [ ] **Step 2: Typecheck**

Run: `npx tsc --noEmit`
Expected: clean.

- [ ] **Step 3: Commit**

```bash
git add "app/api/matches/[id]/undo/route.ts"
git commit -m "feat(remote): add undo route with matching visit-row cleanup"
```

---

### Task 10: Zustand store — mode-aware branching

**Files:**
- Modify: `store/match.ts`

**Interfaces:**
- Consumes: nothing new from earlier tasks at compile time (fetches happen via plain `fetch`, no imports needed) — but its `mode: 'remote'` paths call the routes from Tasks 8/9 at runtime.
- Produces: `MatchStore` gains `mode: 'local' | 'remote'`, `status: 'lobby' | 'live' | 'complete'`, `you: string | null`, `players: unknown[]`, `roomCode: string | null`; `setMatch(...)` takes an extended options object; `applyThrow`/`undo` branch on `mode`. Consumed by Task 11 (sync hook), Task 13 (MatchLobby), Task 14 (match page).

- [ ] **Step 1: Read the current file**

Read `store/match.ts` in full (it's ~60 lines) before editing.

- [ ] **Step 2: Replace its contents**

```ts
// store/match.ts
import { create } from 'zustand';
import { GameModule, PlayerId, Throw, Visit } from '@/lib/types';

type MatchMode = 'local' | 'remote';
type MatchStatus = 'lobby' | 'live' | 'complete';

interface MatchStore {
  matchId: string | null;
  mode: MatchMode;
  status: MatchStatus;
  gameModule: GameModule<any, any> | null;
  gameState: any;
  settings: any;
  players: unknown[];
  you: string | null;
  roomCode: string | null;
  visitLog: Visit[];
  currentPlayer: PlayerId | null;
  throwError: string | null;

  setMatch: (opts: {
    matchId: string;
    gameModule: GameModule<any, any>;
    gameState: any;
    settings: any;
    mode?: MatchMode;
    status?: MatchStatus;
    players?: unknown[];
    you?: string | null;
    roomCode?: string | null;
  }) => void;
  setGameState: (gameState: any, status?: MatchStatus) => void;
  setPlayers: (players: unknown[]) => void;
  applyThrow: (throw_: Throw) => Promise<void>;
  undo: () => Promise<void>;
  addVisit: (visit: Visit) => void;
  clearThrowError: () => void;
  reset: () => void;
}

export const useMatchStore = create<MatchStore>((set, get) => ({
  matchId: null,
  mode: 'local',
  status: 'live',
  gameModule: null,
  gameState: null,
  settings: null,
  players: [],
  you: null,
  roomCode: null,
  visitLog: [],
  currentPlayer: null,
  throwError: null,

  setMatch: ({
    matchId,
    gameModule,
    gameState,
    settings,
    mode = 'local',
    status = 'live',
    players = [],
    you = null,
    roomCode = null,
  }) => set({ matchId, gameModule, gameState, settings, mode, status, players, you, roomCode }),

  setGameState: (gameState, status) => set((state) => ({ gameState, status: status ?? state.status })),

  setPlayers: (players) => set({ players }),

  applyThrow: async (throw_) => {
    const state = get();
    if (!state.gameModule || !state.gameState || !state.matchId) return;

    if (state.mode === 'local') {
      const newGameState = state.gameModule.applyThrow(state.gameState, throw_, state.settings);
      set({ gameState: newGameState });
      return;
    }

    // remote: the store only updates once the server's Ably broadcast arrives (see the
    // useRemoteMatchSync hook) — no optimistic local mutation for this milestone.
    set({ throwError: null });
    const res = await fetch(`/api/matches/${state.matchId}/throws`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ throw: throw_ }),
    });
    if (!res.ok) {
      const body = await res.json().catch(() => ({}));
      set({ throwError: body.error ?? "Couldn't send that throw — try again" });
    }
  },

  undo: async () => {
    const state = get();
    if (!state.gameModule || !state.gameState || !state.matchId) return;

    if (state.mode === 'local') {
      const newGameState = state.gameModule.undo(state.gameState);
      set({ gameState: newGameState });
      return;
    }

    await fetch(`/api/matches/${state.matchId}/undo`, { method: 'POST' });
  },

  addVisit: (visit) =>
    set((state) => ({
      visitLog: [...state.visitLog, visit],
    })),

  clearThrowError: () => set({ throwError: null }),

  reset: () =>
    set({
      matchId: null,
      mode: 'local',
      status: 'live',
      gameModule: null,
      gameState: null,
      settings: null,
      players: [],
      you: null,
      roomCode: null,
      visitLog: [],
      currentPlayer: null,
      throwError: null,
    }),
}));
```

- [ ] **Step 3: Typecheck**

Run: `npx tsc --noEmit`
Expected: this will show errors in `app/(match)/match/[id]/page.tsx` — its existing call `useMatchStore.getState().setMatch(id, module, initialState, module.defaultSettings)` uses the old positional-args signature. **Do not fix the match page in this task** — Task 14 rewrites its integration fully. For this task, only confirm the *store file itself* has no errors: `npx tsc --noEmit 2>&1 | grep 'store/match.ts'` should be empty. The match-page errors are expected and tracked as Task 14's job.

- [ ] **Step 4: Full test suite**

Run: `npx vitest run`
Expected: 66/66 passing (no test files touch the store directly; this is a compile-level change, exercised functionally in Task 14's live verification).

- [ ] **Step 5: Commit**

```bash
git add store/match.ts
git commit -m "feat(remote): make match store mode-aware (local mutates directly, remote posts to the server)"
```

---

### Task 11: `useRemoteMatchSync` hook

**Files:**
- Create: `hooks/useRemoteMatchSync.ts`

**Interfaces:**
- Consumes: `useMatchStore` (Task 10, `setGameState`, `setPlayers`); the `ably` package's `Realtime` client (browser build).
- Produces: `useRemoteMatchSync(matchId: string | null): void` — a React hook with no return value, side-effects only (subscribes/unsubscribes). Consumed by Task 14 (match page).

- [ ] **Step 1: Implement the hook**

Create `hooks/useRemoteMatchSync.ts`:

```ts
// hooks/useRemoteMatchSync.ts
'use client';
import { useEffect } from 'react';
import { Realtime } from 'ably';
import { useMatchStore } from '@/store/match';

export function useRemoteMatchSync(matchId: string | null) {
  useEffect(() => {
    if (!matchId) return;

    const client = new Realtime({
      authUrl: `/api/ably/token?matchId=${matchId}`,
      authMethod: 'GET',
    });

    const channel = client.channels.get(`match:${matchId}`);

    channel.subscribe('lobby', (msg) => {
      useMatchStore.getState().setPlayers(msg.data.players);
    });

    channel.subscribe('state', (msg) => {
      useMatchStore.getState().setGameState(msg.data.state, msg.data.status);
    });

    const refetchSnapshot = async () => {
      const res = await fetch(`/api/matches/${matchId}`);
      if (!res.ok) return;
      const snapshot = await res.json();
      useMatchStore.getState().setGameState(snapshot.state, snapshot.status);
      useMatchStore.getState().setPlayers(snapshot.players);
    };

    let wasConnected = false;
    client.connection.on((stateChange) => {
      if (stateChange.current === 'connected') {
        if (wasConnected) {
          // reconnected after a drop — cover any messages published while we were offline
          refetchSnapshot();
        }
        wasConnected = true;
      }
    });

    return () => {
      channel.unsubscribe();
      client.close();
    };
  }, [matchId]);
}
```

- [ ] **Step 2: Typecheck**

Run: `npx tsc --noEmit`
Expected: clean (this hook isn't wired into any page yet — that's Task 14 — so it produces no new errors on its own).

- [ ] **Step 3: Commit**

```bash
git add hooks/useRemoteMatchSync.ts
git commit -m "feat(remote): add useRemoteMatchSync hook for Ably subscription + reconnect refetch"
```

---

### Task 12: `MatchLobby` component

**Files:**
- Create: `components/organisms/MatchLobby.tsx`

**Interfaces:**
- Consumes: `Button` (`@/components/atoms/Button`, existing).
- Produces: `MatchLobby({ roomCode, players, isHost, onStart, starting }: { roomCode: string; players: { name: string }[]; isHost: boolean; onStart: () => void; starting: boolean })` — a presentational component with no data-fetching of its own. Consumed by Task 14 (match page).

- [ ] **Step 1: Implement the component**

Create `components/organisms/MatchLobby.tsx`:

```tsx
// components/organisms/MatchLobby.tsx
'use client';
import { Button } from '@/components/atoms/Button';
import { Copy, Crosshair } from 'lucide-react';
import { useState } from 'react';

interface MatchLobbyProps {
  roomCode: string;
  players: { name: string }[];
  isHost: boolean;
  onStart: () => void;
  starting: boolean;
}

export function MatchLobby({ roomCode, players, isHost, onStart, starting }: MatchLobbyProps) {
  const [copied, setCopied] = useState(false);
  const joinUrl = typeof window !== 'undefined' ? `${window.location.origin}/join/${roomCode}` : '';

  const handleCopy = async () => {
    await navigator.clipboard.writeText(joinUrl);
    setCopied(true);
    setTimeout(() => setCopied(false), 1500);
  };

  return (
    <div className="rounded-2xl bg-slate p-6 border border-wire/30 flex flex-col items-center gap-4 max-w-md mx-auto">
      <Crosshair className="w-8 h-8 text-wire" />
      <div className="text-center">
        <div className="text-xs font-bold uppercase tracking-widest text-sisal">Room code</div>
        <div className="text-4xl font-display font-bold tracking-[0.2em]">{roomCode}</div>
      </div>

      <button
        onClick={handleCopy}
        className="flex items-center gap-2 text-sm text-sisal hover:text-chalk rounded-full px-3 py-1.5 bg-oche border border-sisal/30"
      >
        <Copy className="w-3.5 h-3.5" />
        {copied ? 'Copied!' : joinUrl}
      </button>

      <div className="flex flex-col gap-2 w-full">
        {[0, 1].map((seat) => {
          const player = players[seat];
          return (
            <div
              key={seat}
              className={`rounded-xl p-3 text-center font-bold ${
                player ? 'bg-double/15 text-double' : 'bg-oche text-sisal/50 border border-sisal/20'
              }`}
            >
              {player ? player.name : 'Waiting for player…'}
            </div>
          );
        })}
      </div>

      {isHost && (
        <Button onClick={onStart} disabled={players.length < 2 || starting}>
          {starting ? 'Starting…' : 'Start Match'}
        </Button>
      )}
    </div>
  );
}
```

- [ ] **Step 2: Typecheck**

Run: `npx tsc --noEmit`
Expected: clean.

- [ ] **Step 3: Commit**

```bash
git add components/organisms/MatchLobby.tsx
git commit -m "feat(remote): add MatchLobby component"
```

---

### Task 13: Dashboard "Play Remote" button & join page

**Files:**
- Modify: `app/(dashboard)/page.tsx`
- Create: `app/join/[code]/page.tsx`

**Interfaces:**
- Consumes: `POST /api/matches` (Task 5, `mode: 'remote'`); `POST /api/matches/join/:code` (Task 6).
- Produces: a "Play Remote" button that navigates to `/match/:id`; a `/join/[code]` page that calls the join route and redirects to `/match/:id`.

- [ ] **Step 1: Read the current dashboard page**

Read `app/(dashboard)/page.tsx` in full (34 lines).

- [ ] **Step 2: Add the "Play Remote" button**

Replace the full contents of `app/(dashboard)/page.tsx` with:

```tsx
// app/(dashboard)/page.tsx
'use client';
import { useRouter } from 'next/navigation';
import { Button } from '@/components/atoms/Button';
import { useState } from 'react';

export default function Dashboard() {
  const router = useRouter();
  const [loading, setLoading] = useState<'local' | 'remote' | null>(null);

  const handleCreateMatch = async (mode: 'local' | 'remote') => {
    setLoading(mode);
    try {
      const res = await fetch('/api/matches', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ gameId: 'x01', mode }),
      });
      const { id } = await res.json();
      router.push(`/match/${id}`);
    } finally {
      setLoading(null);
    }
  };

  return (
    <div className="min-h-screen bg-oche text-chalk p-4">
      <h1 className="text-3xl font-display font-bold mb-6">Oche</h1>
      <div className="flex gap-3">
        <Button onClick={() => handleCreateMatch('local')} disabled={loading !== null}>
          {loading === 'local' ? 'Creating...' : 'New Match'}
        </Button>
        <Button onClick={() => handleCreateMatch('remote')} disabled={loading !== null} variant="ghost">
          {loading === 'remote' ? 'Creating...' : 'Play Remote'}
        </Button>
      </div>
    </div>
  );
}
```

- [ ] **Step 3: Implement the join page**

Create `app/join/[code]/page.tsx`:

```tsx
// app/join/[code]/page.tsx
'use client';
import { useEffect, useState, use } from 'react';
import { useRouter } from 'next/navigation';

interface JoinPageProps {
  params: Promise<{ code: string }>;
}

export default function JoinPage({ params }: JoinPageProps) {
  const router = useRouter();
  const { code } = use(params);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const join = async () => {
      const res = await fetch(`/api/matches/join/${code}`, { method: 'POST' });
      if (!res.ok) {
        const body = await res.json().catch(() => ({}));
        setError(body.error ?? 'Could not join this match');
        return;
      }
      const { id } = await res.json();
      router.push(`/match/${id}`);
    };
    join();
  }, [code, router]);

  if (error) {
    return <div className="min-h-screen bg-oche text-chalk flex items-center justify-center">{error}</div>;
  }
  return <div className="min-h-screen bg-oche text-chalk flex items-center justify-center">Joining…</div>;
}
```

- [ ] **Step 4: Typecheck**

Run: `npx tsc --noEmit`
Expected: clean (aside from the still-expected `app/(match)/match/[id]/page.tsx` errors from Task 10, unresolved until Task 14).

- [ ] **Step 5: Commit**

```bash
git add "app/(dashboard)/page.tsx" "app/join/[code]/page.tsx"
git commit -m "feat(remote): add Play Remote button and room-code join page"
```

---

### Task 14: Match page integration

**Files:**
- Modify: `app/(match)/match/[id]/page.tsx`

**Interfaces:**
- Consumes: everything from Tasks 1–12 (`useMatchStore` with its new fields/signature, `useRemoteMatchSync`, `MatchLobby`, the extended `GET /api/matches/:id` snapshot).
- Produces: a fully working remote match page. This is the last task — its live verification (Step 5) is the end-to-end proof the whole milestone works.

- [ ] **Step 1: Read the current file in full**

Read `app/(match)/match/[id]/page.tsx` completely (it's ~230 lines) — this task rewrites its data-loading `useEffect` and adds a `status === 'lobby'` branch, but keeps the existing `DartBadge`/`HistoryPanel` components and the live/complete JSX otherwise unchanged.

- [ ] **Step 2: Rewrite the mount effect and add lobby/remote branching**

Replace the `useEffect` block (the one that calls `getGameModule` and `module.init`) with:

```tsx
  useEffect(() => {
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
            roomCode: snapshot.roomCode,
          });
        } else {
          const initialState = module.init(
            [createPlayerId('player1'), createPlayerId('player2')],
            module.defaultSettings
          );
          useMatchStore.getState().setMatch({
            matchId: id,
            gameModule: module,
            gameState: initialState,
            settings: module.defaultSettings,
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
    init();
  }, [id]);
```

- [ ] **Step 3: Wire the sync hook, lobby branch, and throw-error/turn-gating**

Add the corresponding imports at the top of the file:

```tsx
import { useRemoteMatchSync } from '@/hooks/useRemoteMatchSync';
import { MatchLobby } from '@/components/organisms/MatchLobby';
```

At the top of the component function (after the existing `useMatchStore()` destructure), add:

```tsx
  const { mode, status, players: lobbyPlayers, you, throwError, roomCode } = useMatchStore();
  useRemoteMatchSync(mode === 'remote' ? id : null);
  const [starting, setStarting] = useState(false);

  const handleStart = async () => {
    setStarting(true);
    await fetch(`/api/matches/${id}/start`, { method: 'POST' });
    setStarting(false);
  };
```

Immediately after the `if (loading || !gameModule || !gameState)` early return, add the lobby branch:

```tsx
  if (mode === 'remote' && status === 'lobby') {
    const isHost =
      lobbyPlayers.length > 0 &&
      you !== null &&
      ((lobbyPlayers[0] as any).userId === you || (lobbyPlayers[0] as any).guestId === you);

    return (
      <div className="min-h-screen bg-oche text-chalk p-4 flex items-center justify-center">
        <MatchLobby
          roomCode={roomCode ?? ''}
          players={lobbyPlayers as { name: string }[]}
          isHost={isHost}
          onStart={handleStart}
          starting={starting}
        />
      </div>
    );
  }
```

- [ ] **Step 4: Gate the board on turn ownership in remote mode, and show throw errors**

Find the `<DartboardInput ... />` call in the middle row and change its `disabled` prop from `disabled={isComplete}` to:

```tsx
              disabled={isComplete || (mode === 'remote' && gameModule.currentPlayer(gameState) !== you)}
```

Immediately above the `<DartboardInput ...>` element (inside the same wrapping `<div className="flex flex-col items-center justify-center gap-4 w-full">`), add:

```tsx
            {throwError && (
              <div className="text-sm text-treble bg-treble/10 border border-treble/40 rounded-xl px-3 py-2 flex items-center gap-2">
                {throwError}
                <button onClick={() => useMatchStore.getState().clearThrowError()} className="underline">
                  Dismiss
                </button>
              </div>
            )}
```

- [ ] **Step 5: Manual live verification (two browser sessions)**

With `.env.local` containing a real `ABLY_API_KEY` and `MONGODB_URI`, run `npm run dev`. In one browser: go to the dashboard, click "Play Remote," confirm the lobby shows the room code. Copy the join link. In a second browser (or incognito window, to get a different `oche_guest_id` cookie), open the join link, confirm the lobby now shows both players in the first browser (live, no refresh needed) and the "Start Match" button is enabled for the host only. Click Start; confirm both browsers transition to the live scoreboard simultaneously. Throw a dart as the host in browser 1: confirm it appears in both browsers' history/score, and that browser 2's board is disabled (not their turn) while browser 1's remains enabled — then flips after the throw. Play out a full leg-ending checkout and confirm both browsers still show it in their history despite the leg number advancing. Play out a full match to completion and confirm both browsers show `PostMatchStats` (already game-agnostic from M2, unmodified here). Also verify: closing and reopening the tab mid-match resumes correctly from persisted state (reconnection).

- [ ] **Step 6: Full suite + typecheck**

Run: `npx tsc --noEmit && npx vitest run`
Expected: tsc clean; 66/66 tests passing.

- [ ] **Step 7: Regression-check local play**

From the dashboard, click "New Match" (local), play a few darts, confirm it behaves exactly as before M3 (no lobby screen, no network calls to the new remote routes — check the browser's network tab shows no `/throws`/`/undo`/`ably` requests during local play).

- [ ] **Step 8: Commit**

```bash
git add "app/(match)/match/[id]/page.tsx" store/match.ts
git commit -m "feat(remote): wire match page into lobby/live/complete states for remote play"
```
