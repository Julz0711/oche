# Visual Identity Design

**Date:** 2026-09-06
**Status:** Approved for implementation
**Parent spec:** [2026-09-01-oche-mvp-architecture.md](2026-09-01-oche-mvp-architecture.md) (section 7, Design System & UI — this supersedes that section's visual direction while keeping its component-architecture rules)

## 1. Why

The MVP (M0–M7) is functionally complete, but the UI reads as generic — uniformly rounded cards, evenly spaced, flat surfaces on a flat ground, lucide icons throughout. That combination is the recognisable "AI-generated dashboard" look, and it is what this work replaces.

The problem is **not** the colour tokens. `oche`/`slate`/`chalk`/`sisal`/`wire`/`treble`/`double` are named after real darts materials and are worth keeping. The problem is the absence of a shape language, a hierarchy, and any texture or depth.

**Approved direction (chosen from three explored in a visual companion session):** a hybrid — **Broadcast structure with Venue geometry**. Angular cut corners, condensed uppercase display type, per-surface accent bars and diagonal scanlines, with crisp dartboard-derived SVG motifs sitting inside surfaces. Explicitly rejected during that session: fading/dissolving motifs (they read as smudges), and a single repeated dartboard on every card (reads as wallpaper).

Two user-reported defects are fixed **as part of this work**, because both are fundamentally hierarchy failures rather than logic bugs:

1. **Cricket "didn't end at 3 legs."** Investigated with a reproduction test: the engine is correct and completes a `firstTo: 3` match properly; settings plumbing is correct. The actual defect is that the panel's loudest element reads **"LEG 3"** — the leg being *played* — while the real win condition (`2/3`) renders at 9px. The two are indistinguishable at a glance and use the same number range.
2. **Copycat's target is too small.** It renders as 11px inline text inside a joined `matchInfo` string, despite being the single number the thrower needs.

## 2. Scope

**In scope — four surfaces, in this order:**
1. Dashboard / game picker (`app/(dashboard)/page.tsx`)
2. Match screen (`app/(match)/match/[id]/page.tsx`, all three games' `ScoreboardSlot`/`HistoryPanel`, `DartboardInput`)
3. Stats & post-match (`app/stats/page.tsx`, `PostMatchStats`, `LiveStatsDrawer`, `PlayerStatTiles`, `HeatmapBoard`)
4. Lobby & auth (`MatchLobby`, `app/(auth)/signin`, `signout`, `app/join/[code]`)

**Also in scope:** the two defects above; a shared token/primitive layer that all four surfaces are built from.

**Explicitly out of scope:**
- No new npm dependencies, and no image assets — every visual is CSS or inline SVG (decided in the design session).
- No changes to game engines, the `GameModule` contract's behavioural methods, persistence, or any API route. The one interface addition (§5.3) is presentational metadata only.
- No light theme (backlog item D3).
- No new game modes, no feature work of any kind. This is a visual pass.

## 3. Design tokens

### 3.1 Colour — one value change, otherwise re-assignment only

The palette is kept. Exactly **one token value changes**: `oche` is darkened from `#141A18` to `#101614`, so raised surfaces (`slate`) read as genuinely lifted off the ground rather than nearly the same colour. Every other token keeps its current value. What else changes is **assignment**:

| Role | Token | Notes |
|---|---|---|
| Ground | `oche` → `#101614` | The one value change (see above) |
| Surface | `slate` `#1E2724` | Raised surface; `#202B28` when active/hovered |
| Primary text | `chalk` | |
| Secondary text | `sisal` | Always at reduced opacity for meta text |
| X01 accent | `wire` | |
| Cricket accent | `double` | |
| Copycat accent | `treble` | **Changed** from `sisal`. See the caveat below. |

**Caveat on Copycat = `treble` (red):** `treble` is also the app's danger/bust colour. Game-identity accent and state colour are separate axes, and this is acceptable **only** because identity accents appear on identity surfaces (a game card, a page's motif) while `treble`-as-danger appears in state contexts (a bust, a destructive action). The rule to enforce: **on the match screen, a game's identity accent must never colour a score, a state chip, or any element whose colour could be read as "something went wrong."** If that becomes hard to hold, Copycat falls back to `sisal`.

### 3.2 Shape language

- **Cut corner, not radius.** Surfaces use `clip-path: polygon(0 0, 100% 0, 100% calc(100% - Npx), calc(100% - Npx) 100%, 0 100%)` — a notched bottom-right corner. `N` = 16px on cards, 13px on panels, 11px on insets.
- **Buttons** use a slanted right edge: `polygon(0 0, 100% 0, calc(100% - 10px) 100%, 0 100%)`.
- **Border radius is 0** everywhere else. This replaces the app's current `rounded-2xl`.
- **Accent bar:** every card carries a 5px top bar in its accent, growing to 9px on hover.

**Known constraint — clip-path clips borders, outlines and focus rings.** Two consequences the implementation must respect:
- Surfaces get their edge from background + `inset 0 1px 0 rgba(255,255,255,.06)` (a lit top edge) + a drop shadow, **not** from a `border`.
- **Focus rings must not be applied to a clipped element** — they would be visually cut off, which is an accessibility regression. Interactive clipped elements are wrapped in an unclipped parent that carries `focus-visible` styling, or use an inset ring drawn inside the clip. Every currently-focusable control must remain visibly focusable; this is a non-negotiable acceptance criterion.

### 3.3 Typography

| Role | Face | Usage |
|---|---|---|
| Display / numerals | **Barlow Condensed** (600/700) | Wordmark, game names, scores, targets, labels. Uppercase, tight leading. Replaces Bricolage Grotesque. |
| Body / meta | **Inter Tight** (400/500) | Descriptions, helper text, prose. Unchanged. |

Bricolage Grotesque is **removed** — one display face, used at genuinely large sizes, replaces it. Both faces load via `next/font/google` in `app/layout.tsx`, exactly as today (`--font-display` / `--font-sans`, already wired through `tailwind.config.ts`).

The rule that fixes the "timid" feeling: **sizes are either very large or very small, rarely in between.** Scores 56–72px; game names 28–30px; labels 8–10px uppercase with 0.2em tracking. Mid-sized text is the exception.

### 3.4 Spacing

The current UI is uniformly tight. Spacing increases roughly one step throughout: card padding 13→18px, grid gaps 9→14px, button padding 14→17px, space under the wordmark 18→26px. This is expressed as a scale so it can be tuned in one place rather than per-component.

### 3.5 Texture and motion

- **Scanlines:** `repeating-linear-gradient(115deg, rgba(255,255,255,.02) 0 2px, transparent 2px 9px)` over the page ground at 45% opacity. Subtle; adds tooth to large dark areas.
- **Hover:** surface lifts (`translateY(-4px)`), accent bar grows, motif brightens (0.24 → 0.44 opacity) and rotates 9°.
- **All motion must be disabled under `prefers-reduced-motion: reduce`.** Hover states then change colour/opacity only.

## 4. The motif family

Six inline-SVG motifs drawn from real darts anatomy, each carrying meaning rather than decorating:

| Motif | Meaning | Used on |
|---|---|---|
| **Board** | Full board, T20 lit in the treble band, D20 faint at the rim — the shot X01 revolves around | X01 card, X01 match surfaces |
| **Scoresheet** | Tally rows, closed numbers struck through, points bars — how Cricket is actually scored | Cricket card, Cricket surfaces |
| **Echo** | Two bullseyes, one solid and one dashed — the game *is* the echo | Copycat card, Copycat surfaces |
| **Spider** | Wire only, no rings — quiet enough to sit behind live scores | Match screen background |
| **Flights** | Scattered dart flights — celebratory | Stats, post-match |
| **Reticle** | Crosshair, dashed outer ring — aiming, not yet thrown | Lobby, waiting and empty states |

Rules:
- All use `currentColor`, so a motif inherits whatever accent its surface sets.
- **Crisp edges — no mask/fade.** A motif is cropped by the surface it sits behind, never dissolved into it.
- Default resting opacity **0.24**, hover **0.44**, and quieter (**0.17**) behind live match scores.

**The Board motif must be generated from `lib/dartboard-geometry.ts`** (`RADIUS`, `BOARD_ORDER`, `segmentAngles`, `annularWedgePath`) rather than hardcoding angles and radii a second time. This is not a style preference: during the design session, hand-authored geometry produced a board whose wires ran up the 12 o'clock centreline, so the lit T20 straddled a wire instead of filling a segment. The existing module already places segment 20 centred on 12 o'clock with wires at ±9°, which is correct. Deriving from it makes that class of bug impossible and keeps the decorative board and the interactive board from drifting apart.

## 5. Surface specifications

### 5.1 Dashboard

- Three game cards **in one row** (currently a 2-column grid). Each card: accent top bar, index (`01`/`02`/`03`), large condensed name, meta line, and its own motif cropped bottom-right.
- Below: settings panel and the two primary actions (Play Online / Play Local) as slant-edged buttons.
- **Responsive:** the three-in-a-row applies from `sm` up; on the narrowest widths cards stack. Condensed type must stay legible at small sizes — this is the main risk of a condensed face and must be checked on a real phone width.

### 5.2 Match screen — including the Cricket fix

- Score panels become the hero: player name at 9px uppercase, **score at 56–72px**, meta beneath.
- **Legs won render as flight-pips** (◆◆◇) plus a `2/3` counter, in every game that races to a leg/point target. This is the win condition and must be the readable element.
- **The leg in play is demoted** to a small chip reading **"Leg 3 in play"** — explicitly worded so it cannot be read as "three legs won." This is the Cricket fix: `matchInfo`'s current `{label: 'Leg', value: '3'}` becomes unambiguous copy.
- Cricket additionally surfaces *why* a leg hasn't ended when a player has closed everything but trails on points (a "needs the points lead" state), since that rule is currently invisible and is the other plausible reading of the original bug report.
- The active player's panel is distinguished by background lift plus a 4px accent edge — not by colour alone.

### 5.3 Match screen — the Copycat fix, and one interface addition

Copycat's target becomes the largest element on its panel (~62px, accent-coloured), with the match-point double requirement as its own module rather than being invisible until it costs a point.

This requires distinguishing important `matchInfo` entries from incidental ones. **Proposed `GameModule` interface change (presentational only):**

```ts
matchInfo: (state, settings) => { label: string; value: string; emphasis?: 'hero' | 'normal' }[]
```

`emphasis` is optional and defaults to `'normal'`, so X01 and Cricket need no change and no existing call site breaks. Copycat marks its Target entry `'hero'`. The shared match panel renders `'hero'` entries as large standalone modules and `'normal'` entries as the current joined line. This is a generic mechanism — X01 could later hero a checkout suggestion — rather than a Copycat special case, which is why it belongs in the contract rather than in a per-game branch.

### 5.4 Stats & post-match

Summary cards, stat tiles, the match-history list and the heatmap adopt the same shape language, type scale and spacing. The Flights motif backs summary areas. Win/loss badges keep `double`/`treble` — these are state colours and stay semantic. The heatmap's `heatScale` colours are data visualisation and are **not** touched.

### 5.5 Lobby & auth

Room code presented as the hero element (it is the one thing a player must read aloud). Player list, join and sign-in screens adopt the shared primitives. The Reticle motif backs waiting states.

## 6. Architecture

New shared primitives, so no surface hand-rolls the language:

- **`components/atoms/BoardMotif.tsx`** — renders one motif by name (`'board' | 'scoresheet' | 'echo' | 'spider' | 'flights' | 'reticle'`), with accent and intensity props. The `board` variant derives geometry from `lib/dartboard-geometry.ts`.
- **`components/atoms/Panel.tsx`** — the cut-corner surface (notch size, optional accent bar, lit top edge, shadow, optional motif slot), with the focus-ring constraint from §3.2 handled once, correctly, in this one place.
- **`components/atoms/Pips.tsx`** — the flight-pip counter (`value`, `target`).
- Token additions in `lib/theme.ts` + `tailwind.config.ts` + `app/globals.css`: the notch sizes, motif opacities, scanline, spacing scale, and the display-font swap.

Existing component-architecture rules from the architecture spec still hold: atoms/molecules/organisms, tokens as the single source of truth, no arbitrary hex values in components.

## 7. Testing

- **No automated visual regression** — the project has no such infrastructure and adding it is out of scope. Consistent with every prior UI plan here, verification is live and manual.
- Each surface is verified in a real browser at a desktop width **and** a phone width (the condensed-type and three-in-a-row risks are both width-dependent).
- **Keyboard focus must be verified explicitly on every surface** — tab through each and confirm every control still shows a visible focus ring despite `clip-path`. This is the highest-risk regression in the whole plan (§3.2).
- `prefers-reduced-motion: reduce` verified once, on the dashboard, to confirm hover motion is suppressed.
- `npx tsc --noEmit` and `npx vitest run` stay clean throughout. The 142 existing tests are logic tests and should be unaffected; any change to them signals accidental scope creep into behaviour.

## 8. Summary

One coherent visual language — angular surfaces, condensed display type, crisp darts-derived SVG motifs, more air — applied across all four surfaces from a shared primitive layer rather than restyled page by page. Two reported defects are fixed at their actual root (hierarchy, not logic): Cricket's win condition becomes the readable element and its leg-in-play is unambiguously labelled; Copycat's target becomes the largest thing on its panel via a small, generic addition to the `GameModule` contract. The colour tokens, game engines, persistence and APIs are untouched.
