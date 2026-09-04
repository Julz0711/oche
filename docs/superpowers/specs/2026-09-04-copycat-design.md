# Copycat Game Module Design

**Date:** 2026-09-04
**Status:** Approved for implementation
**Parent spec:** [2026-09-01-oche-mvp-architecture.md](2026-09-01-oche-mvp-architecture.md) — a new third `GameModule`, following the exact contract proven twice already (X01, then Cricket in M4, which proved the interface generalizes with zero changes to M3's routes).

## 1. Scope

A new darts variant: players chase a shared target total, taking turns trying to match the previous player's visit total. Whoever matches scores a point and leads the next round.

**Rules, as clarified during brainstorming** (the original one-line description had several real ambiguities, resolved below rather than guessed):

- A **visit** is up to 3 darts, exactly like X01/Cricket. The unit being matched is a visit's **total point value** (e.g. T20 = 60), not the exact sector+ring — a double-10 (20) matches a single-20 (20), since they're the same total.
- The very first visit of a new point has no target yet — it sets one **unconditionally**, regardless of value.
- Every subsequent visit is compared to the current target:
  - **Doesn't match**: no point scored. That visit's own total becomes the new target ("chase" — the target keeps changing, back and forth, until two consecutive visits land the same total).
  - **Matches, not on match-point**: the point is scored immediately.
  - **Matches, on match-point** (this player is at `firstTo - 1` points — winning this point wins the match): the point only counts if the visit's **last dart landed on a double or the inner bull** (X01's checkout convention). If it matches but wasn't a qualifying finish, **no point is scored** — the chase continues with this total as the new target, exactly as if it hadn't matched. This is a deliberate ruling (confirmed during brainstorming): not a bust, not a consolation point, just "doesn't count yet."
- Whoever scores a point **leads the next point** — they throw the next (unconditional, target-setting) visit themselves, then turn order continues normally to the next player as responder. This generalizes cleanly to 2–8 players: with exactly 2, it's "loser responds, winner leads next"; with more, the chase cycles through everyone in turn order until someone matches the immediately-preceding total.
- Match ends when a player reaches `firstTo` points (options: 3, 5, 7, 9).

**In scope:** the full engine (state, `applyThrow`, `undo`), schema, stats, `ScoreboardSlot`, registry wiring — matching every other `GameModule` exactly. 2–8 players (online), 2 players (local, matching the existing local-mode cap).

**Out of scope:**
- A `HistoryPanel` override — the generic dart-by-dart history (already generic across every game) is reused as-is for v1. A "this visit matched the target" visual highlight is a plausible follow-up, not required now.
- Any settings beyond `firstTo` and `firstThrow` (no handicaps, no per-player targets).

## 2. Engine State

```ts
export interface CopycatState {
  players: PlayerId[];
  currentPlayerIndex: number;
  currentVisit: Throw[];
  /** The total the current visit must match. null only for the very first visit of a new
   *  point (that visit sets a fresh target unconditionally, whatever it is). */
  target: number | null;
  pointsWon: Record<PlayerId, number>;
  matchComplete: boolean;
  winnerId: PlayerId | null;
  visitHistory: CopycatVisitHistoryEntry[]; // never reset — spans the whole match, same
                                              // convention X01/Cricket already use
}

interface CopycatVisitHistoryEntry {
  playerId: PlayerId;
  throws: Throw[];
  total: number;                 // this visit's sum
  targetBefore: number | null;   // what they were trying to match (null = unconditional throw)
  wasPointWin: boolean;          // did this visit actually score the point
  // Snapshot fields for undo — mirrors X01/Cricket's exact pattern (full pre-visit state,
  // restored verbatim rather than reverse-computed):
  targetBeforeState: number | null;
  pointsWonBefore: Record<PlayerId, number>;
  currentPlayerIndexBefore: number;
  matchCompleteBefore: boolean;
  winnerIdBefore: PlayerId | null;
}
```

`applyThrow` accumulates darts into `currentVisit` exactly like X01/Cricket (3 darts or fewer if the visit resolves early — but a visit here can only resolve at exactly 3 darts, since there's no way to know a visit "matched" until all 3 darts are thrown and summed; unlike X01's early-checkout, Copycat has no early resolution). At the 3rd dart:

