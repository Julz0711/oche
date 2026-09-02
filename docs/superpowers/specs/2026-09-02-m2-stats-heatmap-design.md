# M2: Single-Match Stats & Heat Map Design

**Status:** Approved in conversation (post-match scope + in-place UI + heatmap redesign); this document is the written record for review before implementation planning.

**Parent spec:** `docs/superpowers/specs/2026-09-01-oche-mvp-architecture.md`

## 1. Scope

M2, per the parent spec, is "stats engine, post-match screen, heat map." The parent spec's `computeAggregateStats(visits, gameModule)` design assumes a persisted visit log spanning multiple matches (scopes: match/last5/last10/last25/last50/all). That persistence layer does not exist yet — M1-8 explicitly deferred per-dart Mongo writes as out of scope, and nothing currently converts a played match into stored `Visit` documents.

**Ruling (confirmed with the user):** M2 is scoped to **single-match stats only**, computed entirely from data already held in memory when a match ends (`X01State`'s own visit history). Aggregate/historical stats across multiple stored matches — the `computeAggregateStats`/scope-selector machinery the parent spec describes — becomes a distinct future milestone, gated on building real match/visit persistence. This document does not design that milestone; it only makes sure nothing built here forecloses it.

## 2. Post-match screen

**Trigger and placement:** when `gameModule.isComplete(state)` becomes true, the match page transitions **in place** — no new route, no navigation. The existing small "Match Complete!" banner is replaced by a full stats view rendered where the dartboard/keypad currently sit. The Score panels and Undo header stay as they are (Undo becomes irrelevant once complete, so it's hidden rather than shown disabled — a completed match has nothing left to undo).

**Content, per player, side by side:**
- The existing four `statTiles` (3-dart average, checkout %, darts/leg, best leg).
- Two additional fields `X01Stats` already computes but nothing currently displays: highest checkout, doubles/trebles hit rate.
- That player's full-match heat map (see section 3).

**Winner treatment:** the winning player's card gets a visual distinction (reusing the existing gold "active" treatment language from the live match UI, repurposed here to mean "won" instead of "on throw" — same visual vocabulary, different meaning, no new color needed).

## 3. Stats computation: a new `GameModule` method, not a repurposed `computeStats`

`GameModule.computeStats: (visits: Visit[], settings: TSettings) => GameStats` already exists in the interface, but its `Visit[]` parameter is the *persisted*, DB-shaped type (`matchId`, `_id`, `enteredBy`, etc.) — exactly what M3+'s real aggregate-stats work will eventually feed it, once persistence exists. Forcing this M2 work through that signature would mean fabricating fake `Visit` documents from `X01State`'s native `visitHistory` (which has a different shape — `legNumberBefore` instead of `legId`, no match/player-entry metadata) just to satisfy a type, and then reworking it again when real persistence lands.

**Decision:** add a new `GameModule` method instead, following the same pattern established in M1 for `matchInfo`/`visitHistory`/`heatmap` (accessors that read `TState` directly, no DB shape involved):

```typescript
matchStats: (state: TState, playerId: PlayerId, settings: TSettings) => GameStats;
```

X01 implements this by walking `state.visitHistory` (the engine's own `VisitHistoryEntry[]`, already used by `visitHistory`/`heatmap`) with the same logic `computeStats` already has for `Visit[]`, adapted to the native shape. `computeStats` itself is left in place, unused, for when real persistence lands — this document doesn't remove or repurpose it.

**Bug fixed in the same pass:** `checkoutRate`'s formula (`checkoutHits / (checkoutHits + bustedVisits)`) is wrong — most busts aren't checkout attempts (a bust at 380 remaining has nothing to do with finishing), and a non-busting missed double is never counted at all. This was found and deliberately deferred during the M1 final review, on the grounds that nothing displayed it yet. Now that this screen is the first place a user will actually see it, it gets fixed as part of `matchStats`'s implementation: a "checkout attempt" should mean *a dart thrown when the remaining score was within checkout range for the active `checkOut` mode* (e.g., ≤170 with three darts left under double-out, or more precisely: any dart where hitting it would leave exactly 0 was numerically possible), not "any bust anywhere." Given `Throw` objects don't carry the running score at the time they were thrown, the practical implementation walks `visitHistory` entries' `scoreBefore`/`scoreAfter` pairs: a visit counts as a checkout *attempt* if `scoreBefore` was checkout-reachable (≤ 170 for a 3-dart visit under any current mode, the maximum any finish can cover) **and** the visit's last dart was aimed at finishing (i.e., `scoreAfter === 0` would have been possible) — concretely, an attempt is any visit where `scoreBefore <= 170`, and a hit is one where `scoreAfter === 0`. This is a simpler, correct proxy: it slightly over-counts "attempts" (a player might have 170 remaining and simply not go for it), but that imprecision already exists in real-world checkout-percentage conventions used by professional scorers, and is a defensible, correct-in-spirit fix — nothing like the current formula's outright wrong "every bust counts" behavior.

## 4. Heat map redesign

The current heat map (built during M1's UI-polish rounds) shades each ring segment's own gameplay color (green for double, red for treble, etc.) by opacity based on hit count. Per direct user feedback, referencing a football/soccer player heat map (blue-to-red density gradient over a neutral pitch), this doesn't read as a density visualization — it reads as "this color is slightly more or less visible."

**Redesign:**
- **Board structure becomes neutral.** Every ring band (double, treble, both single bands) and both bulls render in shades of grey instead of their gameplay colors, so the board's shape stays legible without competing with the heat overlay for attention. Greys are derived from the existing 7 tokens via `color-mix()` (e.g., blending `--chalk` and `--oche` at different ratios) — no new "grey" tokens needed, consistent with how the page background glow was already done in an earlier round.
- **Heat uses a dedicated blue→red scale, layered on top.** This requires real blue, which none of the 7 existing brand/gameplay tokens provide (`oche`, `slate`, `chalk`, `sisal`, `wire`, `treble`, `double` — no blue). **New tokens are needed**, scoped explicitly to data visualization, not brand/UI chrome: a short blue→cyan→yellow→orange→red ramp (4–5 stops), defined as their own CSS custom properties (e.g. `--heat-cold`, `--heat-mid`, `--heat-hot`) alongside the existing 7 in `globals.css`/`tailwind.config.ts`, clearly documented as "heat-scale only, never used for UI chrome." This is a deliberate, narrow exception to the "7 tokens only" rule that's held throughout M0/M1 — data-visualization color scales are conventionally distinct from brand palettes in most design systems (this exact blue-red convention is standard for density/heat maps generally, not just football), and no existing token combination can produce it.
- **Applies everywhere a heat map appears**: both the live in-match decorative board (currently shading the current player's whole-match hits) and the new post-match screen's per-player heat maps use the same rendering approach, sharing one component so they can't visually drift apart.
- **Implementation shape**: extract the current per-wedge SVG rendering (the `annularWedgePath`/`RADIUS`/`BOARD_ORDER` machinery already in `DartboardInput.tsx`) into a standalone, reusable presentational component (e.g. `HeatmapBoard`) that takes `heatmap: Record<string, number>` and renders the grey structure + blue-red overlay. The board has been purely decorative (no click handlers) since the numeric-keypad rewrite earlier in M1's polish rounds, so this is a clean extraction: `DartboardInput` renders `HeatmapBoard` above its own (unrelated, already-separate) keypad, and the post-match screen renders `HeatmapBoard` twice, once per player, with no other changes needed to either consumer's own interaction logic.

## 5. What this does NOT include (explicitly out of scope for M2)

- Real Mongo persistence of matches/visits (a future milestone).
- Aggregate/historical stats across multiple matches, `computeAggregateStats`, scope selectors (match/last5/.../all) — all gated on the above.
- Any change to `lib/stats/engine.ts`'s existing stubs — they remain unused stubs, unchanged, still waiting on real persisted data.
- Cricket or any second game module (M4, per the parent spec's own sequencing — stats views should stay generic, but nothing here needs to *prove* that with a second game yet).

## 6. Board click-to-throw, restored alongside the keypad

**Context:** the dartboard was click-to-throw in an earlier M1 polish round, then the user asked for it to be replaced with a numeric keypad (tapping was unpleasant and the board's numbers were misaligned at the time). Since then the board has been fixed — real segment ordering, correct sizing, proper wedge geometry, dividing lines. The user has now asked whether board-clicking can come back, confirmed as an *addition* to the keypad, not a replacement: both remain available, whichever is faster in the moment.

**Design:** `HeatmapBoard` (section 4) stays purely decorative with no click handlers — it's shared with the post-match screen, which must never be interactive. `DartboardInput` (the live in-match component) layers a transparent, click-only overlay of the same wedge shapes on top of the rendered `HeatmapBoard`, reusing the same geometry-generating logic (`annularWedgePath`, `RADIUS`, `BOARD_ORDER`) so the two layers can never visually drift apart. Clicking a wedge fires the same `onThrow` callback the keypad already uses, computing sector/ring/points identically to how the keypad's number+modifier combination does today — including the same guard against an impossible "triple bull" click. The current DOUBLE/TRIPLE modifier toggle applies to board clicks exactly as it does to keypad taps (clicking sector 20 while DOUBLE is active scores a D20, the same as pressing "20" on the keypad with DOUBLE active) — one shared `throwSector`-style function serves both input paths, rather than two separate implementations of the same scoring logic.

**Bull region:** the outer/inner bull click regions reuse the same two concentric circles `HeatmapBoard` already renders, matching the same 25/50-point split and the same triple-bull guard (clicking the bull while TRIPLE is active does nothing, exactly like the keypad's BULL button).

## 7. Testing

- `matchStats` (X01's implementation) gets a table-driven unit test suite analogous to `engine.test.ts`'s style: hand-constructed `X01State.visitHistory` fixtures covering the corrected `checkoutRate` logic (a bust at 380 remaining does NOT count as an attempt; a bust at 100 remaining DOES; a non-bust visit ending exactly at 0 counts as a hit), plus regression coverage for the four pre-existing fields carried over from `computeStats`'s logic.
- `HeatmapBoard` is a pure presentational component; a couple of Storybook-style or direct-render sanity checks (does it render 20 segments + bulls, does an empty heatmap render the neutral-grey baseline with no heat) are enough — no need for exhaustive visual regression tooling given this MVP's existing testing posture (only the engine has real automated tests today).
- Manual/Playwright-driven verification of the post-match screen's actual rendered appearance, consistent with how every UI-facing fix this session has been verified.
- Board click-to-throw: Playwright-driven verification that clicking each ring band (single, double, treble, both bulls) fires the correct `Throw`, that the DOUBLE/TRIPLE toggle affects board clicks the same way it affects keypad taps, that a triple-bull click is blocked exactly like the keypad's BULL button, and that the post-match screen's `HeatmapBoard` instances remain fully inert (no `onThrow` firing) after a match completes.
