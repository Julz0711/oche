# Oche MVP Architecture Design

**Date:** 2026-09-01  
**Status:** Approved for implementation  
**Build sequence:** M0 → M1 → M2 → M3 → M4 → M5–M7

---

## Overview

Oche is a web-first, mobile-first real-time scoreboard for darts. Two players throw at their own physical boards; the app syncs scores, computes stats, and displays a live heat map.

This document describes the architectural approach to implement the MVP (M0–M7), focusing on modularity and the game module system that enables adding game modes without touching core views.

---

## 1. Project Structure

```
oche/
├── src/
│   ├── app/                    # Next.js App Router
│   │   ├── (dashboard)/        # Public: /dashboard, /stats, /history
│   │   ├── (match)/            # Protected: /match/:id (live scoreboard)
│   │   ├── api/                # Endpoints: matches, visits, stats, auth
│   │   └── layout.tsx
│   │
│   ├── components/
│   │   ├── atoms/              # Button, Numeral, Chip, Avatar, Icon, Divider, Input
│   │   ├── molecules/          # PlayerCard, DartChip, StatTile, LegPip, etc.
│   │   ├── organisms/          # Scoreboard, DartInputPad, HeatMap, LiveStatsDrawer, etc.
│   │   ├── templates/          # MatchLayout, DashboardLayout, StatsLayout
│   │   └── ui/                 # shadcn primitives (drawer, sheet, button, etc.)
│   │
│   ├── lib/
│   │   ├── games/              # Game module system (core architecture)
│   │   │   ├── x01/            # X01 engine, schema, stats, components
│   │   │   ├── cricket/        # (M4) Cricket module
│   │   │   └── registry.ts     # Game registry + type-safe lookup
│   │   │
│   │   ├── stats/              # Shared stats engine (independent of game modules)
│   │   │   ├── engine.ts       # computeStats, buildHeatmap, isSmallSample
│   │   │   ├── engine.test.ts
│   │   │   └── types.ts
│   │   │
│   │   ├── auth/               # Auth.js setup, guest sessions
│   │   ├── db/                 # Mongoose models: User, Match, Visit, Leg, StatsSnapshot
│   │   ├── realtime/           # Ably channel setup (M3)
│   │   ├── theme.ts            # Design tokens (oche, slate, chalk, wire, treble, double)
│   │   ├── types.ts            # Global: Player, PlayerId, Throw, Visit, GameStats
│   │   └── utils/              # Helpers: formatScore, etc.
│   │
│   ├── store/                  # Zustand stores
│   │   ├── match.ts            # Live match state
│   │   └── ui.ts               # UI state (drawer open, theme)
│   │
│   ├── hooks/                  # React hooks
│   │   ├── useGame.ts          # Access to game module
│   │   ├── useMatch.ts         # Match lifecycle
│   │   └── useStats.ts         # Compute stats from visit log
│   │
│   └── styles/
│       └── globals.css         # Tailwind + design tokens
│
├── e2e/                        # Playwright tests (one happy path per game)
├── .storybook/                 # Storybook
├── docs/
│   └── superpowers/
│       └── specs/              # Design docs
├── package.json
├── tsconfig.json
├── next.config.js
└── vitest.config.ts
```

---

## 2. Game Module System (Core Architecture)

Every game (X01, Cricket, etc.) is a module that exports an object satisfying `GameModule<TState, TSettings>`.

```ts
interface GameModule<TState, TSettings> {
  // Identity & registry
  id: string;                                    // 'x01' | 'cricket'
  name: string;
  description: string;
  icon: LucideIcon;
  playerRange: [min: number, max: number];
  status?: 'stable' | 'beta' | 'comingSoon';

  // Settings schema — setup form renders itself
  settingsSchema: z.ZodSchema<TSettings>;
  defaultSettings: TSettings;

  // Pure scoring engine: (state, throw) → newState
  init(players: PlayerId[], settings: TSettings): TState;
  applyThrow(state: TState, throw: Throw): TState;
  undo(state: TState): TState;
  isComplete(state: TState): boolean;
  winner(state: TState): PlayerId | null;

  // Presentation
  ScoreboardSlot: React.FC<{ state: TState; playerId: PlayerId }>;
  primaryMetric(state: TState, playerId: PlayerId): { label: string; value: string };

  // Stats
  computeStats(visits: Visit[], settings: TSettings): GameStats;
  statTiles: StatTileDef[];
}
```

**Key principles:**

1. **Pure scoring engine** — no side effects. Runs on client (instant feedback) and server (authority).
2. **Settings via Zod schema** — the setup form renders itself from `settingsSchema`. New games don't need custom forms.
3. **Stats are composable** — `statTiles` is an array. Live drawer, post-match, and aggregate pages render whatever tiles the module provides. X01 and Cricket can have completely different stat panels without view code branching.

---

## 3. Stats Engine (Shared Across All Views)

Located in `/lib/stats/`, the stats engine is pure and independent of any game module. It takes a visit log and produces metrics.

```ts
export function computeAggregateStats(
  visits: Visit[],
  gameModule: GameModule<any, any>
): GameStats {
  // Call gameModule.computeStats, buildHeatmap, compute deltas
}

export function buildHeatmap(visits: Visit[]): HeatmapData {
  // Count hits per sector/ring
  // Supports density mode (normalised to player's own max)
  // and accuracy mode (hit vs intended target)
}

export const isSmallSample = (count: number) => count < 30;  // Honesty marker
```

