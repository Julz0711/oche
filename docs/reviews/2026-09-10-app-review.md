# App review, 10 September 2026

Scope: whole repository, server configuration, data model, security and privacy, navigation, design consistency, copy, motion, action prompts, rarity colours, and local play for 2 to 8 players. No production changes or live database writes are part of this review.

## Backlog

I will add new topics here. Please take them and move them to the tracker.

1. Leave active games. Currently only the host can delete a game, and it will be stuck on the other end, until deleted.
2. Game action toast should be above the darboard an in the center
3. On Solo Rougelike game card on the dashboard is a little arrow in top right corner, remove it.
4. On desktop, house rule hub should be accessible through the navbar. the hub still has some design elements that do not match the rest of the app. e.g. there is arrow pointing left, that doesnt fit other navigation elements
5. in house rule, the buttons are kind of all over the place. many different arrows are getting used. please streamline the icon usage and button designs
6. proper 404 page
7. buttons missing hover effects now. add some hover states, but without any transforms
8. custom loading spinner should only appear on larger loading times like initial page loading, not on simple navigations that take little to no time -> with the spinner it annoys more. can we jsut leave blank on quick refreshes like navigation?

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
- Deprecated middleware convention: resolved, not an issue — no `middleware.ts` exists anywhere in source (only stale `.next` build artifacts). The app doesn't use Next.js middleware at all.

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
