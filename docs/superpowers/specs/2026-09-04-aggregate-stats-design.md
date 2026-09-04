# Aggregate Stats Page Design

**Date:** 2026-09-04
**Status:** Approved for implementation
**Parent spec:** [2026-09-01-oche-mvp-architecture.md](2026-09-01-oche-mvp-architecture.md) (section 8, M5–M7 — third of five sub-projects this phase decomposes into; PWA and share images shipped, live drawer shipped)

## 1. Scope

A page showing stats aggregated across a signed-in player's past matches, distinct from `PostMatchStats` (single match, at completion) and `LiveStatsDrawer` (single match, live) — both already shipped this session.

**Investigation finding this spec is built on** (verified directly against the code, not assumed from earlier notes): three real gaps block this feature, not just the one originally flagged.

1. **Local matches are never marked complete in the database.** `Match.create` happens once at match start (`status: 'live'`) and nothing ever updates it again — `state`, `winnerId`, `completedAt` are never written for local matches. A finished local match is a permanent "live" record with no data, indistinguishable from an abandoned one.
2. **Local matches record no queryable owner.** Only a display-name string is stored (`{name, isGuest}`) — no `userId`. Even fixing #1, there's no persistent identity to query "this account's local matches" by.
3. **No aggregate route or page exists.** `lib/stats/engine.ts`/`lib/stats/types.ts` looked like a plausible starting point but are dead scaffolding from early planning (`// TODO: M2 implementation`, never finished) — never imported anywhere in the app. The actual working stats architecture is the per-`GameModule` `matchStats`/`computeStats`/`heatmap` functions, already used by `PostMatchStats` and `LiveStatsDrawer`.

**Also verified:** `gameState.visitHistory` (confirmed for both X01 and Cricket engines) accumulates every visit for the *entire* match — it is never reset between legs. This means persisting only the final `state` at match completion is sufficient input to compute every stat `gameModule.matchStats`/`computeStats` can produce, retroactively. No per-throw `Visit` database records are needed for this feature — those remain a live-`undo`-only concern, unrelated to aggregate stats.

**Scope decision (confirmed):** aggregate stats is a signed-in-only feature. Anonymous (guest) local or remote play is unaffected — it continues to work exactly as today, it just doesn't appear in any later history view. Local mode does not gain a persistent guest-identity mechanism as part of this work.

**In scope:**
- Persisting local match completion (`state`, `winnerId`, `status`, `completedAt`) — the minimum fix needed, a single write at match end, no change to local mode's zero-latency per-throw play.
- A `userId` field on `Match`, set for local matches created by a signed-in user.
- A new `GET /api/matches/history` route computing per-match stats server-side via each match's own `gameModule`.
- A new `/stats` page: summary cards (matches played, win rate, current streak) plus a filterable match-history list, each row showing that match's own individually-correct headline stat.
- A minimal dashboard nav addition (sign-in link / history link) — without it, the new page is unreachable and there's currently no way to tell whether you're signed in at all.

**Explicitly out of scope:**
- A true weighted cross-match aggregate (e.g., a single combined 3-dart average across all matches, correctly weighted by darts thrown). Matches can have different settings (starting score, checkout rules), and mixing their raw visits into one `computeStats()` call risks misleading numbers when settings differ. This is a real, deliberately-scoped-out nuance, not an oversight — a future enhancement could group by matching settings before combining.
- Anonymous/guest history (per the scope decision above).
- Per-dart `Visit` record persistence for local matches (not needed — see the `visitHistory` finding above).
- A "replay a finished match" detail view — clicking a history row is not wired to anything beyond this scope; a natural future extension, not built now.
- Any change to remote matches' persistence (already fully correct — `state`/`winnerId`/`completedAt`/`status` are already written at completion in the throws route).

## 2. Persistence Fix

**`lib/db/models.ts`:** add `userId: String` to `MatchSchema` (top-level, alongside the existing `hostId`). Only meaningful for local matches (remote ownership is already queryable via `players[].userId`, present since M3).

