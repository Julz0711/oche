# M4: Cricket Design

**Date:** 2026-09-03
**Status:** Approved for implementation
**Parent spec:** [2026-09-01-oche-mvp-architecture.md](2026-09-01-oche-mvp-architecture.md) (section 8, M4)

## 1. Scope

M4 adds Cricket (Standard variant) as the app's second `GameModule`. Its purpose, per the parent spec, is to prove the `GameModule<TState, TSettings>` interface genuinely generalizes beyond X01 — every consumer built so far (the match page, `DartboardInput`, `PostMatchStats`, all of M3's remote-play routes, the Zustand store) has only ever been exercised by one implementation.

**In scope:**
- A Cricket engine (pure, tested, mirroring X01's file layout and testing rigor)
- A real fix to a design smell M3's final-review fix wave introduced: `lib/scoring.ts`'s `computePoints` is an X01-only sector×ring formula, called directly by both `DartboardInput.tsx` and the throws route — neither of which should know any game's scoring rules. This gets corrected as part of M4, not deferred, since Cricket is what exposes it.
- Cricket's own `ScoreboardSlot` (a per-player marks board), `statTiles`, and settings form (auto-rendered from its Zod schema, same as X01's)
- Wiring `lib/games/registry.ts`'s `cricket` loader to the real module (currently a stub that throws)

