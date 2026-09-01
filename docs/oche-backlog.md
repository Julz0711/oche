# Oche — Backlog

Everything deliberately kept out of the MVP. Nothing here is rejected; it's parked with enough notes that picking it up later doesn't mean re-thinking it from scratch.

Ordered roughly by "cheapest useful thing first" within each section.

---

## A. Game modes

The game module contract (`GameModule`, PRD §7.0) is the whole reason these are cheap. Each one is a folder in `/lib/games/` plus a registry entry.

### A1. Shanghai
Rounds 1→20, you only score on that round's number. Hitting single + double + treble of the number in one visit is an instant win. Round-based rather than score-based, so it's the mode that would prove the contract handles a different *shape* of game. Small engine, high variance, short rounds — good for remote play.

### A2. Killer
Each player owns a number (drawn or thrown for). Hit your own double to gain lives, hit an opponent's double to take one. Last player standing. Best with 3–4 players and genuinely the most social mode over a video call. Needs per-player lives in state and an elimination flow the current scoreboard doesn't have.

### A3. Around the Clock
1 through 20 then bull, in order. Trivial engine. Mostly valuable as a warm-up mode and as the simplest possible test of the module contract.

### A4. Halve It
Rounds with a target (20s, 19s, doubles, trebles, bull…); miss the target for a whole round and your score is halved. Brutal, funny, and produces great post-match "notable moments".

### A5. Solo roguelike — *the interesting one*
Your Balatro-shaped idea. Sketched here so it's not lost:

A **run** is a sequence of legs against escalating requirements — "finish 301 in under 15 darts", "score 400+ across 3 visits", "check out on a double under 10". Between legs you draft one of three **modifiers** from a deck:

- *Scoring mods* — "trebles count double", "the 19 bed scores as 20", "bull is worth 75"
- *Rule mods* — "straight out allowed this leg", "one free re-throw per leg", "busts don't reset"
- *Risk mods* — "double points, but a miss ends the run", "banked score carries into the next leg"
- *Curses* drawn at higher stages — "D16 is dead this leg", "your first dart of each visit scores 0"

Mods stack and combo, which is where the Balatro feel comes from: the fun is in finding a build ("everything-doubles + bull-is-75") rather than in throwing better. Run ends on a failed requirement; you keep a run score and a leaderboard entry.

Why it fits this app specifically: it's the only mode that makes a *solo* session feel like an event, and every mod is expressible as a transform over the existing X01 engine rather than a new engine. Meaningful scope though — new state, a deck, a draft UI, run persistence, and balance work that only playtesting resolves. Firmly a post-1.0 project, not a weekend.

Prerequisite: the X01 engine needs to accept a modifier list at `init()` rather than a fixed settings object. Worth keeping that shape in mind when writing it, but **not** worth building the abstraction now.

### A6. Practice modes
Bob's 27, Doubles Trainer, Checkout Practice (random finish, three darts, repeat), Treble Trainer. Modelled as game modules with `playerRange: [1,1]` and a separate dashboard section. The retention argument for these is real — practice is what brings someone back on a Tuesday — but they need the stats page to exist first so improvement is visible.

---

## B. Multiplayer & social

### B1. Teams / doubles
Two-vs-two, alternating throws within a team. Touches nearly everything: `players` becomes `teams[]`, stats need both a team and an individual view, checkout attribution gets ambiguous, and the scoreboard layout changes. Real demand eventually, but it's the single most invasive item in this document — do it as a deliberate v2 project, not squeezed in.

### B2. Friends & invites
Persistent friend list, invite by username instead of room code, "who's online". Makes the rematch loop much smoother than sharing a link every time. Cheap once accounts have real usage.

### B3. Tournaments & brackets
Single/double elimination, seeding, a bracket view. Some of this overlaps with Party Olympics patterns and could be lifted rather than rebuilt.

### B4. Leagues / seasons
Standings over a fixed period, an Elo-style rating. Only meaningful with more than two regular players.

### B5. Lobby chat
Cut from the MVP because you're already on a call. Worth revisiting only if the app ever gets used by people who *aren't* on a call — e.g. async or open-lobby play.

### B6. Spectators
Read-only join by link. Nearly free given the sync model already broadcasts full state to non-active players; mostly a permissions flag and a UI without the input pad.

---

## C. Stats & analysis

### C1. Accuracy-mode heat map with explicit intent
The MVP infers intent (assume T20 when scoring, the obvious double when finishing). A better version lets the player declare a target before a practice visit, making accuracy exact rather than inferred. Fits naturally with practice modes (A6).

### C2. Session view
Stats grouped by evening rather than by match — "last night you averaged 58.2 across 4 matches, and your average dropped 6 points after match 3". Fatigue curves are genuinely interesting and nobody's app shows them well.

### C3. Streaks & form
Rolling form indicator, hot/cold streaks, longest run of legs won.

### C4. Achievements & milestones
First 180, first 100+ checkout, ton-80 count thresholds, "won a leg in 15 darts". Should be computed server-side on match completion from the visit log, so old matches retroactively unlock them.

### C5. Data export
CSV / JSON export of every visit. Cheap, and it's the right answer to "can I do my own analysis" without building it.

### C6. Yearly wrapped
An end-of-year summary page. Pure fun, high share value, and everything needed is already in `statsSnapshots`.

---

## D. Platform & input

### D1. Autodarts / Scolia ingestion
If you ever get an auto-scoring camera setup, accept its webhook and skip manual entry entirely. The data model already stores segment-level throws, so this is an input adapter rather than a rework — worth noting as a reason the per-dart decision pays off twice.

### D2. Voice input
"Treble twenty, twenty, five." Speech recognition for hands-free scoring at the board. Accuracy in a noisy room is the open question; would need a confirmation step, which may eat the speed advantage.

### D3. Light theme
Token layer already supports it; needs a pass on the semantic red/green against a light `sisal` background, where both currently lose contrast.

### D4. Native shell
Only if wake lock, haptics, or background sync prove insufficient as a PWA. No reason to expect they will.

### D5. Second-screen / TV mode
Cast the scoreboard to a big screen while phones stay as input. Nice for playing at the same board with a group.

---

## E. Product polish

- **Checkout hint difficulty levels** — "show me the route" vs "just tell me if it's checkable".
- **Undo history view** — see and revert to any point in the match, not just the last visit.
- **Custom player avatars / walk-on names** — cosmetic, but a large part of why darts is fun.
- **Match notes** — a free-text line after a match ("played after two beers, terrible"). Correlating notes with averages later is exactly the kind of thing you'd actually look at.
- **Sound** — a single subtle sound on a 180. Off by default. One sound only; a full sound design is a trap.
- **Private live stats** — an option to hide your live drawer numbers from the opponent's tab. Deferred; revisit only if being watched turns out to be distracting in practice.
- **Custom starting scores** — anything beyond 301/501/701 (170, 1001, handicap-style odd numbers). Trivial once the engine takes an arbitrary integer, which it already does internally; it's purely a setup-form question.
- **Custom domain** — moving off `oche.vercel.app`. Only a DNS and env-var change if nothing hardcodes the host, which is why the PRD calls that out now rather than later.