**Why this matters:** The live drawer, post-match screen, and aggregate stats page all call the same stats functions. If they ever disagree on a number, the product loses credibility. Sharing the code prevents it.

---

## 4. Visit Log Data Model

Every throw is captured at segment level. This enables heat maps and per-dart stats that retroactively apply to old data.

```ts
interface Visit {
  _id: string;
  matchId: string;
  legId: string;
  playerId: PlayerId;
  index: number;                        // Visit #N in the leg
  seq: number;                          // Monotonic, for retry safety
  throws: Array<{
    sector: 1-20 | 25;
    ring: 'S' | 'D' | 'T' | 'OB' | 'IB' | 'M';  // Single, Double, Treble, Outer Bull, Inner Bull, Miss
    points: number;                     // Denormalised for history
    order: 0 | 1 | 2;
  }>;
  scoreBefore: number;
  scoreAfter: number;
  busted: boolean;
  isCheckout: boolean;
  enteredBy: PlayerId;
  createdAt: Date;
}
```

---

## 5. Authentication

Three providers: **Google, Discord, email magic link**. No passwords.

**Modes:**
- **Guest** — play a match without signup. Data persists in a `guestId` cookie + localStorage.
- **Account** — persistent history across matches, aggregate stats, heat maps over time.

**Upgrade path:** After a guest's first completed match, the post-match screen prompts: *"Keep this match. Sign in and your last 10 games come with you."* On signup, any matches recorded against that `guestId` in the last 30 days are claimed (idempotent, never claimed twice).

---

## 6. X01 Engine (M1)

**Pure TypeScript, no dependencies.**

```ts
interface X01State {
  playerScores: Record<PlayerId, number>;
  currentPlayer: PlayerId;
  currentVisit: Throw[];
  legsWon: Record<PlayerId, number>;
  currentLeg: number;
  matchComplete: boolean;
  winnerId: PlayerId | null;
}

interface X01Settings {
  startingScore: 301 | 501 | 701;
  checkOut: 'double' | 'straight' | 'master';
  checkIn: 'straight' | 'double';
  firstTo: number;  // Legs (1–7)
  sets?: number;    // 0 = off, 1–7
}
```

**Rules implemented:**
- Bust detection: score < 0, score == 1 with double-out, or 0 without valid finishing dart
- Double-in: points don't count until a double lands
- Leg ends mid-visit — remaining darts not thrown
- Straight-out still records which dart finished (for checkout stats)

**Testing (M1):**
- Table-driven unit tests covering every bust condition, checkout, turn-advance edge case
- Property test: for any random sequence of legal throws, `sum(scores) + remaining === startingScore`
- ~20 fixture legs replayed through the engine with asserted final states

---

## 7. Design System & UI

**Palette (dark-first):**
| Token | Hex | Use |
|---|---|---|
| `oche` | `#141A18` | Page background |
| `slate` | `#1E2724` | Surfaces, cards |
| `chalk` | `#F2F4F3` | Primary text |
| `sisal` | `#E4D8BC` | Secondary text, muted |
| `wire` | `#C0A15C` | Accent, focus rings |
| `treble` | `#C8102E` | Treble hits, danger |
| `double` | `#1B7F5A` | Double hits, success |

**Typography:**
- Display/numerals: Bricolage Grotesque (variable width)
- UI/body: Inter Tight
- Live numbers get `font-variant-numeric: tabular-nums` (no jitter)
- Scale: 12 / 14 / 16 / 20 / 28 / 40 / 72 / 128

**Atomic components:**
- All atoms driven by tokens only (no hex values in components)
- Each atom ships with Storybook stories: default, loading, empty, error, extreme content

---

## 8. Build Sequence Rationale

1. **M0** (foundation) — scaffolding, components, auth, Storybook. 1 weekend.
2. **M1** (X01 + local) — scoring engine, dartboard input, local match end-to-end. 2 weekends. Gets you a playable game.
3. **M2** (stats) — stats engine, post-match screen, heat map. 1 weekend. Validated before remote play.
4. **M3** (remote) — lobby, Ably sync, reconnection. 2 weekends. Add complexity once rules and metrics are proven.
5. **M4** (Cricket) — second game module. 1 weekend. Proves the module contract works; done before M5–M6 to avoid baking X01 assumptions into stats views.
6. **M5–M7** (polish) — live drawer, aggregate page, PWA, offline, share images. 2.5 weekends.

**Key decision:** Cricket comes before live drawer and aggregate stats so the stats views are designed generically from the start.

---

## 9. Success Criteria

- Match starts in < 15 s from app open
- Visit entered in < 3 s median
- Guest → account conversion after first completed match > 30%
- Week-2 retention for account holders > 40%
- Scoring disputes (undo rate) < 0.5 per match
- Live drawer opened in > 50% of matches

---

## 10. Non-Goals (MVP)

- Camera-based automatic scoring
- Native iOS/Android (PWA installable only)
- Team / doubles play
- Practice modes, tournaments, leagues
- In-app chat or video
- Any game mode beyond X01 and Cricket
- Monetisation

All deferred items are documented in `oche-backlog.md`.

---

## Summary

The architecture is built around **modularity by default**. The game module system enables adding new game modes without touching the dashboard, scoreboard, or stats engine. The stats engine is pure and shared across all views to prevent stat drift. The scoring engine is dependency-free so the same code runs client-side (instant feedback) and server-side (authority).

This design supports the full roadmap M0–M7 without fundamental rework.
