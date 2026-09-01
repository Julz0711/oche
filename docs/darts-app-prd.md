# PRD — Oche

**A lightweight web app for playing darts with people who aren't in the room.**

| | |
|---|---|
| Version | 0.2 |
| Owner | Julz |
| Status | Scoped for MVP build |
| Type | Personal project, web-first, mobile-first |

> Anything deferred out of this document lives in `oche-backlog.md`. Nothing was thrown away, just parked.

---

## 1. Problem & premise

Two friends both own a board. They live in different cities. Today they play "over WhatsApp video" and one of them keeps score on paper — which means no stats, constant "wait, what did you throw?", and no record that the match ever happened.

**Oche is the scoreboard, not the board.** Each player throws at their own physical dartboard; the app is the shared, synchronised scoreboard, referee, and statistician sitting between them. It also works perfectly well for two people standing at the same board (pass-the-phone mode) — that mode is the fallback, not the design centre.

### Product principles

1. **Throwing beats tapping.** Entering three darts must take under three seconds and never interrupt rhythm. Every UI decision loses to this one.
2. **Every dart is a data point.** We capture segment-level throws (T20, D16, miss), not just visit totals. This is what makes the heat map and every advanced stat possible — and it's a decision that can't be retrofitted onto old data.
3. **The scoreboard is the hero.** The remaining score is the largest thing on screen, readable from the oche 2.5 m away.
4. **Modular by default.** Adding a new game mode should mean adding one folder, not touching the dashboard, the stats engine, or the sync layer.

### Non-goals (MVP)

- Camera-based automatic scoring (Scolia/Autodarts style). Manual entry only.
- Native iOS/Android apps. PWA-installable web only.
- Team / doubles play. Single players per seat.
- Practice modes, tournaments, brackets, leagues.
- In-app chat or video. Users keep their existing call open in another app.
- Any game mode beyond X01 and Cricket.
- Monetisation of any kind.

---

## 2. Users

| Persona | Need | Success looks like |
|---|---|---|
| **The remote regular** — plays a weekly match with the same friend | Sync, low friction, banter | Match starts in <15 s from opening the app |
| **The solo practiser** | Track improvement over weeks | Sees their 3-dart average trending up |
| **The guest** — invited via link, never used the app | Zero-commitment entry | Playing within 10 s, no signup |
| **The stats nerd** (also Julz) | Deep analysis, during and after the match | Finds a weakness in the heat map they didn't know about |

---

## 3. Scope

### MVP
- Guest + account auth; guests can both create and join matches
- Solo (local) and remote (2–4 players) matches
- X01: 301 / 501 / 701 with rule settings
- Cricket (standard + cutthroat)
- Live scoreboard with per-dart entry
- **Live stats drawer** — mid-match stats and heat map, one swipe away
- Post-match stats screen incl. heat map
- Aggregate stats page with rolling windows
- Match history

### Immediately after MVP
- Checkout suggestions
- Achievements / milestones
- Light theme

Everything else → `oche-backlog.md`.

---

## 4. Tech stack

Aligned with your existing project stack so patterns and components carry over.

| Layer | Choice | Note |
|---|---|---|
| Framework | Next.js 16.2 (App Router), React 19 | Same as Party Olympics |
| Styling | Tailwind v4 + `theme.ts` design tokens | Token file carried over and re-skinned |
| Components | shadcn/ui as the primitive layer | Wrapped, never used raw — see §5 |
| Motion | Motion (framer-motion successor) | Sparingly; see §5.4 |
| DB | MongoDB + Mongoose | |
| Auth | Auth.js v5 | OAuth (Google, GitHub) + guest sessions |
| Realtime | Ably | Channel per match |
| Server state | TanStack Query | |
| Client state | Zustand | Live match state store — also feeds the live stats drawer |
| Validation | Zod | Shared schemas between client and API |
| Charts | Recharts | Heat map is hand-rolled SVG, not a library |
| Hosting | Vercel — `oche.vercel.app` on the free tier | MongoDB Atlas free tier is plenty. Custom domain later; keep all URLs relative and read the base from `VERCEL_URL` so the move costs nothing |
| Testing | Vitest (scoring engine), Playwright (one happy path per game) | The scoring engine **must** be unit-tested — see §7.4 |