**`app/api/matches/route.ts`'s local branch:** resolve the session once (already does, for the player-1 display name) and set `userId: session?.user?.id` on `Match.create` when a session exists; omit it for guests.

**New route `app/api/matches/[id]/complete/route.ts`:**
```ts
POST /api/matches/[id]/complete
Body: { state: unknown, winnerId: string }
```
- 400 if the match id is invalid or the body fails a basic shape check (`state` present, `winnerId` a string or null).
- 404 if no match exists.
- 400 if `match.mode !== 'local'` (this route exists only for local matches — remote matches already get this from the throws route) or `match.status !== 'live'` (idempotency guard: a second completion call, e.g. from a duplicate effect firing, is a no-op that returns 200 without re-writing).
- On success: sets `match.state`, `match.winnerId`, `match.status = 'complete'`, `match.completedAt = new Date()`, saves, returns `{ ok: true }`.
- No identity/ownership check. This is the first server route local mode ever calls, so there's no existing local-mode route to match precedent with — the decision is made fresh here: local play is single-device with no adversarial multi-party concern (unlike remote, where every route checks identity because a second real participant exists), and the match id is an unguessable ObjectId, so the risk profile is the same as any other unauthenticated-but-unguessable-URL action in this app.

**`app/(match)/match/[id]/page.tsx`:** after `handleThrow` applies a local-mode throw, if the resulting state's `gameModule.isComplete(newState)` is true and the match hasn't already been marked complete client-side this session, fire the completion POST (best-effort — catch and ignore network errors, matching how this project treats non-critical side effects like `publishMatchEvent`; a failed write here degrades to "this match doesn't show up in history," not a broken match).