1. Compute `total = sum of the visit's dart points`.
2. If `target === null` (unconditional throw): set `target = total`, advance `currentPlayerIndex` normally, record the history entry with `wasPointWin: false`.
3. Else if `total !== target`: same as above (chase continues, `target = total`, advance normally, `wasPointWin: false`).
4. Else (`total === target`, a numeric match):
   - Determine `isMatchPoint = pointsWon[currentPlayer] === settings.firstTo - 1`.
   - If not match-point: award the point (`pointsWon[currentPlayer] += 1`), check for match completion (`pointsWon[currentPlayer] >= firstTo` → `matchComplete = true`, `winnerId = currentPlayer`), and if the match continues, **do not advance `currentPlayerIndex`** — the winner leads next, so they stay in the current-player slot for their own unconditional throw, and `target` resets to `null`.
   - If match-point: check whether the visit's last dart was a double or inner bull. X01 has an equivalent private helper (`isDoubleRing`), but it's not exported, and game modules don't import each other's engine internals (X01 and Cricket don't, either) — Copycat defines its own trivial one-line equivalent (`dart.ring === 'D' || dart.ring === 'IB'`) rather than reaching into X01's file. If yes: award the point exactly as above (including match completion, since this IS the deciding point). If no: **not a win** — treat exactly like a non-match (`target = total`, advance normally, `wasPointWin: false`).

`undo` restores every snapshot field from the last history entry verbatim (`target`, `pointsWon`, `currentPlayerIndex`, `matchComplete`, `winnerId`), then drops that entry — the same restore-from-snapshot convention X01 and Cricket already use, not a reverse-computation.

## 3. Settings

```ts
export const CopycatSettingsSchema = z.object({
  firstTo: z.union([z.literal(3), z.literal(5), z.literal(7), z.literal(9)]),
  firstThrow: z.enum(['player1', 'random', 'bulloff', 'alternate']).default('alternate'),
});
export type CopycatSettings = z.infer<typeof CopycatSettingsSchema>;
export const CopycatDefaultSettings: CopycatSettings = { firstTo: 3, firstThrow: 'alternate' };
```

`firstThrow` is implemented with the exact same depth X01 already has (verified directly in `lib/games/x01/engine.ts`): only `'random'` picks a random starting index; `'player1'`, `'bulloff'`, and `'alternate'` all default to index 0. This isn't a shortcut specific to Copycat — it's matching what X01 itself actually does today, despite its fuller-looking enum.

`playerRange: [2, 8]`, matching X01/Cricket.

## 4. Stats & UI

**Reused generically, no new code needed:**
- `raceProgress`: `legs = pointsWon[playerId]`, `legsTarget = firstTo`, `sets`/`setsTarget` always 0 (Copycat has no sets concept) — the shared `MatchInfoPanel`'s per-player progress bars render immediately.
- `matchInfo`: adds `{ label: 'Target', value: target !== null ? String(target) : '—' }` alongside whatever else that panel shows — visible in the same shared panel next to the race bars, no new component.
- `primaryMetric`: `{ label: 'Points', value: String(pointsWon[playerId]) }`.

**New, Copycat-specific:**
- `ScoreboardSlot`: name, current-turn indicator (same `Crosshair` convention as X01/Cricket), Points as a big `Numeral` (matching X01's remaining-score / Cricket's points pattern) — deliberately lean, since the progress bar and target already render elsewhere generically.
- `statTiles` / `computeStats` / `matchStats`:
  - **Points** (headline, `statTiles[0]`) — matches the established "first tile is the headline stat" convention (3-dart avg for X01, MPR for Cricket).
  - **Match %** — visits that hit the target, divided by visits attempted against a real (non-null) target.
  - **Avg Visit** — mean visit total across the whole match.
  - **Double Finishes** — count of points actually won via the match-point double-finish path.
- No `HistoryPanel` override (see Scope) — the generic per-visit dart-badge history is reused as-is.

## 5. Registry

`lib/games/registry.ts` gains `copycat: async () => import('./copycat').then((m) => m.default)`, matching X01/Cricket's exact lazy-loading pattern. `id: 'copycat'`, `name: 'Copycat'`, icon: `Repeat` from `lucide-react` (verified it exists in this project's installed version) — fits the "match what came before" concept without colliding with `Dices` (X01) or `Target` (Cricket). Not `Copy`, since that icon is already established elsewhere in this app (`MatchLobby.tsx`'s copy-link button) for a distinct "copy to clipboard" meaning — reusing it here for the game icon would risk visual confusion.

## 6. Testing

Following X01/Cricket's exact precedent (`lib/games/x01/engine.test.ts`, `lib/games/cricket/engine.test.ts` — pure engine tests, no mocking, direct `init`/`applyThrow`/`undo` calls):
- Unconditional first-of-point throw sets `target` regardless of value.
- A non-matching visit becomes the new target; turn advances normally.
- A matching visit not on match-point scores the point immediately; winner does not advance (leads next).
- A matching visit *on* match-point with a qualifying double/inner-bull finish wins the point and the match (when it's the final point).
- A matching visit on match-point *without* a qualifying finish scores nothing; that total becomes the new target, chase continues.
- Match completion sets `matchComplete`/`winnerId` correctly.
- `undo` restores `target`, `pointsWon`, `currentPlayerIndex`, `matchComplete`, `winnerId` exactly to their pre-visit values, across both a normal chase-continuation visit and a point-winning visit.
- 3+ player rotation: after a point is won by a player who isn't first in the array, the next unconditional throw is genuinely theirs (index doesn't just advance to +1), and the responder cycle correctly skips them and continues in order.

## 7. Summary

A new `GameModule` implementing a "matching chase" variant, reusing the project's established engine conventions (visit-based, full-match `visitHistory`, snapshot-based undo) and — notably — reusing *most* of the generic UI/stats infrastructure already built for X01 and Cricket (`raceProgress`, `matchInfo`, the generic `HistoryPanel`) with almost no new UI code, since `pointsWon`/`firstTo` map directly onto the same "legs" race-progress concept every other game already exposes. The one deliberate ruling made during design — a match-point numeric match without a qualifying double-finish scores nothing, rather than a consolation point — is recorded here explicitly rather than assumed.