**Architectural note:** the scoring engine lives in `/lib/games/` as pure, dependency-free TypeScript. No React, no DB, no network. It takes `(state, throw) → newState`. This lets the same code run on the client for instant feedback and on the server for authority, and makes exhaustive testing trivial.

The same applies to the **stats engine** in `/lib/stats/`: pure functions from a visit log to metrics. One implementation serves the live drawer, the post-match screen, and the aggregate page. If the live drawer and the post-match screen ever disagree on a number, the whole product loses credibility — sharing the code is how that's prevented.

---

## 5. Design system & UI

### 5.1 Atomic structure

```
src/components/
├── atoms/        Button, Numeral, Chip, Avatar, Icon, Divider, Input
├── molecules/    PlayerCard, ScoreDelta, DartChip, StatTile, LegPip, CheckoutHint
├── organisms/    Scoreboard, DartInputPad, DartboardInput, HeatMap, LiveStatsDrawer,
│                 MatchHistoryList, GameSetupForm, LobbyPanel
├── templates/    MatchLayout, DashboardLayout, StatsLayout
└── ui/           shadcn primitives (not imported directly by pages)
```

**Rules of the house:**
- Pages compose templates and organisms. Pages never import an atom directly.
- No component reads global state above the organism level; organisms take props, containers wire the store.
- Every atom is driven by tokens only. A raw hex value in a component is a bug.
- Each organism ships with a Storybook story covering: default, loading, empty, error, and the extreme content case (a 12-character player name, a 3-digit score, 4 players).

### 5.2 Visual direction

The subject matter is a pub game played on sisal and brass wire, but the app should read as *broadcast sport*, not as a themed pub skin. No felt textures, no wood grain, no chalkboard fonts.

**Palette — "match play"** (dark-first; light theme comes after MVP)

| Token | Hex | Use |
|---|---|---|
| `oche` | `#141A18` | Page background — a green-black, not a grey-black |
| `slate` | `#1E2724` | Surfaces, cards, the stats drawer |
| `chalk` | `#F2F4F3` | Primary text, the big numerals |
| `sisal` | `#E4D8BC` | Secondary text, muted labels |
| `wire` | `#C0A15C` | Accent — active player, focus rings, key affordances |
| `treble` | `#C8102E` | Treble hits, danger, bust |
| `double` | `#1B7F5A` | Double hits, checkout, success |

Red and green are *semantic here for real reasons* — they're the board's own double/treble colours. That's the one place the theme earns its keep. Never use them as decoration.

**Type**
- Display / numerals: **Bricolage Grotesque** (variable width axis — the big remaining-score numeral can be set wide and heavy without a second family)
- UI / body: **Inter Tight**
- All live numbers get `font-variant-numeric: tabular-nums` so scores don't jitter as they change.
- Type scale: 12 / 14 / 16 / 20 / 28 / 40 / 72 / 128. The 128 exists for exactly one element: the remaining score.

**Layout**
- Mobile-first, single column, thumb-reachable input in the bottom 40% of the viewport.
- The match screen is the only screen with a fixed, non-scrolling layout. Everything else scrolls normally.
- Landscape/tablet: scoreboard left, input right, stats drawer becomes a right-hand panel rather than a bottom sheet.

```
MOBILE — MATCH SCREEN
┌────────────────────────────┐
│ ← 501 · double out   ⚙ 👤👤 │  header, 44px
├────────────────────────────┤
│  JULZ            ● legs 2  │
│                            │
│        1 2 8               │  remaining, 128px, wire when it's your turn
│                            │
│  avg 62.4    ⌀ T20 T20 —   │  this visit's darts
├────────────────────────────┤
│  WILSON             legs 1 │  opponent strip, dimmed
│  241        avg 54.1       │
├────────────────────────────┤
│                            │
│      [ DARTBOARD SVG ]     │  primary input
│                            │
│  [ MISS ]  [ ↶ UNDO ]      │
├────────────────────────────┤
│ ─────────  ▲  ───────────  │  drawer handle → live stats (§9.3)
└────────────────────────────┘
```

