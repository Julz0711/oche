# House Rules implementation

The design source is `solo-roguelike-plan.md`. Implementation uses isolated solo routes and storage so existing multiplayer changes can proceed independently.

1. Deterministic engine: 72 catalogue effects, 3/5/2 slots, nine rounds, three bosses, seeded shops and House Numbers, coin accounting, corrections and replay.
2. Playable responsive UI: setup, round preview, scoring, shops, loadout management, consumables, results, catalogue, refresh-safe local saves.
3. Friends competition: weekly challenges, authenticated attempt creation, idempotent server-replayed results, accepted-friend visibility, tied ranks and build details.
4. Verification: engine and persistence tests, leaderboard policy/repository checks, TypeScript and desktop/mobile browser flows. Balance values remain provisional; a real-board playtest is required before calling this a balanced release.

No deployment or changes to existing match results are part of this implementation.

## Implemented and verified

- `/solo` is linked from the dashboard and runs the actual game rather than the earlier static examples.
- All 72 catalogue effects are in the purchase pool. Three fixed virtual darts, five shared charms, two consumables, positional swaps, sales, rotating numbers, capped income, and extra-dart rules are implemented.
- Runs have nine encounters with Bouncer, Wanderer, and Minimalist as the three bosses. Score corrections, partial visits, powerup cancellation before throwing, and committed results replay deterministically.
- Saves contain configuration and canonical actions, with a revision check for stale tabs, previous-save recovery, and JSON export. Ranked runs retain the server-created attempt configuration.
- Weekly leaderboard: signed-in attempt creation, immutable/idempotent result submission, server replay, version/difficulty separation, best completed attempt per friend, shared ranks, and freshly authorized encounter detail access.
- Verification: 76 focused unit tests; two isolated MongoDB integration tests; TypeScript; full repository unit suite (262 passed before the final added refresh regression); desktop/mobile browser flows; a complete winning nine-round browser journey with purchases and all three bosses; two temporary signed-in friend fixtures submitting, tying, opening details, and losing visibility after friendship removal. All fixture records were removed afterward.

## Next milestone: real-board playtesting

Play actual Social, Regular, and Expert runs and tune target curves, item prices, economy payback, and extra-dart session length. The software checks establish rule consistency, not game balance. Record at least one singles build, doubles build, economy build, and House Number build.

Future work remains: in-progress cross-device sync, unlock progression, more bosses, and Endless Mode. The current result screen and private weekly friends leaderboard are playable now. The original static UI examples are retained as design references and have not been rewritten to match every implementation change.


### Solo hub and multiple local runs

`/solo` opens a hub with in-progress runs and past results. New runs get independent browser-storage entries; switching runs preserves recorded darts, shops, and builds. Existing single-run saves and archived results are copied into the library without deleting the originals. Revision checks and backups are scoped to each run.

End run requires an explicit confirmation. Abandoned runs remain in the local history, cannot be resumed, and are not submitted to the friends leaderboard. Completed weekly runs can still be opened from Past runs for submission. Cross-device synchronization remains future work.