**Whose `PlayerId` is "you" in a stored match, for stats purposes:**
- Remote: whichever `players[]` entry has `userId === session.user.id` — `identityIdOf(that player)` is already the exact `PlayerId` string used in `state.players` (established in M3's start route).
- Local: `player1` by convention — this already matches local match creation's existing pattern of naming the first player from `session.user.name` when signed in. Not a new invention.

## 3. Aggregate API

**New file `lib/matchHistory.ts`** — the actual logic, as plain functions taking already-fetched, already-loaded data (no Mongoose, no `getGameModule` async loading inside them), mirroring the established pattern in `lib/matchLobby.ts` (`canJoinLobby`/`canStartMatch`: pure functions the route calls, tested directly without a database). This project has no existing precedent for mocking Mongoose in a test — every other route's actual DB-touching code is thin and untested; the logic worth testing lives in extracted pure functions instead. This spec follows that same shape rather than inventing new test infrastructure:

```ts
export function resolveYourPlayerId(
  match: { mode: 'local' | 'remote'; players: { userId?: string; guestId?: string; name: string }[] },
  sessionUserId: string
): PlayerId | null {
  if (match.mode === 'local') return createPlayerId('player1');
  const you = match.players.find((p) => p.userId === sessionUserId);
  return you ? createPlayerId(identityIdOf(you)) : null;
}

export function summarize(results: { won: boolean }[] /* newest-first */): {
  played: number;
  wins: number;
  winRate: number;
  currentStreak: { type: 'win' | 'loss' | null; count: number };
} { /* ... */ }
```

**`GET /api/matches/history`** (the thin route, calling the above):
- 401 if no session.
- Optional query param `gameId` (one of the registered game ids) filters to that game only.
- Query: `Match.find({ status: 'complete', $or: [{ userId: session.user.id }, { 'players.userId': session.user.id } ] }, ...gameId filter).sort({ completedAt: -1 })`.
- For each match: `resolveYourPlayerId`, then load its `GameModule` via the existing `getGameModule(match.gameId)` registry lookup and compute:
  - `won: boolean` — `match.winnerId === youPlayerId`.
  - `headline: { label: string, value: string }` — `gameModule.statTiles[0]` applied to `gameModule.matchStats(match.state, youPlayerId, match.settings)`, exactly the same call `PostMatchStats`/`LiveStatsDrawer` already make.
  - `opponents: string[]` — for remote matches, the other players' names from `match.players`; empty for local (local's "Guest 2" isn't a meaningfully tracked identity).
  - A match where `resolveYourPlayerId` returns `null` (a remote match whose `players` somehow doesn't contain the session's `userId` — shouldn't happen given the query filter, but the query and this per-match resolution are two separate operations) is skipped rather than crashing the whole response.
- `summary`: `summarize(matches.map(m => ({won: m.won})))` — computed from the same fetched list, no separate query, no separate correctness surface to drift from the list itself.
- Response shape:
  ```ts
  {
    matches: {
      id: string;
      gameId: string;
      gameName: string;
      mode: 'local' | 'remote';
      completedAt: string; // ISO
      won: boolean;
      opponents: string[];
      headline: { label: string; value: string };
    }[];
    summary: {
      played: number;
      wins: number;
      winRate: number; // 0-1
      currentStreak: { type: 'win' | 'loss' | null; count: number };
    };
  }
  ```

## 4. Dashboard Nav Addition

`app/(dashboard)/page.tsx` currently has no way to tell whether you're signed in, and no link to anything besides starting a match. Add a small header row above the existing "OCHE" hero: `useSession()` (from `next-auth/react`, already available — `SessionProvider` wraps the app in `app/layout.tsx`) drives either a "Sign in" link (→ `/signin`, already exists) or the signed-in user's name plus a "History" link (→ `/stats`). This is the minimum needed to make the new page discoverable and to make sign-in state visible anywhere in the app for the first time.

## 5. The Page (`app/stats/page.tsx`)

- Redirects to `/signin` if unauthenticated (checked client-side via `useSession()`, matching this project's existing client-component-only page pattern — no middleware exists yet and adding one is out of scope).
- Fetches `GET /api/matches/history` (optionally re-fetching on a game-filter change).
- **Summary row:** three cards — Matches Played, Win Rate, Current Streak — same card/token visual language as `PostMatchStats`/`LiveStatsDrawer` (`rounded-2xl bg-slate`, bold uppercase `text-sisal` labels, big `font-display` numbers).
- **Filter:** a small pill row (reusing the exact `Pills` component pattern from the dashboard's settings picker) — "All Games" plus one pill per registered game id.
- **Match list:** one row per match — date, game name (with its icon), win/loss badge (`bg-double`/`bg-treble` tint, matching the app's established win/loss color language), opponents (remote only), and the headline stat value with its label.
- **Empty state:** "No completed matches yet — go play one." (no filler graphic, matches this project's plain-text empty-state precedent elsewhere).

## 6. Testing

- Unit tests for `lib/matchHistory.ts`'s `resolveYourPlayerId` (local → always `player1`; remote → matches the seated player whose `userId` equals the session id; remote with no matching player → `null`) and `summarize` (empty list; all wins; all losses; a mixed streak, newest-first, correctly stops counting at the first result that breaks the streak) — plain function tests, no database, no mocking, following `lib/matchLobby.test.ts`'s exact precedent.
- The two new routes (`/api/matches/[id]/complete`, `/api/matches/history`) stay thin — DB query plus a call into the tested pure functions — and are verified manually, the same as every other DB-touching route in this project (none of which have automated tests; the logic worth testing lives in the extracted functions instead).
- No automated UI tests for the page itself (this project's established precedent for UI-facing, non-logic-heavy work) — manual verification: play a local match to completion, confirm it appears in `/stats` with the correct headline stat and win/loss; play a remote match, confirm the opponent's name appears and "you" resolves to the correct side regardless of which seat you joined in; confirm an unauthenticated visit to `/stats` redirects to `/signin`; confirm the game filter narrows the list correctly.

## 7. Summary

Three real, verified gaps stood between "this feature" and "a hollow feature that only works for the minority of remote play": local matches were never marked complete, never recorded an owner, and no aggregate route existed. All three are fixed with the smallest change that's actually correct — one completion write (not per-throw), one new field, and reusing the exact same `matchStats`/`statTiles` machinery every other stats surface already trusts. The one deliberately-scoped-out piece (a true weighted multi-match aggregate across differing settings) is named explicitly rather than silently faked with a plain average.