### 5.3 Score input — the single most important interaction

Two input methods, user-switchable, preference remembered:

**A. Dartboard tap (default).** A full SVG board. Tap the segment you hit. 82 targets: 20 sectors × 4 rings (inner single, treble, outer single, double) + outer bull + bull, plus a MISS button. Targets are drawn at true proportions but the *hit areas* are expanded — the treble ring gets a fatter invisible touch target than its visual width, because it's the most-hit region on the board. Long-press a sector to disambiguate if a user has fat fingers on a small phone.

**B. Numeric keypad.** Type `20`, then tap S/D/T. Or type the visit total directly (`60` → recorded as three unattributed darts). ⚠️ **Total-only entry produces no heat map data and no doubles/trebles counts.** The UI states this once, quietly, the first time it's used: *"Visit totals are faster, but skip the dart-by-dart stats."*

Both methods:
- Auto-advance after the third dart, with a 1.5 s undo window before commit.
- Undo is always one tap, up to the start of the current leg.
- Bust detection is immediate and unmistakable — the numeral goes `treble` red and the visit is voided with a short shake.
- Haptic feedback on each dart (`navigator.vibrate`).

### 5.4 Motion

One orchestrated moment only: the checkout. When a player finishes a leg, the score counts down to 0, the numeral scales up, and the leg pip fills. Everything else is functional transition — a dart chip appearing, a turn indicator sliding, the stats drawer tracking the finger. No entrance animations on scroll. Respect `prefers-reduced-motion` everywhere.

### 5.5 Accessibility & quality floor

