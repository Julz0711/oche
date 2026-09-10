# App review, 10 September 2026

Scope: whole repository, server configuration, data model, security and privacy, navigation, design consistency, copy, motion, action prompts, rarity colours, and local play for 2 to 8 players. No production changes or live database writes are part of this review.

## Backlog

I will add new topics here. Please take them and move them to the tracker.

1. Leave active games. Currently only the host can delete a game, and it will be stuck on the other end, until deleted.
2. Game action toast should be above the darboard an in the center
3. On Solo Rougelike game card on the dashboard is a little arrow in top right corner, remove it.
4. On desktop, house rule hub should be accessible through the navbar. the hub still has some design elements that do not match the rest of the app. e.g. there is arrow pointing left, that doesnt fit other navigation elements
5. in house rule, the buttons are kind of all over the place. many different arrows are getting used. please streamline the icon usage and button designs

## Topic tracker

| Topic | Status | Work |
| --- | --- | --- |
| Security and privacy | In progress | Cookie exposure, guest authentication, match access, local completion, browser caching |
| Server configuration and limits | In progress | Ably payloads, polling frequency, database pools, connection recovery |
| Database structures | Reviewing | Indexes, unbounded reads/history, concurrent scoring, trusted completion |
| Coding practices | Reviewing | Error handling, types, tests, deprecated middleware convention |
| Design system | Pending | Shared loading state, rarity palette, focus and motion |
| Navigation | Pending | Local play discoverability, active destinations, failure recovery |
| Wording | Pending | Plain language and removal of sentence dashes in visible copy |
| Transitions and animation | Pending | Board-themed loading, restrained entrances, reduced motion |
| Game action toasts | Pending | Turn changes and game-specific prompts |
| Achievement rarity | Pending | Restore common green, rare blue, epic purple, legendary gold |
| Local play, 2 to 8 | In progress | Creation, validation, names, storage, scoring, desktop/mobile layouts |

## Larger findings requiring follow-up

1. **High: remote scoring uses read/modify/save without a revision check.** Throws and undo can race, lose a dart, or write a Visit that disagrees with match state. Introduce revision-based compare-and-swap and request idempotency across both operations, with transaction/outbox handling for Visit and achievement writes. Verify concurrent requests against an isolated database before rollout.
2. **High: local completion trusts client game state.** Ownership is necessary but does not prevent fabricated statistics and achievements. Replay submitted physical throws with the deterministic engine and enforce roster/settings, outcome, and payload limits. Treat physical hits as self-reported even after replay validation.
3. **High: no shared rate limiter or explicit body limits on application APIs.** Anonymous room creation/join, image generation, and scoring can consume database/compute quotas. Add a distributed limiter with per-identity and per-IP budgets, bounded request bodies, and measured deployment limits. An in-memory counter is insufficient across server instances.
4. **High: growing match documents and unbounded history/stat queries.** Full visit/undo history is embedded in Mixed state and loaded on refresh. History loads all completed matches before processing; stats also scans all matches. Introduce server pagination, projections, aggregate rollups, bounded undo, and archival. Measure query plans and document sizes against realistic long matches.
5. **Privacy: policy promises account deletion and contact through the site, but no deletion/contact flow is implemented.** Product owner must specify contact details, retention, hosting/processors, and deletion semantics for shared match records. Review the resulting policy against actual operations. Do not claim compliance from this code review.
6. **Operational: deployment quotas and production metrics are not in this repository.** Confirm Ably plan connection/message quotas, hosting function concurrency/timeouts, MongoDB tier/region and pool totals with live dashboards. Existing constant-size Ably invalidation messages solve payload growth, not every capacity limit.

## Validation

Pending. Record test counts, build/type checks, browser coverage, and any environment limitations below.
