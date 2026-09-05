# Aggregate Stats Page Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [x]`) syntax for tracking.

**Goal:** Give a signed-in player a `/stats` page showing summary metrics (matches played, win rate, current streak) and a filterable history list across their past X01/Cricket/Copycat matches, by fixing the two real persistence gaps that block it (local matches are never marked complete, and never record an owner) and adding one new read-only aggregate route.

**Architecture:** Local-mode match completion gets a single best-effort POST at the moment `gameModule.isComplete` first goes true (mirroring what the remote throws route already does inline). A new `userId` field on `Match` records ownership for local matches created by a signed-in user. A pure-function module (`lib/matchHistory.ts`, no Mongoose) does the actual per-match "who are you / did you win" resolution and summary math, following the exact `lib/matchLobby.ts` precedent — the only thing this project already knows how to unit-test. Two new thin routes call into it. A new client page renders the result using the same `gameModule.matchStats`/`statTiles[0]` call every other stats surface (`PostMatchStats`, `LiveStatsDrawer`) already makes — no new stats machinery.

**Tech Stack:** TypeScript, Mongoose, Next.js App Router route handlers, Zustand (unused here), `next-auth/react`'s `useSession`, Vitest.

**Spec:** [2026-09-04-aggregate-stats-design.md](../specs/2026-09-04-aggregate-stats-design.md)

## Global Constraints

- Signed-in-only feature. Anonymous/guest local or remote play is unaffected and never appears in any history view — no persistent guest-identity mechanism is added.
- No per-dart `Visit` record persistence for local matches. `gameState.visitHistory` already accumulates every visit for the whole match (confirmed for both X01 and Cricket engines, never reset between legs) — persisting the final `state` at completion is sufficient input for every stat `gameModule.matchStats` can produce, retroactively.
- No true weighted cross-match aggregate (e.g. one combined 3-dart average across matches with different settings) — deliberately out of scope, not an oversight.
- No "replay a finished match" detail view, and no change to remote matches' persistence (already correct).
- Local mode's per-throw play must stay zero-latency — the completion write is a single best-effort POST fired once, at match end, not on every throw.
- The completion route (`/api/matches/[id]/complete`) has no identity/ownership check by design — local play is single-device with no adversarial multi-party concern, and the match id is an unguessable ObjectId. Do not add auth to this route.
- New pure logic goes in `lib/matchHistory.ts` and is unit-tested directly (no Mongoose mocking) — mirrors `lib/matchLobby.ts` / `lib/matchLobby.test.ts` exactly. The two new routes stay thin (DB query + call into the tested functions) and are verified manually, like every other DB-touching route in this project.

---

### Task 1: `userId` field + local match completion persistence

**Files:**
- Modify: `lib/db/models.ts` (add `userId: String` to `MatchSchema`)
- Modify: `app/api/matches/route.ts` (set `userId` on local match creation)
- Create: `app/api/matches/[id]/complete/route.ts`
- Modify: `app/(match)/match/[id]/page.tsx` (fire the completion POST once, local mode only)

**Interfaces:**
- Consumes: `Match` model (`lib/db/models.ts`), `gameModule.isComplete`/`winner` (already on every `GameModule`, see `lib/types.ts:146,150`).
- Produces: a local match's `Match` document now gets `status: 'complete'`, `state`, `winnerId`, `completedAt` written exactly once, at the moment the in-memory engine first reports the match complete. Later tasks' aggregate query relies on this.

- [x] **Step 1: Add `userId` to the schema**

In `lib/db/models.ts`, add one field to `MatchSchema` right after `hostId: String,`:

```ts
  hostId: String,
  userId: String,
```

- [x] **Step 2: Set `userId` when creating a local match**

In `app/api/matches/route.ts`, the local branch already resolves `session` (line `const session = await auth();`). Change the `Match.create` call from:

```ts
    const match = await Match.create({
      gameId,
      mode: 'local',
      status: 'live',
      settings,
      players: [
        { name: session?.user?.name || 'Guest 1', isGuest: !session },
        { name: 'Guest 2', isGuest: true },
      ],
    });
```