- Never encode state in colour alone. The active player has a colour *and* a border *and* a position shift.
- All touch targets ≥ 44 px (the dartboard's individual segments are the documented exception, mitigated by the keypad alternative).
- Full keyboard path for score entry: number keys, `s`/`d`/`t` modifiers, `Backspace` for undo, `Space` to confirm, `Esc` to close the drawer.
- Screen reader announces each committed visit: *"Julz scored 140. 128 remaining."*
- Contrast AA minimum against `oche` and `slate`.
- Wake lock during an active match so the phone doesn't sleep between throws.

---

## 6. Authentication

| Mode | Capabilities |
|---|---|
| **Guest** | Create or join any match, play any game, see live and post-match stats for that match. Data lives in a `guestId` cookie + localStorage. Nothing is written to the users collection. |
| **Account** | Everything above, plus persistent history, aggregate stats, heat maps over time, cross-device, head-to-head records. |

A guest is never blocked from anything inside a single match. The value of an account is *continuity across matches*, and that's the only thing we gate.

**Upgrade path (the conversion moment):** after a guest's first completed match, the post-match screen shows their stats with a soft prompt: *"Keep this match. Sign in and your last 10 games come with you."* On signup, any matches recorded against that `guestId` in the last 30 days are claimed and re-attributed. This is a one-shot migration; it must be idempotent and must never claim a guest ID that's already been claimed.

Providers: Google, GitHub, and email magic link. No passwords.

---

## 7. Games

### 7.0 The game module contract

This is the extensibility mechanism, and it's the reason the MVP can ship with two modes without painting us into a corner. A game is a folder that default-exports an object satisfying `GameModule`. The dashboard, setup form, live scoreboard, and stats screens are all generated from it — none of them contain game-specific branches.

```ts
interface GameModule<TState, TSettings> {
  id: string;                    // 'x01' | 'cricket'
  name: string;
  description: string;
  icon: LucideIcon;
  playerRange: [min: number, max: number];
  status?: 'stable' | 'beta' | 'comingSoon';

  // Zod schema → the setup form renders itself from this
  settingsSchema: ZodSchema<TSettings>;
  defaultSettings: TSettings;

  // Pure scoring engine
  init(players: PlayerId[], settings: TSettings): TState;
  applyThrow(state: TState, throw: Throw): TState;   // handles bust, turn advance, leg end
  undo(state: TState): TState;
  isComplete(state: TState): boolean;
  winner(state: TState): PlayerId | null;

  // Presentation hooks
  ScoreboardSlot: React.FC<{ state: TState; playerId: PlayerId }>;
  primaryMetric(state: TState, playerId: PlayerId): { label: string; value: string };

  // Stats — same definitions drive live, post-match and aggregate views
  computeStats(visits: Visit[], settings: TSettings): GameStats;
  statTiles: StatTileDef[];
}
```

Adding a game later = create `/lib/games/<id>/`, register it in `/lib/games/registry.ts`. That's the whole checklist. Candidate modes are listed in the backlog.

### 7.1 X01 — 301 / 501 / 701

**Settings**

| Setting | Options | Default |
|---|---|---|
| Starting score | 301 / 501 / 701 | 501 |
| Check-out | Double out / Straight out / Master out (double or treble) | Double out |
| Check-in | Straight in / Double in | Straight in |
| Legs | First to *n* legs, *n* = 1–7 | First to 3 |
| Sets | Off, or first to *n* sets, *n* = 1–7 | Off |
| Who throws first | Player 1 / Random / Bull-off / Alternate each leg | Alternate |
| Handicap | Per-player starting score offset | Off |

**Format notes**
- One concept only: **first to *n***. "Best of" is dropped — it's the same thing said confusingly, and every mismatched-format argument in darts starts with someone reading "best of 5" as "5 legs". The setup form shows the derived maximum in plain text: *"first to 4 legs — up to 7 legs"*.
- With sets on, a set is itself first-to-*n* legs. Both dials go 1–7, so the theoretical ceiling is 13 sets × 13 legs. Nobody will ever play that, but the leg strip and the scoreboard must not assume a small number — see §9.2.
- `firstTo: 1` is a valid and useful setting: a single leg, no legs display at all. The scoreboard hides leg pips entirely rather than showing "0–0", because an empty affordance for something that can't happen is noise.

**Rules the engine must get right**
- Bust: score below 0, score exactly 1 (in double-out), or reaching 0 without a valid finishing dart. Visit reverts entirely.
- In double-in, points don't count until a double lands; darts before it count as thrown but score 0.
- The leg ends mid-visit — remaining darts of that visit are not thrown and are excluded from dart counts.
- Straight-out mode still records *which* dart finished, for checkout stats.

**Checkout suggestions (post-MVP).** Standard preferred-route table for 2–170. Shown as a small hint under the remaining score, dismissible, off by default for players who find it patronising. Adapts to darts remaining in the visit (`T20 T20 D20` becomes `T20 D20` after the first dart).

### 7.2 Cricket

**Settings**

| Setting | Options | Default |
|---|---|---|
| Variant | Standard (points) / No-score (close only) / Cutthroat (points go to opponents) | Standard |
| Numbers | 15–20 + bull (classic) / Random 7 | Classic |
| Win condition | All closed + points lead | Standard |

**Match structure:** a Cricket match is a **single game**. No legs, no sets. The scoreboard hides leg pips entirely for this mode, and the post-match screen omits the leg-by-leg table. This is a per-module concern — `GameModule` doesn't assume legs exist, so X01 owning a legs/sets wrapper and Cricket not owning one requires no shared code to branch. If Cricket ever wants a first-to-*n* wrapper, it becomes a setting on that module rather than a change to the contract.

Scoreboard shows the classic marks grid — `/`, `X`, `⊗` — one column per player, one row per number. Live MPR (marks per round) per player, which is Cricket's equivalent of the 3-dart average.

Cricket's live stats drawer swaps the X01 tiles for MPR, marks per number, and hit rate on each of 15–20 and bull. This swap is driven by `statTiles`, not by an `if` statement in the drawer.

### 7.3 Dashboard

- Grid of game cards generated from the registry. Each card: icon, name, one-line description, and — for signed-in users — their personal headline stat for that mode (*"your best: 15 darts"*).
- Above the grid: a **Resume** strip if an unfinished match exists, and a **Rematch** button repeating the last match's settings and opponents in one tap.
- Below: **Recent matches** (last 5, with results).
- A registry entry flagged `beta` or `comingSoon` renders differently without any dashboard code change. With two modes live, the grid will feel sparse — resist filling it with placeholder cards for unbuilt games; a two-card grid that looks deliberate beats a six-card grid of locked padlocks.

### 7.4 Scoring engine testing

Non-negotiable, because scoring bugs destroy trust instantly and silently corrupt the stats history:
- Table-driven unit tests per game covering every bust condition, checkout condition, and turn-advance edge case.
- Property test: for any random sequence of legal throws, `sum(scores) + remaining === startingScore` and `undo(applyThrow(s, t)) === s`.
- A fixture set of ~20 real recorded legs replayed through the engine with asserted final states.

---

## 8. Remote play

### Flow
1. Any user — guest or signed in — picks a game and settings → **Create match** → gets a 4-character room code and a share link.
2. Opponent opens the link (or types the code) → picks guest/login → lands in the lobby.
3. Lobby shows connected players, connection status dot, and settings (host can still change them). Host taps **Start**.
4. During play, **only the player whose turn it is** can enter darts. Everyone else sees a read-only live board — and can still open their own stats drawer.

### Sync model
- **Server-authoritative.** The client applies a throw optimistically for instant feedback, POSTs it, and reconciles with the server's returned state. The server is the only writer of match state.
- Ably channel per match (`match:{id}`) for state broadcast. Payload is the full derived state — small enough (a few hundred bytes) that diffing isn't worth the complexity.
- Every throw carries a monotonic `seq`. The server rejects out-of-order or duplicate `seq` values, which makes retries safe.
- The full visit log for the current match is mirrored in the client store, so the live stats drawer computes locally with no extra requests.

### Failure handling
- **Disconnect:** state persists server-side. Reconnecting rejoins at the exact position. A disconnected player's avatar dims with a "reconnecting" state; after 60 s the others get the option to pause or continue.
- **Offline:** throws queue in IndexedDB and flush on reconnect. Local/solo matches work fully offline (PWA). The stats drawer keeps working offline because it reads the local visit log.
- **Wrong entry by the wrong person:** the current thrower can undo their own visit. The host can undo any visit. Both are logged.
- **Abandoned match:** auto-archived after 24 h of inactivity, counted as unfinished, excluded from stats.

**Trust note:** this is a friendly-scoring system. Nobody is prevented from lying about their throws. That's correct for the use case — the video call is the referee — and we should not build anti-cheat.

---

## 9. Statistics

### 9.1 Metric definitions

Defined once, in one module, matching how darts stats are conventionally calculated — otherwise the numbers are meaningless to anyone who knows the sport. The live drawer, the post-match screen, and the aggregate page all call the same functions.

| Metric | Definition |
|---|---|
| **3-dart average** | `(total points scored ÷ darts thrown) × 3`. Busted visits count their darts but score 0. |
| **First 9 average** | Points scored in the first 9 darts of a leg × ⅓. Measures pure scoring power, separate from finishing. |
| **Checkout %** | `legs won ÷ darts thrown at a double`. Only darts where the player was actually on a finish count as attempts. |
| **Darts per leg** | Mean darts thrown in legs won. |
| **Best leg** | Fewest darts to finish a leg. |
| **Highest checkout** | Largest score finished in a single visit. |
| **Scoring bands** | Counts of visits scoring 180, 140+, 100+, 60+. |
| **Doubles hit** | Count and hit rate (`hits ÷ darts thrown at doubles`), broken out by D1–D20 and bull. |
| **Trebles hit** | Count and rate. Also treble-20 specific rate, since T20 is the one that matters. |
| **MPR** (Cricket) | `total marks ÷ rounds × 3`. |

### 9.2 Live stats drawer

A bottom sheet, pulled up from the handle under the input area or by tapping your own player card. Landscape/tablet: a right-hand panel instead. It's the same stats engine as everywhere else, computed client-side from the in-memory visit log.

**Behaviour — this is the part that decides whether it helps or hurts:**
- **Never available mid-visit.** If you have darts in hand and one already thrown, the handle is inert. The drawer is for the walk back to the board, not for mid-throw second-guessing.
- **Auto-collapses when your turn starts**, with a short slide-down. A setting (`Keep stats open`) disables this for people who want it pinned on a tablet.
- Opening it never pauses the match and never blocks the opponent — anyone can be reading their stats while someone else throws.
- It is peek-height by default (~35% of viewport) showing four tiles, and expands to full height on a second pull.

**Content, in order:**

1. **Four live tiles**, mode-driven via `statTiles`. For X01: 3-dart average, this leg's average, checkout attempts/hits, darts thrown. For Cricket: MPR, marks this round, numbers closed, points.
2. **Delta chips** against the player's own last-10 baseline (*"62.4 ▲ 3.1"*). This is the emotional core of the feature — it answers "am I playing well tonight?" which is the actual question in the player's head. Guests get no baseline and see the tiles without deltas; the empty state says so plainly and offers sign-in.
3. **Live heat map** of this match so far. Same `<Dartboard>` component, third render mode. Sparse early in a match — the empty state is the board at rest with a count of darts thrown, not a spinner.
4. **Leg strip** — one row per completed leg: darts used, average, checkout. Current leg highlighted and in progress. Scrolls, newest first, so a first-to-7 match doesn't push everything else off screen. When sets are on, rows are grouped under a set header with that set's result.
5. **Doubles this match** — which doubles have been attempted and hit, only shown once there's been at least one attempt.
6. **Opponent tab** — switch to see the same view for any other player. Everything in this drawer is public information; both players can already see every dart on the scoreboard, so hiding aggregates would be theatre.

**Small-sample handling:** a mid-match drawer is *by definition* a small sample. Any rate computed from fewer than ~10 relevant darts is greyed with a marker. In the first leg, most of this panel is honest emptiness, and that's fine — don't fabricate confidence to fill space.

### 9.3 Post-match screen

The moment of maximum engagement. Shown immediately on the final dart, before returning to the dashboard. It is deliberately the expanded, two-player version of the drawer, so nothing about it feels new.

1. **Result** — winner, leg score, match duration.
2. **Side-by-side comparison** — both players' 3-dart average, first 9, checkout %, darts per leg. The winning value in each row is highlighted.
3. **This match's heat map** — per player, toggleable.
4. **Dart breakdown** — trebles hit, doubles hit, singles, misses. As a compact stacked bar plus counts.
5. **Scoring bands** — 180s, 140+, 100+, 60+ as chips.
6. **Leg-by-leg table** — darts used, checkout, high visit.
7. **Notable moments** — auto-detected: highest checkout, best leg, longest run without a treble, biggest comeback. Written as short plain sentences, not badges.
8. **vs. your average** — how this match compares to the player's last 10. *"Your first 9 was 8.2 above your recent average."*
9. Actions: **Rematch**, **Share result** (renders a clean OG image), **Back to dashboard**.

### 9.4 Stats page (aggregate)

Top of page: a **window selector** — `Last 5 · Last 10 · Last 25 · Last 50 · All time · Custom range`. This is the primary control and it filters everything below it.

Filters: game mode, opponent, format (301/501/701), solo vs remote.

Content:
- **Headline row** — 3-dart average, first 9 average, checkout %, best leg. Each with a delta chip vs the previous window of the same size (*"62.4 ▲ 3.1 vs previous 10"*).
- **Trend chart** — 3-dart average per match over the window, with a rolling-5 line on top. Recharts, minimal chrome, no gridline clutter.
- **Lifetime heat map** — all darts in the window, aggregated (§9.5).
- **Doubles breakdown** — horizontal bars, D1–D20 + bull, sorted either by number or by hit rate. Sorting by hit rate immediately shows the player their worst double, which is the most actionable insight in the whole app.
- **Head-to-head** — record vs each opponent, their average against yours.
- **Records** — best leg, highest checkout, most 180s in a match, longest winning streak.

**Small-sample honesty:** any metric computed from fewer than ~30 relevant darts is shown greyed with a small marker and a tooltip explaining the sample is thin. A 100% double rate off two attempts is a lie, and showing it proudly undermines every other number on the page.

### 9.5 Heat map

The feature most worth getting right. One component, three contexts: live drawer, post-match, aggregate page.

- Hand-rolled SVG dartboard, same geometry as the input board (one shared `<Dartboard>` component — this is why per-dart capture matters).
- Each of the 82 regions is tinted by hit density: `sisal` (cold) → `wire` → `treble` (hot), on a perceptually-even scale.
- **Normalisation matters.** Raw counts always light up T20 and make every player's map look identical. Two modes:
  - **Density** — raw hit counts, normalised to the player's own max.
  - **Accuracy** — hits relative to the intended target, where intent is known. Intent is unambiguous during a checkout (a player on 32 is throwing at D16) and inferable during scoring (assume T20 unless the player is on a setup shot). Only compute this where confidence is high; skip the dart otherwise.
- Hover/tap a region: exact count, percentage of total darts, and rate for that segment.
- Toggle between **all darts**, **scoring darts only**, and **finishing darts only**. The finishing-darts map is effectively a doubles accuracy chart on the board itself, and it's the one that will actually change how someone practises.
- Misses are shown as a count outside the board, not silently dropped.
- In the live drawer it renders at reduced size with no tooltips — density mode only, since accuracy mode needs more darts than a single match reliably provides.

---

## 10. Data model

```ts
// users
{ _id, email, name, image, provider, createdAt,
  preferences: { inputMethod: 'board'|'keypad', checkoutHints: bool,
                 keepStatsOpen: bool, theme: 'dark'|'light', defaultGame: string },
  claimedGuestIds: string[] }

// matches
{ _id, gameId: 'x01'|'cricket', settings: {...}, mode: 'local'|'remote',
  roomCode, hostId, hostIsGuest,
  players: [{ userId?, guestId?, name, seat, isGuest }],
  status: 'lobby'|'live'|'complete'|'abandoned',
  state: {...},               // game-specific live state, engine-owned
  winnerId, startedAt, completedAt, durationMs }

// legs
{ _id, matchId, index, setIndex, startingPlayerId, winnerId, dartsUsed, checkout }

// visits   ← one document per turn; the throws array is the atomic unit
{ _id, matchId, legId, playerId, index, seq,
  throws: [{ sector: 20, ring: 'T', points: 60, order: 0 }, ...],
  scoreBefore, scoreAfter, busted, isCheckout, enteredBy, createdAt }

// statsSnapshots   ← materialised rollups, recomputed on match completion
{ _id, userId, gameId, scope: 'all'|'last5'|'last10'|'last25'|'last50',
  metrics: {...}, segmentCounts: { 'T20': 412, 'D16': 38, ... },
  matchCount, computedAt }
```

**Notes**
- `ring` ∈ `S` (single) | `D` | `T` | `OB` (outer bull, 25) | `IB` (bull, 50) | `M` (miss). `points` is stored denormalised so historical scores survive any future engine change.
- Visits are append-only; an undo writes a tombstone rather than deleting, so the audit trail survives.
- `statsSnapshots` exists because computing an all-time heat map from raw visits on every page load will not stay fast. Recompute on match completion; the rolling windows are cheap to derive from the last 50 matches. The live drawer never touches this collection — it works from the in-memory log.
- Indexes: `visits{matchId, legId, seq}`, `matches{roomCode}` (sparse, TTL on lobby), `matches{'players.userId', completedAt}`, `statsSnapshots{userId, gameId, scope}` unique.

---

## 11. API surface

```
POST   /api/matches                    create (guest or account; returns roomCode)
GET    /api/matches/:id                current state
POST   /api/matches/:id/join           join by code
POST   /api/matches/:id/start          host only
POST   /api/matches/:id/visits         submit a visit  { throws[], seq }
POST   /api/matches/:id/undo           undo last visit
POST   /api/matches/:id/abandon
GET    /api/matches?limit&cursor       history

GET    /api/stats/baseline             last-10 baseline for live drawer deltas (cached)
GET    /api/stats?scope&gameId&opponentId
GET    /api/stats/heatmap?scope&gameId&filter
GET    /api/matches/:id/stats          post-match breakdown

POST   /api/auth/claim-guest           idempotent guest→account migration
```

The baseline endpoint is fetched **once at match start** and cached for the match's duration. The live drawer must never fire a request when it opens.

Ably events on `match:{id}`: `state`, `player:joined`, `player:left`, `player:reconnecting`, `match:started`, `leg:complete`, `match:complete`.

---

## 12. Roadmap

| Milestone | Contents | Rough size |
|---|---|---|
| **M0** | Scaffolding, tokens, atoms, Storybook, auth (incl. guest create) | 1 weekend |
| **M1** | X01 engine + tests, dartboard input, local match end-to-end | 2 weekends |
| **M2** | Stats engine + post-match screen + heat map | 1 weekend |
| **M3** | Remote play — lobby, Ably sync, reconnection | 2 weekends |
| **M4** | Cricket module (validates the game contract) | 1 weekend |
| **M5** | Live stats drawer | half a weekend |
| **M6** | Aggregate stats page, windows, trends | 1 weekend |
| **M7** | PWA, offline queue, polish, share images | 1 weekend |

**Ordering notes**
- Do M4 (Cricket) *before* M5 and M6. Adding the second game mode is what proves the module contract abstracts correctly, and you want to find out before the stats views bake in X01 assumptions.
- The live drawer is deliberately late and small: once the stats engine (M2) and the heat map component exist, the drawer is mostly a sheet, a tab bar, and a layout. Building it earlier means building the stats engine twice.

---

## 13. Success metrics

- A match starts in under 15 seconds from app open (rematch: under 5).
- A visit is entered in under 3 seconds, median.
- Guest→account conversion after first completed match > 30%.
- Week-2 retention for account holders > 40%.
- Zero scoring disputes — measured by undo rate per match staying under 0.5.
- Live drawer opened in > 50% of matches, and no measurable increase in time-per-visit when it is.

---

## 14. Decisions log

Resolved during review — recorded so they don't get re-litigated:

| Question | Decision |
|---|---|
| Name | **Oche** |
| Domain | `oche.vercel.app` (Vercel free tier). Custom domain deferred; no code should hardcode the host |
| Game modes in MVP | X01 and Cricket only. Third mode deliberately deferred until after MVP so the decision is made with a working app in hand |
| Teams / doubles | Out of scope |
| Chat | Out of scope — players are already on a call |
| Practice modes | Out of scope |
| Guests creating matches | Allowed. Accounts buy continuity across matches, nothing inside one |
| Live stats | In scope for MVP as a drawer (§9.2) |
| Hiding stats from opponent | Out of scope. Everything in the drawer is mutual |
| Match formats | 301 / 501 / 701; legs 1–7; sets off or 1–7 |
| Cricket structure | Single game. No legs or sets wrapper |
| Short leg tables | A 1-leg or Cricket match simply renders a short (or absent) leg table. No special layout for now; revisit once the post-match screen exists and can be judged on screen rather than on paper |

Nothing currently blocking the build. New questions get appended here rather than opened as a separate section.