**Out of scope:**
- Cutthroat or any other Cricket variant
- Any change to the M3 remote-play routes' code — the entire point of the interface-discipline fix is that they need zero game-specific changes to support a second game. If this milestone finds a route needs Cricket-specific logic, that's a spec defect to correct before implementation, not something to route around.
- Configurable numbers-in-play (fixed at 20/19/18/17/16/15/Bull, per Standard Cricket rules)
- Sets (X01's optional multi-set structure) — Cricket uses the same single-tier "first to N legs" structure X01 already has, nothing beyond it

## 2. The Interface-Discipline Fix (not an interface change)

**The problem, found during this milestone's brainstorming:** M3's final whole-branch review found that the throws route trusted a client-supplied `points` value (a real scoring-forgery vulnerability) and fixed it by adding `lib/scoring.ts::computePoints(sector, ring)` — an X01-only sector×ring multiplication — called both by `DartboardInput.tsx` (to fill in `points` before calling `onThrow`) and by the throws route (to recompute and override the client's value as an anti-cheat measure). Cricket's scoring has no such formula: the same triple-20 throw is worth 60 points, 0 points, or nothing at all depending on whether 20 is open, closed by this player, or closed by everyone — it depends on match state, not just sector+ring.

**The fix:** no `GameModule` method signature changes. Every engine's `applyThrow(state, throw_, settings)` must derive the actual score from `throw_.sector` + `throw_.ring` + its own `state` internally, and must never read `throw_.points` as an input. This is an implementation-discipline contract, not a new interface member — `Throw.points` stays in the shared type (still useful as a computed, denormalized field on the *output* state, e.g. for `DartBadge` display and `Visit` persistence), but no engine may treat an *incoming* throw's `points` field as authoritative.

Concretely:
- `lib/games/x01/engine.ts` gets a small, additive fix: instead of summing `dart.points` verbatim (its current behavior), it computes each dart's points from `dart.sector`/`dart.ring` itself (the same S/D/T sector-multiply, OB=25, IB=50, M=0 formula `computePoints` already has) before using it.
- `lib/scoring.ts` and `lib/scoring.test.ts` are deleted — their only reason to exist was patching around engines that trusted incoming points. The route-level and client-level recomputation step they enabled is deleted too.
- `DartboardInput.tsx` stops computing points entirely: `throwSector`/`throwAt` call `onThrow` with `points: 0` (a throwaway placeholder — no engine will read it). This makes the component *fully* game-agnostic for the first time; before this fix, it silently assumed X01's scoring formula.
- `app/api/matches/[id]/throws/route.ts` keeps its existing lightweight shape validation (is `sector` a legal number, is `ring` one of the six valid `Ring` values) — this stays for basic API hygiene, not anti-cheat — but drops the "recompute and override points" step. Anti-cheat becomes a structural property: forging `points` does nothing for any engine, by construction, because no engine reads it.
- `lib/games/x01/engine.test.ts` and `matchThrows.test.ts` get their existing test cases that construct `Throw` objects checked — most already set a correct `points` value matching the S/D/T formula (since they were written against real scoring), but any that rely on an *incorrect* `points` value being trusted (there shouldn't be any, since the tests exist to verify correct engine behavior) will need it corrected, which the implementation plan should verify test-by-test rather than assume.

This directly fixes the underlying problem the whole milestone surfaced, rather than working around Cricket's incompatibility with `computePoints`.

## 3. Cricket Engine

New files, mirroring X01's layout exactly (`lib/games/x01/engine.ts` + `engine.test.ts`, `index.ts` + `index.test.ts`, `schema.ts`, `stats.ts`, `components.tsx`):

```
lib/games/cricket/
  engine.ts        # pure scoring engine: init, applyThrow, undo, isComplete, winner
  engine.test.ts
  schema.ts        # CricketSettingsSchema, CricketSettings, CricketDefaultSettings
  index.ts         # CricketModule: GameModule<CricketState, CricketSettings>
  index.test.ts
  stats.ts         # computeStats, statTiles (mirrors x01/stats.ts's shape, different metrics)
  components.tsx   # ScoreboardSlot (the marks board)
```

**Domain types:**

```ts
type CricketNumber = 20 | 19 | 18 | 17 | 16 | 15 | 'bull';
const CRICKET_NUMBERS: CricketNumber[] = [20, 19, 18, 17, 16, 15, 'bull'];

interface CricketState {
  players: PlayerId[];
  currentPlayerIndex: number;
  currentVisit: Throw[];
  marks: Record<PlayerId, Record<CricketNumber, 0 | 1 | 2 | 3>>;
  points: Record<PlayerId, number>;
  legsWon: Record<PlayerId, number>;
  currentLegNumber: number;
  matchComplete: boolean;
  winnerId: PlayerId | null;
  visitHistory: CricketVisitHistoryEntry[]; // mirrors X01's VisitHistoryEntry shape/fields
}

interface CricketSettings {
  firstTo: number; // legs; same field name and meaning as X01Settings.firstTo
}
```

No starting score, no check-in/check-out variants — Standard Cricket has neither.

**Scoring a single dart** (pure function, used inside `applyThrow`):
1. Map `(sector, ring)` to a `(number, marks)` pair: `sector` 15-20 with `ring` S/D/T → `(sector, 1|2|3)`; `ring === 'OB'` → `('bull', 1)`; `ring === 'IB'` → `('bull', 2)`; anything else (sector 1-14, or `ring === 'M'`) → no-op (0 marks, 0 points, always a legal throw).
2. Let `current = marks[thrower][number]` (0-3). Marks actually applied this dart = `min(marksFromDart, 3 - current)`; any remainder is "overflow" (e.g. throwing a triple at a number sitting at 2 marks: 1 mark closes it, 2 marks' worth overflow).
3. `marks[thrower][number] = min(3, current + marksFromDart)`.
4. Overflow marks score points **only if** the number is now closed by the thrower (marks reached 3) **and** at least one other player hasn't closed that number yet: `points[thrower] += overflow × faceValue(number)` where `faceValue('bull') = 25` and `faceValue(n) = n` otherwise. If the thrower hadn't already closed it before this dart (i.e., this dart is what closes it) but scores 0 overflow (exact 3 marks, no more), no points — this only ever scores when a dart *pushes past* an already-closed number.

**Leg/match completion:** after each visit, the leg ends if the on-throw player has closed all 7 numbers (`marks[player][n] === 3` for all `n`) **and** `points[player] >= points[opponent]` for every opponent. On leg end: increment `legsWon[player]`; if `legsWon[player] >= settings.firstTo`, `matchComplete = true`, `winnerId = player`; otherwise reset `marks`/`points` to zero for all players, advance `currentLegNumber`, advance turn — this mirrors X01's leg-transition shape in `engine.ts` closely enough that the two files should read as siblings, easing future review.

**`undo`:** pops the last `visitHistory` entry and restores `marks`/`points`/`legsWon`/`currentLegNumber`/`matchComplete`/`winnerId` from the entry's "before" snapshot fields — same pattern as X01's `undo`, which stores a full "before" snapshot on each `VisitHistoryEntry` for exactly this purpose.

**Testing:** table-driven tests mirroring `engine.test.ts`'s style — covering: a number reaching exactly 3 marks (no score), overflow scoring while opponent has it open, overflow scoring blocked once all players have closed it (the number goes "dead"), closing all 7 with insufficient points (leg does NOT end), closing all 7 with sufficient points (leg ends), a full match ending at `firstTo` legs, undo restoring a pre-leg-end state, and the leg-boundary case analogous to X01's `lastCompletedVisit` motivation — verify `lastCompletedVisit` (implemented identically to X01's: filter `visitHistory` by `playerId`, no leg filter, return the last entry) correctly returns a leg-ending visit even after `currentLegNumber` has advanced, exactly as documented in the `GameModule` interface's JSDoc.

## 4. GameModule Wiring (`lib/games/cricket/index.ts`)

Every accessor mirrors X01's `index.ts` pattern:
- `players`, `currentPlayer`, `visitProgress` — identical shape/logic to X01's (turn/visit bookkeeping is generic, not game-specific).
- `matchInfo` — `[{ label: 'Leg', value: String(state.currentLegNumber) }]`, same as X01.
- `visitHistory` — same current-leg filter pattern as X01's (`entry.legNumberBefore === state.currentLegNumber`), returning `{throws, scoreBefore, scoreAfter, busted: false}` (Cricket has no bust concept — always `false`) with `scoreBefore`/`scoreAfter` being the player's `points` total before/after the visit (ascending, unlike X01's descending remaining score — the accessor's contract doesn't care about direction, it's just "a number that changed").
- `heatmap` — identical implementation to X01's (`${ring}${sector}` hit counts) — this accessor has no game-specific content at all, and Cricket's board-click-driven heatmap should visually work identically to X01's out of the box.
- `lastCompletedVisit` — same pattern as X01's (no leg filter, `isCheckout: false` always — Cricket has no checkout concept, but the field must still be present since it's part of the shared return shape).
- `matchStats`/`computeStats`/`statTiles` — Cricket-specific: `statTiles` = `[MPR, Total Marks, Points Scored, Numbers Closed]` (4 tiles, mirroring X01's `statTiles.length === 6` but with Cricket's own metrics — MPR is `(total marks / darts thrown) × 3`, the Cricket-standard "3-dart average" analog).
- `ScoreboardSlot` — the marks-board component (section 5).
- `primaryMetric` — `{ label: 'Points', value: state.points[playerId].toString() }`.

## 5. Cricket UI: Marks Board

`lib/games/cricket/components.tsx`'s `ScoreboardSlot` renders one row per `CRICKET_NUMBERS` entry (20 down to 15, then Bull), each showing that player's 0-3 marks as three small indicator segments (open circle → filled circle → an X/closed mark once at 3), using only existing tokens (`--wire` for filled/open marks, `--double` or a closed-state treatment for a fully-closed number — exact color choice is an implementation detail, not a new token), plus the player's running `points` total at the bottom. Rendered in the match page's existing top-row `ScoreboardSlot` slots — no match-page layout change needed, this is purely what X01's `ScoreboardSlot` is replaced with when Cricket is the active module.

`statTiles` (4, per §4) render via `PostMatchStats`'s existing generic `gameModule.statTiles.map(...)` loop (M2's design) — no changes needed there either, confirming that consumer's genericity too.

## 6. Registry Wiring

`lib/games/registry.ts`'s `cricket` entry currently throws `'Cricket not implemented yet'`. Changes to:

```ts
cricket: async () => import('./cricket').then((m) => m.default),
```

matching the `x01` entry's exact pattern.

## 7. Testing

- Cricket engine: table-driven unit tests per §3, mirroring X01's `engine.test.ts` rigor (`~40` tests for X01; Cricket's rule surface is comparably sized — closing, overflow scoring, the "dead number" case, leg/match completion, undo).
- `lib/games/x01/engine.ts`'s interface-discipline fix (§2) needs its own test: a throw constructed with a *wrong* `points` value must still score correctly, proving the engine truly ignores the input field rather than merely happening to receive correct values in existing tests.
- No changes needed to any M3 remote-play route's tests — if implementation reveals a route needs a Cricket-specific change, that is a spec defect to raise before continuing, not something to patch around silently.
- Manual verification: play a full local Cricket match end-to-end (closing numbers, scoring overflow, winning), then a full remote Cricket match (proving M3's routes are genuinely game-agnostic) — this second check is the actual payoff this milestone exists to deliver.

## 8. Summary

M4's real work is smaller than "build a second game" suggests: the Cricket engine itself is a contained, well-precedented pure-function exercise mirroring X01's shape closely, and every UI/route consumer built in M0-M3 needs zero changes *except* for one interface-discipline fix that M3's own final-review fix wave introduced (X01-only scoring logic leaking into supposedly generic route/UI code). Fixing that properly, then building Cricket against the now-genuinely-generic contract, is what proves the `GameModule` interface actually generalizes — which is the entire stated purpose of this milestone.