to:

```ts
    const match = await Match.create({
      gameId,
      mode: 'local',
      status: 'live',
      settings,
      userId: session?.user?.id,
      players: [
        { name: session?.user?.name || 'Guest 1', isGuest: !session },
        { name: 'Guest 2', isGuest: true },
      ],
    });
```

(`userId: undefined` when there's no session is fine — Mongoose omits `undefined` fields, matching how `hostId`/`roomCode` already behave for local matches.)

- [x] **Step 3: Write the completion route**

Create `app/api/matches/[id]/complete/route.ts`:

```ts
// app/api/matches/[id]/complete/route.ts
import { connectDB } from '@/lib/db';
import { Match } from '@/lib/db/models';
import { NextRequest, NextResponse } from 'next/server';
import mongoose from 'mongoose';

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
  const state = (body as { state?: unknown })?.state;
  const winnerId = (body as { winnerId?: unknown })?.winnerId;
  if (state === undefined || (typeof winnerId !== 'string' && winnerId !== null)) {
    return NextResponse.json({ error: 'Invalid body' }, { status: 400 });
  }

  await connectDB();
  const match = await Match.findById(id);
  if (!match) {
    return NextResponse.json({ error: 'Match not found' }, { status: 404 });
  }
  if (match.mode !== 'local') {
    return NextResponse.json({ error: 'This route is for local matches only' }, { status: 400 });
  }
  if (match.status !== 'live') {
    // Idempotency guard: a second completion call (e.g. a duplicate effect firing) is a no-op.
    return NextResponse.json({ ok: true });
  }

  match.state = state;
  match.winnerId = winnerId;
  match.status = 'complete';
  match.completedAt = new Date();
  await match.save();

  return NextResponse.json({ ok: true });
}
```

- [x] **Step 4: Fire the completion POST from the match page, once, local mode only**

In `app/(match)/match/[id]/page.tsx`, this component already imports `useEffect, useState, use` (line 3) and already computes `isComplete` (line 274: `const isComplete = gameModule.isComplete(gameState);`) and destructures `mode`/`matchId` is not currently destructured — `useMatchStore()` at line 173 destructures `mode, status, players: lobbyPlayers, you, hostId, throwError, roomCode` but not `matchId`; `matchId` is available separately via the `id` route param already in scope. Add a `useRef` guard so this fires at most once per page session, and add the effect right after the existing `handleUndo` definition (around line 240), before the `if (error)` early return:

```ts
  const completionSentRef = useRef(false);

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

Add `useRef` to the existing React import at the top of the file (currently `import { useEffect, useState, use } from 'react';` at line 3) — change it to `import { useEffect, useState, useRef, use } from 'react';`.

- [x] **Step 5: Manual verification**

Run `npm run dev`. Start a local X01 match (signed in), play it to completion. In a Mongo shell or Compass (or a quick `console.log` in the route while developing), confirm the `Match` document now has `status: 'complete'`, `winnerId` set, `completedAt` set, and `userId` matching your signed-in user id. Start a second local match as a guest (signed out) and confirm it still completes and plays normally (no crash from the missing `userId`), but its document has no `userId`.

- [x] **Step 6: Commit**

```bash
git add lib/db/models.ts app/api/matches/route.ts "app/api/matches/[id]/complete/route.ts" "app/(match)/match/[id]/page.tsx"
git commit -m "feat(stats): persist local match completion + userId ownership"
```

---

### Task 2: `lib/matchHistory.ts` — pure resolution/summary logic + tests

**Files:**
- Create: `lib/matchHistory.ts`
- Create: `lib/matchHistory.test.ts`

**Interfaces:**
- Consumes: `PlayerId`, `createPlayerId` (`@/lib/types`), `identityIdOf` (`@/lib/matchLobby`, already defined: `identityIdOf(player: MatchPlayerDoc): string`).
- Produces: `resolveYourPlayerId(match, sessionUserId): PlayerId | null` and `summarize(results: {won: boolean}[]): {played, wins, winRate, currentStreak}` — both consumed by Task 3's route.

- [x] **Step 1: Write the failing tests**

Create `lib/matchHistory.test.ts`:

```ts
// lib/matchHistory.test.ts
import { describe, it, expect } from 'vitest';
import { resolveYourPlayerId, summarize } from './matchHistory';
import { createPlayerId } from './types';

describe('resolveYourPlayerId', () => {
  it('local matches always resolve to player1', () => {
    const match = { mode: 'local' as const, players: [{ name: 'Guest 1', isGuest: false }] };
    expect(resolveYourPlayerId(match, 'u1')).toBe(createPlayerId('player1'));
  });

  it('remote matches resolve to the seated player whose userId matches the session', () => {
    const match = {
      mode: 'remote' as const,
      players: [
        { userId: 'u1', name: 'Alex' },
        { userId: 'u2', name: 'Sam' },
      ],
    };
    expect(resolveYourPlayerId(match, 'u2')).toBe(createPlayerId('u2'));
  });

  it('remote matches with no matching seated player resolve to null', () => {
    const match = {
      mode: 'remote' as const,
      players: [{ userId: 'u1', name: 'Alex' }],
    };
    expect(resolveYourPlayerId(match, 'u9')).toBe(null);
  });
});

describe('summarize', () => {
  it('handles an empty list', () => {
    expect(summarize([])).toEqual({
      played: 0,
      wins: 0,
      winRate: 0,
      currentStreak: { type: null, count: 0 },
    });
  });

  it('handles all wins', () => {
    const results = [{ won: true }, { won: true }, { won: true }];
    expect(summarize(results)).toEqual({
      played: 3,
      wins: 3,
      winRate: 1,
      currentStreak: { type: 'win', count: 3 },
    });
  });

  it('handles all losses', () => {
    const results = [{ won: false }, { won: false }];
    expect(summarize(results)).toEqual({
      played: 2,
      wins: 0,
      winRate: 0,
      currentStreak: { type: 'loss', count: 2 },
    });
  });

  it('computes a mixed streak (newest-first), stopping at the first break', () => {
    // newest-first: win, win, loss, win — current streak is 2 wins, then it breaks at the loss
    const results = [{ won: true }, { won: true }, { won: false }, { won: true }];
    expect(summarize(results)).toEqual({
      played: 4,
      wins: 3,
      winRate: 0.75,
      currentStreak: { type: 'win', count: 2 },
    });
  });
});
```

- [x] **Step 2: Run tests to verify they fail**

Run: `npx vitest run lib/matchHistory.test.ts`
Expected: FAIL — `lib/matchHistory.ts` does not exist yet (`Cannot find module './matchHistory'` or similar).

- [x] **Step 3: Write the implementation**

Create `lib/matchHistory.ts`:

```ts
// lib/matchHistory.ts
import { createPlayerId, PlayerId } from './types';
import { identityIdOf, MatchPlayerDoc } from './matchLobby';

/** Which `PlayerId` in a stored match's `state.players` is "you", for stats purposes.
 *  Local matches always name the first player `player1` by convention (matching local match
 *  creation's existing pattern of naming the first seat from `session.user.name` when signed
 *  in). Remote matches resolve to whichever seated player's `userId` matches the session. */
export function resolveYourPlayerId(
  match: { mode: 'local' | 'remote'; players: MatchPlayerDoc[] },
  sessionUserId: string
): PlayerId | null {
  if (match.mode === 'local') return createPlayerId('player1');
  const you = match.players.find((p) => p.userId === sessionUserId);
  return you ? createPlayerId(identityIdOf(you)) : null;
}

/** Summarizes a newest-first list of match results into played/wins/winRate and the player's
 *  current streak (the run of identical results starting from the most recent match). */
export function summarize(results: { won: boolean }[]): {
  played: number;
  wins: number;
  winRate: number;
  currentStreak: { type: 'win' | 'loss' | null; count: number };
} {
  const played = results.length;
  const wins = results.filter((r) => r.won).length;
  const winRate = played === 0 ? 0 : wins / played;

  let currentStreak: { type: 'win' | 'loss' | null; count: number } = { type: null, count: 0 };
  if (played > 0) {
    const streakType: 'win' | 'loss' = results[0].won ? 'win' : 'loss';
    let count = 0;
    for (const result of results) {
      const resultType: 'win' | 'loss' = result.won ? 'win' : 'loss';
      if (resultType !== streakType) break;
      count += 1;
    }
    currentStreak = { type: streakType, count };
  }

  return { played, wins, winRate, currentStreak };
}
```

- [x] **Step 4: Run tests to verify they pass**

Run: `npx vitest run lib/matchHistory.test.ts`
Expected: PASS — 7 tests (3 for `resolveYourPlayerId`, 4 for `summarize`).

- [x] **Step 5: Commit**

```bash
git add lib/matchHistory.ts lib/matchHistory.test.ts
git commit -m "feat(stats): matchHistory — resolveYourPlayerId + summarize (pure, tested)"
```

---

### Task 3: `GET /api/matches/history` route

**Files:**
- Create: `app/api/matches/history/route.ts`

**Interfaces:**
- Consumes: `resolveYourPlayerId`, `summarize` (Task 2, `@/lib/matchHistory`), `getGameModule` (`@/lib/games/registry`), `gameModule.statTiles[0]`/`matchStats` (already on every `GameModule` — exact call shape confirmed in `components/organisms/PostMatchStats.tsx`: `gameModule.statTiles[0].label` and `gameModule.statTiles[0].value(gameModule.matchStats(state, playerId, settings))`), `identityIdOf` (`@/lib/matchLobby`).
- Produces: the JSON response shape below, consumed by Task 4's `/stats` page.

- [x] **Step 1: Write the route**

Create `app/api/matches/history/route.ts`:

```ts
// app/api/matches/history/route.ts
import { connectDB } from '@/lib/db';
import { Match } from '@/lib/db/models';
import { NextRequest, NextResponse } from 'next/server';
import { auth } from '@/lib/auth';
import { getGameModule, gameRegistry, GameId } from '@/lib/games/registry';
import { resolveYourPlayerId, summarize } from '@/lib/matchHistory';
import { identityIdOf, MatchPlayerDoc } from '@/lib/matchLobby';

export async function GET(req: NextRequest) {
  const session = await auth();
  if (!session?.user?.id) {
    return NextResponse.json({ error: 'Not signed in' }, { status: 401 });
  }

  const gameIdParam = req.nextUrl.searchParams.get('gameId');
  const gameIdFilter =
    gameIdParam && Object.prototype.hasOwnProperty.call(gameRegistry, gameIdParam)
      ? (gameIdParam as GameId)
      : null;

  await connectDB();

  const query: Record<string, unknown> = {
    status: 'complete',
    $or: [{ userId: session.user.id }, { 'players.userId': session.user.id }],
  };
  if (gameIdFilter) {
    query.gameId = gameIdFilter;
  }

  const docs = await Match.find(query).sort({ completedAt: -1 });

  const matches: {
    id: string;
    gameId: string;
    gameName: string;
    mode: 'local' | 'remote';
    completedAt: string;
    won: boolean;
    opponents: string[];
    headline: { label: string; value: string };
  }[] = [];

  for (const doc of docs) {
    const youPlayerId = resolveYourPlayerId(
      { mode: doc.mode, players: doc.players as MatchPlayerDoc[] },
      session.user.id
    );
    if (youPlayerId === null) continue;

    const gameModule = await getGameModule(doc.gameId as GameId);
    const stats = gameModule.matchStats(doc.state, youPlayerId, doc.settings);
    const headlineTile = gameModule.statTiles[0];

    const opponents =
      doc.mode === 'remote'
        ? (doc.players as MatchPlayerDoc[])
            .filter((p) => identityIdOf(p) !== youPlayerId)
            .map((p) => p.name)
        : [];

    matches.push({
      id: doc._id.toString(),
      gameId: doc.gameId,
      gameName: gameModule.name,
      mode: doc.mode,
      completedAt: (doc.completedAt as Date).toISOString(),
      won: doc.winnerId === youPlayerId,
      opponents,
      headline: { label: headlineTile.label, value: String(headlineTile.value(stats)) },
    });
  }

  const summary = summarize(matches.map((m) => ({ won: m.won })));

  return NextResponse.json({ matches, summary });
}
```

- [x] **Step 2: Manual verification**

Run `npm run dev`. Signed in, with at least one completed local match from Task 1's verification: `curl -s http://localhost:3000/api/matches/history -H "Cookie: <your session cookie>"` (or just visit the URL in a browser tab where you're already signed in — GET routes render as JSON directly). Confirm the response has the shape above, `matches` is sorted newest-first, and `summary.played`/`wins`/`winRate` match what you'd expect from the matches you've played. Confirm `?gameId=x01` narrows the list to only X01 matches. Confirm a signed-out request returns 401.

- [x] **Step 3: Commit**

```bash
git add "app/api/matches/history/route.ts"
git commit -m "feat(stats): GET /api/matches/history aggregate route"
```

---

### Task 4: Dashboard nav addition (sign-in / history link)

**Files:**
- Modify: `app/(dashboard)/page.tsx`

**Interfaces:**
- Consumes: `useSession` (`next-auth/react` — the app is already wrapped in `SessionProvider` at `app/layout.tsx`, but no client component has called `useSession` yet; this is the first).
- Produces: a visible "Sign in" link (unauthenticated) or the user's name + a "History" link to `/stats` (authenticated) — makes Task 5's page reachable.

- [x] **Step 1: Add the header row**

In `app/(dashboard)/page.tsx`, add `useSession` to the imports. The file currently starts:

```ts
'use client';
import { useRouter } from 'next/navigation';
import { useEffect, useState } from 'react';
import { Button } from '@/components/atoms/Button';
import { gameRegistry, GameId, getGameModule } from '@/lib/games/registry';
import { Users } from 'lucide-react';
import type { LucideIcon } from 'lucide-react';
import type { ReactNode } from 'react';
```

Change to add one import line:

```ts
'use client';
import { useRouter } from 'next/navigation';
import { useEffect, useState } from 'react';
import { useSession } from 'next-auth/react';
import Link from 'next/link';
import { Button } from '@/components/atoms/Button';
import { gameRegistry, GameId, getGameModule } from '@/lib/games/registry';
import { Users } from 'lucide-react';
import type { LucideIcon } from 'lucide-react';
import type { ReactNode } from 'react';
```

Inside `export default function Dashboard()`, add right after `const [creating, setCreating] = useState<'local' | 'remote' | null>(null);`:

```ts
  const { data: session } = useSession();
```

In the JSX, the current `<header>` block reads:

```tsx
        <header className="flex flex-col">
          <h1 className="text-2xl sm:text-3xl md:text-4xl font-display font-bold tracking-tight leading-none">
            OCHE
          </h1>
          <p className="text-sisal text-sm md:text-base mt-1">Pick a game, grab your darts</p>
        </header>
```

Replace it with:

```tsx
        <header className="flex flex-col gap-3">
          <div className="flex items-center justify-between">
            <span className="text-xs font-bold uppercase tracking-widest text-sisal">
              {session?.user ? session.user.name ?? 'Signed in' : 'Not signed in'}
            </span>
            {session?.user ? (
              <Link
                href="/stats"
                className="text-xs font-bold uppercase tracking-widest text-wire hover:text-chalk transition-colors"
              >
                History
              </Link>
            ) : (
              <Link
                href="/signin"
                className="text-xs font-bold uppercase tracking-widest text-wire hover:text-chalk transition-colors"
              >
                Sign in
              </Link>
            )}
          </div>
          <h1 className="text-2xl sm:text-3xl md:text-4xl font-display font-bold tracking-tight leading-none">
            OCHE
          </h1>
          <p className="text-sisal text-sm md:text-base mt-1">Pick a game, grab your darts</p>
        </header>
```

- [x] **Step 2: Verify types**

Run: `npx tsc --noEmit`
Expected: clean, no errors.

- [x] **Step 3: Manual verification**

Run `npm run dev`, open the dashboard signed out — confirm "Not signed in" and a "Sign in" link appear, and the link goes to the existing `/signin` page. Sign in, reload — confirm your name appears and a "History" link appears (it 404s until Task 5 lands — that's expected at this point in the plan).

- [x] **Step 4: Commit**

```bash
git add "app/(dashboard)/page.tsx"
git commit -m "feat(stats): dashboard sign-in state + history link"
```

---

### Task 5: `/stats` page

**Files:**
- Create: `app/stats/page.tsx`

**Interfaces:**
- Consumes: `GET /api/matches/history` (Task 3), `useSession` (`next-auth/react`), `gameRegistry`/`GameId` (`@/lib/games/registry`), the `Pills` component pattern (reimplemented locally here — the dashboard's `Pills` in `app/(dashboard)/page.tsx` is not exported, so this task defines its own copy rather than importing across route-group files, matching this project's existing precedent of small local UI helpers per page).
- Produces: the page itself — nothing else in the plan depends on this task's exports.

- [x] **Step 1: Write the page**

Create `app/stats/page.tsx`:

```tsx
// app/stats/page.tsx
'use client';
import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { useSession } from 'next-auth/react';
import { gameRegistry, GameId } from '@/lib/games/registry';

interface HistoryMatch {
  id: string;
  gameId: string;
  gameName: string;
  mode: 'local' | 'remote';
  completedAt: string;
  won: boolean;
  opponents: string[];
  headline: { label: string; value: string };
}

interface HistoryResponse {
  matches: HistoryMatch[];
  summary: {
    played: number;
    wins: number;
    winRate: number;
    currentStreak: { type: 'win' | 'loss' | null; count: number };
  };
}

function SummaryCard({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-2xl bg-slate p-4 flex flex-col gap-1">
      <span className="text-[11px] font-bold uppercase tracking-widest text-sisal">{label}</span>
      <span className="text-3xl font-display font-bold">{value}</span>
    </div>
  );
}

function GameFilterPills({ value, onChange }: { value: GameId | null; onChange: (value: GameId | null) => void }) {
  const gameIds = Object.keys(gameRegistry) as GameId[];
  return (
    <div className="flex gap-2 flex-wrap">
      <button
        type="button"
        onClick={() => onChange(null)}
        aria-pressed={value === null}
        className={`px-4 py-2 rounded-full text-sm font-bold transition-colors ${
          value === null ? 'bg-wire text-oche' : 'bg-oche text-sisal border border-sisal/30 hover:opacity-80'
        }`}
      >
        All Games
      </button>
      {gameIds.map((id) => (
        <button
          key={id}
          type="button"
          onClick={() => onChange(id)}
          aria-pressed={value === id}
          className={`px-4 py-2 rounded-full text-sm font-bold capitalize transition-colors ${
            value === id ? 'bg-wire text-oche' : 'bg-oche text-sisal border border-sisal/30 hover:opacity-80'
          }`}
        >
          {id}
        </button>
      ))}
    </div>
  );
}

export default function StatsPage() {
  const router = useRouter();
  const { data: session, status: sessionStatus } = useSession();
  const [data, setData] = useState<HistoryResponse | null>(null);
  const [gameFilter, setGameFilter] = useState<GameId | null>(null);

  useEffect(() => {
    if (sessionStatus === 'unauthenticated') {
      router.replace('/signin');
    }
  }, [sessionStatus, router]);

  useEffect(() => {
    if (sessionStatus !== 'authenticated') return;
    let cancelled = false;
    (async () => {
      const url = gameFilter ? `/api/matches/history?gameId=${gameFilter}` : '/api/matches/history';
      const res = await fetch(url);
      if (!res.ok || cancelled) return;
      const json = (await res.json()) as HistoryResponse;
      if (!cancelled) setData(json);
    })();
    return () => {
      cancelled = true;
    };
  }, [sessionStatus, gameFilter]);

  if (sessionStatus !== 'authenticated' || !session?.user) {
    return <div className="min-h-screen bg-oche text-chalk flex items-center justify-center">Loading...</div>;
  }

  return (
    <div className="min-h-screen bg-oche text-chalk p-4 md:p-8 flex flex-col items-center">
      <div className="w-full max-w-3xl flex flex-col gap-6 md:gap-8 pt-6 md:pt-12">
        <header className="flex flex-col">
          <h1 className="text-2xl sm:text-3xl md:text-4xl font-display font-bold tracking-tight leading-none">
            Your Stats
          </h1>
          <p className="text-sisal text-sm md:text-base mt-1">Every completed match, all in one place</p>
        </header>

        {data === null ? (
          <div className="grid grid-cols-3 gap-4">
            {[0, 1, 2].map((i) => (
              <div key={i} className="h-20 rounded-2xl bg-slate animate-pulse" />
            ))}
          </div>
        ) : (
          <>
            <div className="grid grid-cols-3 gap-4">
              <SummaryCard label="Matches Played" value={String(data.summary.played)} />
              <SummaryCard label="Win Rate" value={`${Math.round(data.summary.winRate * 100)}%`} />
              <SummaryCard
                label="Current Streak"
                value={
                  data.summary.currentStreak.type === null
                    ? '—'
                    : `${data.summary.currentStreak.count} ${data.summary.currentStreak.type === 'win' ? 'W' : 'L'}`
                }
              />
            </div>

            <GameFilterPills value={gameFilter} onChange={setGameFilter} />

            {data.matches.length === 0 ? (
              <p className="text-sisal text-center py-8">No completed matches yet — go play one.</p>
            ) : (
              <div className="flex flex-col gap-3">
                {data.matches.map((match) => (
                  <div
                    key={match.id}
                    className="rounded-2xl bg-slate p-4 flex items-center justify-between gap-4"
                  >
                    <div className="flex flex-col gap-1">
                      <div className="flex items-center gap-2">
                        <span
                          className={`text-[10px] font-bold uppercase tracking-widest rounded-full px-2.5 py-1 ${
                            match.won ? 'bg-double text-chalk' : 'bg-treble text-chalk'
                          }`}
                        >
                          {match.won ? 'Win' : 'Loss'}
                        </span>
                        <span className="font-bold capitalize">{match.gameName}</span>
                      </div>
                      <span className="text-xs text-sisal">
                        {new Date(match.completedAt).toLocaleDateString()}
                        {match.opponents.length > 0 ? ` · vs ${match.opponents.join(', ')}` : ''}
                      </span>
                    </div>
                    <div className="flex flex-col items-end gap-0.5">
                      <span className="text-[10px] font-bold uppercase tracking-widest text-sisal">
                        {match.headline.label}
                      </span>
                      <span className="text-lg font-display font-bold">{match.headline.value}</span>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </>
        )}
      </div>
    </div>
  );
}
```

- [x] **Step 2: Verify types**

Run: `npx tsc --noEmit`
Expected: clean, no errors.

- [x] **Step 3: Manual verification**

Run `npm run dev`. Visit `/stats` while signed out — confirm it redirects to `/signin`. Sign in, play a local match to completion (X01, Cricket, and/or Copycat), visit `/stats` (or click "History" from the dashboard) — confirm the summary cards and the match row appear with the correct win/loss badge and headline stat for that game. Play a remote match with a second browser/incognito window as a second player, complete it, confirm both participants see it in their own `/stats` with the opponent's name shown and the win/loss correctly assigned to each side regardless of which seat they joined in. Click each game filter pill and confirm the list narrows correctly; click "All Games" to confirm it resets.

- [x] **Step 4: Final regression check**

Run: `npx tsc --noEmit && npx vitest run`
Expected: clean, all tests passing (existing suite plus the 7 new `lib/matchHistory.test.ts` tests from Task 2 — no other test count change).

- [x] **Step 5: Commit**

```bash
git add app/stats/page.tsx
git commit -m "feat(stats): /stats aggregate history page"
```
