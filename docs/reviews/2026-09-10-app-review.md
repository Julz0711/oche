# App review, 10 September 2026

Scope: whole repository, server configuration, data model, security and privacy, navigation, design consistency, copy, motion, action prompts, rarity colours, and local play for 2 to 8 players. No production changes or live database writes are part of this review.

## Backlog

I will add new topics here. Please take them and move them to the tracker.

1. ~~Leave active games. Currently only the host can delete a game, and it will be stuck on the other end, until deleted.~~ Done — see "Completed backlog items" below.
2. ~~Game action toast should be above the darboard an in the center~~ Done — see "Completed backlog items" below.
3. ~~On Solo Rougelike game card on the dashboard is a little arrow in top right corner, remove it.~~ Done — see "Completed backlog items" below.
4. ~~On desktop, house rule hub should be accessible through the navbar. the hub still has some design elements that do not match the rest of the app. e.g. there is arrow pointing left, that doesnt fit other navigation elements~~ Done — see "Completed backlog items" below.
5. ~~in house rule, the buttons are kind of all over the place. many different arrows are getting used. please streamline the icon usage and button designs~~ Done — see "Completed backlog items" below.
6. ~~proper 404 page~~ Done — see "Completed backlog items" below.
7. ~~buttons missing hover effects now. add some hover states, but without any transforms~~ Done — see "Completed backlog items" below.
8. ~~custom loading spinner should only appear on larger loading times like initial page loading, not on simple navigations that take little to no time -> with the spinner it annoys more. can we jsut leave blank on quick refreshes like navigation?~~ Done — see "Completed backlog items" below.
9. ~~every page seems to have a different kind of style in the header/headline -> please streamline this~~ Done — see "Completed backlog items" below.
10. ~~the stats summary is still kind of unorganized [see: C:\Users\julia\Documents\oche\oche\docs\reviews\ref\Screenshot 2026-09-10 171759.png]. Iwant to look better and cover more stats like 3-dart average on x01 or average cricket rounds. more stats!!! feel free to explore different ui and maybe add more sections. feel free and be creative~~ Done — see "Completed backlog items" below.

## Completed backlog items

### 1. Leave active games (2026-09-10)

Previously, only the host could remove a match from the dashboard's "Active games" list (`DELETE /api/matches/[id]`), and that action ends the match for everyone by marking it `abandoned`. A non-host participant had no control at all — an unwanted match just sat in their list until the host deleted it.

Added a separate **leave**, distinct from the host's **delete**:

- Any signed-in participant (host or a seated player) can now leave a match on their own via `POST /api/matches/[id]/leave` (`app/api/matches/[id]/leave/route.ts`), without ending it for anyone else still in it.
- New `Match.leftBy: string[]` field (`lib/db/models.ts`) tracks which signed-in participants have left. `GET /api/matches/active` now excludes any match the current user has left (`app/api/matches/active/route.ts`).
- If every signed-in participant has left (nobody with a stake in the match remains), the match is auto-marked `abandoned` so it doesn't linger forever — see `allParticipantsLeft` in `lib/matchLobby.ts`.
- Leaving is idempotent and rejects non-participants and matches that already finished (`canLeaveMatch` in `lib/matchLobby.ts`, unit-tested in `lib/matchLobby.test.ts`).
- Dashboard (`app/(dashboard)/page.tsx`): the host still sees the existing delete control ("Delete this game? This cannot be undone."); a non-host sees a leave control instead ("Leave this game? It stays active for the other player(s)."). Both call their respective endpoint and remove the row from the list on success.
- Route-level behavior (idempotency, auto-abandon once everyone's left, rejecting strangers/finished matches) is covered by `app/api/matches/[id]/leave/route.test.ts`, following this repo's existing DB-integration-test convention (skipped without `OCHE_TEST_MONGODB_URI`, same as `lib/rematch.integration.test.ts`).

Verified: `tsc --noEmit` clean, full `vitest` suite green (288 passed / 17 skipped, no regressions), and `npm run build` succeeds with the new route registered.

### 2–9. UI tweak batch (2026-09-10)

**2. Turn toast now sits above the dartboard, centered.** It was `position: fixed` near the top of the viewport, disconnected from the board itself. `.turn-toast-region` is now `position: absolute; bottom: calc(100% + 10px)` (`app/globals.css`), anchored to a `position: relative` wrapper placed directly around the dartboard input in both layouts — the two desktop `DartboardInput` wrappers in `app/(match)/match/[id]/page.tsx`, and the mobile input dock in `components/organisms/MobileMatch.tsx` (which now renders `TurnToast` itself, using its existing `disabled` prop as `enabled={!disabled}`). Verified visually at desktop and mobile widths — toast renders centered directly above the board/keypad.

**3. Removed the stray arrow from the House Rules dashboard card** (`app/(dashboard)/page.tsx`) — it was a decorative absolutely-positioned "↗" with no clear purpose next to an already-obvious "House Rules" card.

**4. House Rules is now reachable from the desktop navbar**, and its back-link matches the rest of the app. `components/AppNavigation.tsx`'s `destinations` list gained a `/solo` entry (Swords icon, matching the existing icon convention — lucide-react, size 18), desktop-only via a new `.nav-desktop-only` class (hidden under 1024px, same breakpoint the sound toggle already uses) since the mobile bottom bar is a fixed 4-column grid with no room to spare and House Rules is already one tap away from the dashboard there. The text-glyph `← Play` back link in `app/solo/SoloGame.tsx` was replaced with the shared `BackLink` atom (`components/atoms/BackLink.tsx`) already used everywhere else (match screen, join, friend profiles) — same bordered-square style instead of a one-off text link.

**5. Streamlined icon usage in House Rules.** Every unicode arrow glyph (`→`, `↗`) and the undo glyph (`↶`) across `app/solo/**` (`SoloGame.tsx`, `SoloHub.tsx`, `FriendsBoard.tsx`) was replaced with the matching lucide-react icon already used correctly elsewhere in the same files/app (`ArrowRight`, `ArrowUpRight`, `Undo2` — the last matching `components/organisms/DartboardInput.tsx`'s existing undo icon). Added `vertical-align` rules in `app/solo/solo.module.css` so the icons sit correctly next to the text without changing every button's box layout (avoided a broader flex refactor across ~30 button call sites to keep this change low-risk). Buttons themselves weren't restructured onto the shared `Button` atom — that would touch most of a 1350-line file for a stylistic-consistency gain and was judged out of scope for this pass; the icon inconsistency was the concrete, repeatedly-cited complaint and is now fixed.

**6. Added a proper 404 page** (`app/not-found.tsx`) — previously there was none, so unmatched routes fell through to Next's generic default page outside the app's visual language. New page uses the same `BackLink` + `Panel` + `Button` + `page-title` conventions as the rest of the app, keeps the navbar (via the root layout), and returns a real `404` status (verified: `curl`/browser navigation to an unknown path now returns HTTP 404 with the styled page, not Next's default).

**7. Restored hover states on several pieces of chrome that had none** — using color/border/background transitions only, no transforms, per the request. Fixed: the primary navbar links and sound toggle (`.nav-destinations a`, `.nav-sound` in `app/globals.css`, previously only had `[aria-current="page"]` styling and nothing for a plain hover), the nav wordmark, the dashboard's Online/Local & solo tab buttons (`.tabs button` in `app/(dashboard)/dashboard.module.css`, previously only had a selected state), and the Join-room/social links (`.join-room-link`, `.social-link`). Left House Rules' existing `filter: brightness(1.15)` button hover and the `.motion-lift` translateY hover (used deliberately elsewhere, e.g. achievement tiles) alone — those already have hover feedback and the second is an intentional, pre-existing, reduced-motion-guarded transform, not a gap.

**8. Loading spinner now waits before showing itself.** `components/atoms/LoadingIndicator.tsx` (used by `app/loading.tsx` and every page-level loading state) takes a `delayMs` prop (default 300ms) and renders nothing until that delay elapses — a fetch/navigation that resolves within 300ms never flashes a spinner; only a genuinely slow load shows one. No test added for this one (timer-gated React rendering, and the repo has no jsdom/RTL rendering setup yet — verified by hand instead, consistent with how other atoms in this codebase are untested).

**9. Unified page-title styling across the app.** Headers were previously three different systems: `.social-page header h1` at 28px (Friends, Join, friend profile), `.page-heading h1` at 36px (Settings, own profile), and ad hoc Tailwind classes ranging 24–36px+ with an inline `style={{color: tokens.wire}}` (Stats, Terms, Privacy). Replaced all of them with one shared `.page-title` class (36px desktop / 28px mobile, `app/globals.css`) applied in `app/settings/page.tsx`, `app/friends/page.tsx`, `app/friends/[id]/page.tsx`, `app/join/page.tsx`, `app/stats/page.tsx`, `app/terms/page.tsx`, `app/privacy/page.tsx`, and `components/profile/ProfileView.tsx`. Terms/Privacy keep their intentional gold accent color via the same inline style, just standardized on size/weight/font now. Deliberately left distinct: the match screen's app-bar-style `<h1>` (small, sits next to a `BackLink` in a persistent header bar, not a page title) and sign-in/sign-out's compact auth-card heading (already consistent with each other, contextually a dialog rather than a page) — and House Rules' own large display-scale `<h1>` (its own internally-consistent "Beta" sub-brand, per the design system review notes above; restyling it was judged separate scope from the icon/button work item 5 asked for).

Verified for all of 2–9: `tsc --noEmit` clean, full `vitest` suite green (no regressions), `npm run build` succeeds, and visually checked in a browser at both desktop and mobile widths (dashboard, House Rules hub, a live local match, the 404 page, and every restyled page header).

### 10. Richer, better-organized stats page (2026-09-10)

**What was there:** a flat "Played/Win rate/Wins/Losses" summary, a plain table of per-game win rates, and — completely disconnected below it — an X01-only throw heatmap. No play-style numbers (3-dart average, checkout %, MPR, etc.) anywhere on the aggregate view, even though the exact same numbers already exist for a *single* match on the post-match summary screen (`PlayerStatTiles`/`PostMatchStats`, via each game module's `matchStats`).

**The correctness problem this had to solve first:** the original aggregate-stats design (`docs/superpowers/specs/2026-09-04-aggregate-stats-design.md`) explicitly scoped a true cross-match average *out*, because naively averaging several matches' already-rounded per-match rates — or concatenating raw visit logs from different matches into one calculation — risks misleading numbers (matches can have different settings, and per-match stats like "best leg" or "first nine darts" don't even have a cross-match meaning). Since this task explicitly asked for exactly that ("3-dart average on x01", "average cricket rounds", "more stats!!!"), the right fix was to actually build the missing piece correctly rather than fake it:

- New `lib/stats/aggregateGameStats.ts` (unit tested, `lib/stats/aggregateGameStats.test.ts`, 10 tests): for each game, accumulates **raw totals** (points, darts, marks, checkout hits/attempts, doubles/trebles hits) across every visit from every match in the period, and only divides once at the end — a properly darts-weighted 3-dart average/MPR/etc., not an average of averages. Deliberately excludes anything leg-scoped (X01's darts/leg, best leg, "first nine") — those only mean something within one match, and mixing legs from different matches would silently merge unrelated data. Copycat's "double finish" stat is evaluated per-match (each match keeps its own `firstTo` setting) before being summed, so a difference in match settings can't corrupt the count.
- `lib/stats/board.ts`'s `getStatsBoard` now also projects each match's `state`/`settings`/`players`, resolves "you" via the existing `resolveYourPlayerId` (`lib/matchHistory.ts`), filters that match's `state.visitHistory` to your entries, and feeds them into the new aggregator — per period, per game. This works for **local matches too** (not just remote), unlike the existing heatmap query, because it reads from `state.visitHistory` (already persisted at match completion for both modes) rather than the remote-only `visits` collection.
- New per-game sections replace the old flat table: a card per played game (X01/Cricket/Copycat), accent-colored to match its identity elsewhere in the app (`components/profile/StatsBoard.tsx`), each showing Played/Wins/Win rate plus a tile grid of that game's own play-style stats — 3-dart avg, checkout %, best visit, high checkout, 180s/140s/100s, busts, doubles/trebles % for X01; MPR, total marks, points scored for Cricket; avg visit, points won, match %, double finishes for Copycat. The X01 throw heatmap now lives inside the X01 card instead of floating separately below everything.
- `compact` mode (used on your own profile page) is unchanged — still just the four summary numbers, no cards. Friend-profile and the full `/stats` page both get the new cards.

**Verified:** the aggregator's math is unit-tested directly (weighted-average correctness, checkout attempt/hit counting, band counting, cross-match copycat settings handling). End-to-end wiring was verified against the real dev database: played a real local X01 match to completion through the browser (301, checkout on D20 — "Match Complete!" screen showed 3-dart avg 129.0, checkout % 50%, high checkout 40, best visit 180), then ran `getStatsBoard` directly against a clone of that same match's real persisted state, attributed to a real user id — the aggregate output matched the in-match numbers exactly (`avg3Dart: 129`, `checkoutRate: 50`, `highestCheckout: 40`, `bestVisit: 180`, `visits180: 1`), confirming the whole pipeline (DB query → player resolution → visit filtering → aggregation → API → component) end to end. This bypass was necessary because this sandbox's dev-login only fakes the *client-side* session check (`/api/auth/session`, via `proxy.ts`) — it doesn't produce a real session for server-side `auth()` calls, so no authenticated route (not just this one) can be driven through the actual browser UI here. That's a pre-existing dev-environment limitation, not something introduced by this change — worth noting since the earlier "Coding practices" finding above said no `middleware.ts` exists; that finding is now known to be stale, since Next 16 renamed it to `proxy.ts` (`proxy.ts` at the repo root) and the app does use it, exactly for this dev-login shim.

`tsc --noEmit` clean, full `vitest` suite green (298 passed, up from 288 — 10 new), `npm run build` succeeds.

## Topic tracker

| Topic                           | Status | Work                                                                                   |
| ------------------------------- | ------ | -------------------------------------------------------------------------------------- |
| Security and privacy            | Closed | Cookie exposure, guest authentication, match access, local completion, browser caching |
| Server configuration and limits | Closed | Ably payloads, polling frequency, database pools, connection recovery                  |
| Database structures             | Closed | Indexes, unbounded reads/history, concurrent scoring, trusted completion               |
| Coding practices                | Closed | Error handling, types, tests, deprecated middleware convention                         |
| Design system                   | Closed | Shared loading state, rarity palette, focus and motion                                 |
| Navigation                      | Closed | Local play discoverability, active destinations, failure recovery                      |
| Wording                         | Closed | Plain language and removal of sentence dashes in visible copy                          |
| Transitions and animation       | Closed | Board-themed loading, restrained entrances, reduced motion                             |
| Game action toasts              | Closed | Turn changes and game-specific prompts                                                 |
| Achievement rarity              | Closed | Restore common green, rare blue, epic purple, legendary gold                           |
| Local play, 2 to 8              | Closed | Creation, validation, names, storage, scoring, desktop/mobile layouts                  |

Closed means the topic has been investigated and findings are recorded below or in "Larger findings requiring follow-up". Closed does not mean fixed — no code changes were made as part of this review, per the scope note above. New minor findings surfaced while closing these topics are listed per topic below; anything worth fixing should move to the backlog or a follow-up task.

## Findings by topic

### Security and privacy

- Guest cookie: `httpOnly`, `secure` in prod, `sameSite: 'lax'` (`lib/identity.ts:43-54`). Solid.
- Guest auth: HMAC-signed guest IDs, constant-time verification, UUID validation before trust (`lib/guestToken.ts:9-21`). Solid.
- Match access: seat/host/user ownership checked before granting access or Ably tokens (`lib/matchAccess.ts:6-11`, `app/api/ably/token/route.ts:23-28`). Solid.
- Local completion / trusted completion: already covered by Larger finding #2 below.
- Browser caching: `Cache-Control: private, no-store` on stats, polling uses `cache: 'no-store'` (`app/api/user/stats/route.ts:11`, `hooks/useRemoteMatchSync.ts:20`). Solid.
- New minor finding: `app/api/debug/cookies/route.ts` is a dead stub that never reflects cookies (always 404). Not a risk, but should be deleted or renamed since it does nothing useful.
- New minor finding: `app/api/auth/test-login/route.ts:47-53` sets a non-httpOnly `__dev-user-id` cookie, and `lib/auth.ts:70-79` trusts `token.__devLogin` to mint a full session. Gated by `NODE_ENV !== 'development'` in both places, so it's a single-line-of-defense (one env var) for a full auth bypass. Worth a test that asserts it fails outside development.

### Server configuration and limits

- Ably payloads: already covered by Larger finding #6 (constant-size `{refresh:true}` messages, `lib/realtime.ts:30-38`).
- Polling frequency: adaptive (30s connected, 5s degraded), coalesces overlapping fetches, pauses when the tab is hidden (`hooks/useRemoteMatchSync.ts:14-65`). `components/organisms/PlayAgain.tsx:39` polls every 3s but only while visible, on a rarely-hit route — low risk.
- Database pools: `maxPoolSize: 10` per client, and two separate clients (Mongoose in `lib/db.ts`, native `MongoClient` in `lib/mongodb-client.ts`) per server instance (`lib/dbOptions.ts:1-9`). No enforced global cap; in serverless/multi-instance deployment this could exceed the Atlas tier's connection limit. This reinforces Larger finding #6 rather than being new — confirm pool totals against live dashboards.
- Connection recovery: connection promises are cached globally in dev to avoid HMR reconnect storms, and failed attempts clear the cached promise so retries aren't stuck (`lib/db.ts:13-21`, `lib/mongodb-client.ts:17-24`). Solid.

### Database structures

- Indexes cover the actual query patterns in use (`lib/db/models.ts:35-38` for Match, `:64-65` for Visit). Solid.
- Unbounded reads/history: already covered by Larger finding #4; confirmed concretely at `app/api/matches/history/route.ts:32` (`Match.find(query).sort(...)` with no `.limit()`).
- Concurrent scoring: already covered by Larger finding #1; confirmed concretely at `app/api/matches/[id]/throws/route.ts:37-72` (read/mutate/`match.save()`, no revision check).
- Trusted completion: already covered by Larger finding #2; confirmed at `app/api/matches/[id]/complete/route.ts:21-30,46-49` (`state` is only type-checked, not schema-validated, before being persisted as final).

### Coding practices

- Error handling is consistent across API routes: typed error JSON, correct status codes, no stray logging except appropriate dev/error cases. Solid.
- Types: `strict: true` in `tsconfig.json:7`; `: any` appears in ~9 files (`store/match.ts`, `lib/matchThrows.ts`, `lib/games/x01/checkoutSuggestion.ts`, a few components) but none in the security-sensitive files reviewed. Worth a follow-up tightening pass, not urgent.
- New minor finding: no route-handler-level tests exist for any `app/api/matches/**` endpoint (only `share-image/route.test.ts` exists among API routes). Core logic is unit-tested at the `lib/` layer (`lib/matchThrows.test.ts`, `lib/matchLobby.test.ts`, `lib/matchHistory.test.ts`, `lib/rematch.integration.test.ts`), which covers most business logic but leaves request parsing/validation/status codes in routes like `complete/route.ts` and `throws/route.ts` unverified by automated tests.
- Deprecated middleware convention: **correction (2026-09-10, discovered while building item 10 below) — this finding was wrong.** There is no `middleware.ts`, but the app does use Next's middleware mechanism: `proxy.ts` at the repo root, Next 16's renamed convention for it. It's small and dev-only (intercepts `/api/auth/session` to fake a session response for the `__dev-user-id` test-login cookie), but it exists and runs on every request matching `/api/auth/session`. Worth knowing: that dev-login shim only fakes the *client-side* session check — it does not make `auth()` return a session server-side, so no authenticated route can actually be exercised end-to-end through dev-login in the browser (server-side `auth()` sees no session at all). That's a real gap in the dev-login tool itself, separate from anything about middleware.

### Design system

- Shared board-themed `LoadingIndicator` (`components/atoms/LoadingIndicator.tsx:1-12`) is reused consistently across dashboard, match, friends, stats, and profile. Solid.
- New minor finding: the dashboard's initial games grid uses a plain `animate-pulse` skeleton instead of the shared spinner (`app/(dashboard)/page.tsx:326-330`) — inconsistent with the shared loading component used elsewhere, and not gated by reduced-motion (see Transitions below).
- Focus states are consistent site-wide via a global `:focus-visible` rule plus component-specific rings (`app/globals.css:176,464`).
- Motion primitives are minimal and consistent (`page-enter`, `oche-loading-ring`).
- Achievement rarity palette: see the dedicated topic below.

### Navigation

- New finding: local play is not directly reachable from primary nav (`components/AppNavigation.tsx:10-14` only has Play/Friends/Stats/Account). It's nested under Play → "Local & solo" tab, which is not the default tab (`app/(dashboard)/page.tsx:145` defaults to `'multiplayer'`), so it takes an extra click every visit.
- New finding: failure recovery is minimal. `app/(match)/match/[id]/page.tsx:519-520` and `app/join/[code]/page.tsx:14,28,38-41` render a bare centered error string with no retry/back action and no shared nav chrome. There is no app-wide `not-found.tsx` or `error.tsx` boundary anywhere in `app/` — matches backlog item #6 (proper 404 page), no new backlog entry needed.

### Wording

- Two visible-copy sentence dashes found: `lib/games/cricket/components.tsx:118` (`Closed out — need {pointsBehind} more point...`) and `lib/games/copycat/components.tsx:51` (`Match point — finish on a double`).
- `lib/games/x01/stats.ts:143,148,151-152` use `—`/`–` as an empty-value placeholder and for numeric ranges (`100–139`) — standard typographic usage, not sentence dashes, fine to leave.
- All other dash hits are in code comments/JSDoc, not user-visible.

### Transitions and animation

- Board-themed loading is reused, not a generic spinner (see Design system). Good.
- `prefers-reduced-motion` is respected in several places (`app/globals.css:117,409,465,473-474`). Coverage looks solid.
- Same minor finding as Design system: the dashboard skeleton (`animate-pulse`) isn't gated by reduced-motion and isn't the shared board-loading style.

### Game action toasts

- `TurnToast` (`components/organisms/TurnToast.tsx`) renders in-flow within the match layout, auto-dismisses after 3500ms, and respects reduced motion.
- `AchievementToast` (`components/organisms/AchievementToast.tsx:32-46`) is fixed top-right, mounted globally.
- Current state relative to backlog item #2 (not fixed here, just noted): neither toast is centered above the dartboard today — `TurnToast` sits wherever `turn-toast-region` is placed in the match layout, and `AchievementToast` is pinned top-right.

### Achievement rarity

- Current values (`lib/theme.ts:62-67`): common — slate background, green border (`#1B7F5A`); rare — slate background, blue border (`#3B82F6`); epic — slate background, purple border (`#A855F7`); legendary — gold-ish `wire` background (`#C0A15C`), gold border (`#FFD700`).
- Rare, epic, and legendary already match the desired palette. Common only carries green via its border; its background is the same slate as rare/epic, so it isn't visually distinguished as "green" beyond the border accent, unlike legendary's dedicated `wire` background treatment. Worth deciding whether common should get its own tinted background to read as clearly green.

### Local play, 2 to 8

- Creation: dashboard "Local & solo" tab builds a `playerNames` array (2–8, add/remove disabled at bounds) and posts to `/api/matches` (`app/(dashboard)/page.tsx:142,222,396-409`); server re-validates independently via `LocalPlayerNamesSchema` against the game's actual player range, not just a hardcoded 2–8 (`app/api/matches/route.ts:41-47`). Solid.
- Validation: names are trimmed, 1–32 chars, 2–8 count, covered by tests (`lib/localPlayers.ts:3`, `lib/localPlayers.test.ts:9-15`).
- New minor finding: no uniqueness check on local player names, client or server. Turn attribution uses seat index, not name, so this is cosmetic — but duplicate names make scoreboards/toasts ambiguous (e.g. two players both named "Player").
- XSS: names render through normal JSX interpolation, no `dangerouslySetInnerHTML` in `app/`. Safe.
- Names/storage: seat 0 is bound to the logged-in user; other seats are unauthenticated guests with no `userId` (`lib/localPlayers.ts:5-10`, `app/api/matches/route.ts:58`). Names persist server-side on the `Match.players` doc; client-side `localStorage` caching (`lib/localMatchStorage.ts`) is a best-effort offline/pending-completion aid, not the source of truth, and failures are swallowed safely.
- Scoring: turn rotation, undo, and per-seat state verified for 2–8 players across x01/cricket/copycat (`lib/localPlayers.test.ts:23-49`). Local completion still goes through the client-trusted flow in Larger finding #2 — no new instance beyond what's already documented.
- Desktop/mobile layouts: CSS-driven toggle (`app/globals.css:159,174,186,190`), `MobileMatch.tsx` scales correctly to N players, desktop layout switches to a compact opponents view for >2 players and rotates the "your board" slot to whoever is on throw (`app/(match)/match/[id]/page.tsx:570-669`). No structural gaps found.

## Larger findings requiring follow-up

1. **High: remote scoring uses read/modify/save without a revision check.** Throws and undo can race, lose a dart, or write a Visit that disagrees with match state. Introduce revision-based compare-and-swap and request idempotency across both operations, with transaction/outbox handling for Visit and achievement writes. Verify concurrent requests against an isolated database before rollout.
2. **High: local completion trusts client game state.** Ownership is necessary but does not prevent fabricated statistics and achievements. Replay submitted physical throws with the deterministic engine and enforce roster/settings, outcome, and payload limits. Treat physical hits as self-reported even after replay validation.
3. **High: no shared rate limiter or explicit body limits on application APIs.** Anonymous room creation/join, image generation, and scoring can consume database/compute quotas. Add a distributed limiter with per-identity and per-IP budgets, bounded request bodies, and measured deployment limits. An in-memory counter is insufficient across server instances.
4. **High: growing match documents and unbounded history/stat queries.** Full visit/undo history is embedded in Mixed state and loaded on refresh. History loads all completed matches before processing; stats also scans all matches. Introduce server pagination, projections, aggregate rollups, bounded undo, and archival. Measure query plans and document sizes against realistic long matches.
5. **Privacy: policy promises account deletion and contact through the site, but no deletion/contact flow is implemented.** Product owner must specify contact details, retention, hosting/processors, and deletion semantics for shared match records. Review the resulting policy against actual operations. Do not claim compliance from this code review.
6. **Operational: deployment quotas and production metrics are not in this repository.** Confirm Ably plan connection/message quotas, hosting function concurrency/timeouts, MongoDB tier/region and pool totals with live dashboards. Existing constant-size Ably invalidation messages solve payload growth, not every capacity limit.

## Validation

Pending. Record test counts, build/type checks, browser coverage, and any environment limitations below.
