# Oche: House Rules — solo roguelike proposal

Status: first playable beta implemented at `/solo`; see `solo-implementation.md` for completed work, verification, and remaining milestones. This document remains the design target. All targets, prices, and effects below are initial balancing values, not validated difficulty settings.

UI examples: open [the interactive concept](../public/ui-examples/house-rules.html) directly in a browser, or visit `/ui-examples/house-rules.html` when Oche is running. It includes round scoring, a shop, a boss preview, and a victory summary, with responsive mobile layouts. These are isolated sample scenes, not a complete run implementation: purchases update the shop and boss budget preview; the playable boss example uses its own fixed scoring build and carries over Deep Pockets only. No accounts or saved game data are accessed. Desktop and mobile captures are under `output/playwright/house-rules-*.png`. The examples predate the five-charm-slot, rotating-number, and friends-leaderboard revisions; update their layouts when implementing this revised plan.

## 1. The pitch

Turn a session at your real dartboard into a run through a strange darts house. Beat rising score targets, spend winnings on enchanted darts and charms, and defeat opponents who change the rules of the board.

The central decision: **where should I aim with this build, against this boss, with these darts remaining?**

Take inspiration from Balatro's escalating requirements, limited equipment slots, shops, and surprising scoring combinations. Give Oche its own identity through physical aiming, three-dart sequences, and a cast of pub-league rivals.

You use your normal physical darts and board. “Improved darts” are virtual equipment that changes how recorded hits score. No special hardware or physical dart swapping is required.

## 2. Run structure

- One run has three acts, each containing two normal rounds and one boss: nine rounds total.
- Each round starts with a budget of 12 physical darts. Equipment and powerups can increase that budget, including during the round.
- Reach or exceed the target to win. No exact finish and no bust rule.
- Throw in visits of up to three darts. Resolve scoring and check victory after each completed visit, including a final visit of one or two darts. Unused darts disappear when the round ends.
- A shop follows each cleared round except the final boss, which opens the victory screen.
- Fail a target when the dart budget is exhausted after resolving any earned extra darts, and the run ends. Practice mode can offer retries later.
- Aim for a 20–35 minute baseline session, subject to physical playtesting. Extra-dart builds will take longer: nine rounds allow 108 baseline throws and up to 216 at the proposed budget cap, plus eight shop stops.
- Save after every input and purchase; allow stopping and resuming anywhere.

Loop: **preview challenge → throw and record visits → resolve score → collect reward → shop → next challenge**.

Show the next boss and its rule from the start of each act, including in every shop. The player needs time to prepare.

### Starting difficulty

Offer Social, Regular, and Expert target presets, all with the same equipment and bosses. Choose once before starting; do not secretly change difficulty during a run.

Use Regular for the first prototype:

| Act | Round 1 | Round 2 | Boss |
| --- | ---: | ---: | ---: |
| 1 | 150 | 210 | 270 |
| 2 | 360 | 480 | 630 |
| 3 | 820 | 1,060 | 1,400 |

These are modified game points. Without upgrades, an average of 45 physical points per visit produces 180 points in four visits. Later targets intentionally require a functioning build. Start Social at 70% and Expert at 130% of these targets, then tune all three through playtests. Boss variants need individual target tuning because their restrictions differ.

## 3. Scoring that stays understandable

Keep two distinct measurements: **board score**, the real value of the hits, and **run score**, the points produced by equipment and challenge rules. Keep physical darts statistics accurate.

For each visit:

`visit run score = floor((eligible board points + bonus points) × (1 + multiplier bonuses) × amplifier)`

Resolution order:

1. Read the visit's one to three actual hits; derive physical points from sector and ring.
2. Apply boss restrictions to determine eligible hits. A disabled hit remains in the physical throw log but generates no run points or equipment triggers.
3. Apply equipment and charm triggers to eligible physical hits, adding bonus points and multiplier bonuses.
4. Apply at most one equipped amplifier, then round down once.
5. Apply explicit visit-wide vetoes such as Gatekeeper, add the result to the round total, and check the target. If the round has not been won, resolve earned dart grants before checking exhaustion.

Ordinary multipliers add together. A `+0.5` and a `+1` yield `×2.5`, not `×3`. Reserve multiplicative amplifiers for a clearly labeled rare item category, limited to one equipped item. Effects do not retrigger themselves or other effects; additional points are not additional hits. Explicit miss-triggered recovery effects are exceptions to the scoring-hit requirement, but never turn a boss-disabled hit into a miss.

Example: S20, S20, S5 produces 45 board points. A charm adds 10 for each single (+30), and another adds +1 multiplier for repeating a numbered sector. Result: `(45 + 30) × 2 = 150 run points`.

The UI explains this in one line: **45 board + 30 bonus · ×2 = 150**. Expand for individual effects. Never ask the player to do the arithmetic.

## 4. Equipment and build choices

### Three virtual dart slots

Use exactly three virtual dart slots, five shared charm slots, and two consumable slots. The virtual dart limit cannot increase through normal progression: it represents the physical three-dart visit, not the round budget.

Each visit uses virtual darts 1, 2, and 3 in that order. Their effects follow recorded throw order, regardless of which physical dart is held. Rearrange equipment in the shop; lock it during rounds.

Each slot starts with a Standard Dart and holds one replacement. Examples:

| Dart | Effect on its assigned throw |
| --- | --- |
| Steady Dart | A single adds 12 bonus points. |
| Heavy Dart | Any scoring hit adds 8 bonus points. |
| Precision Dart | A numbered double adds 30 bonus points. |
| Bull Dart | An outer or inner bull adds 40 bonus points. |
| Echo Dart | Repeating the previous throw's numbered sector adds 20 bonus points; inactive in slot 1. |

Purchased darts last for the run. Start with replacement equipment; add upgrade levels only after testing the core economy. Later levels could improve an existing effect, with the new value shown before purchase.

### Five shared charm slots

Charms apply across the loadout and create the main combinations. Start with five available slots and one chosen starter charm. All persistent non-dart effects share these slots: scoring, multipliers, amplifiers, extra darts, economy, shop modifiers, and utility. There are no separate free economy or utility slots; the single equipped amplifier limit still applies within these five slots. Example content:

| Charm | Effect |
| --- | --- |
| Single Minded | Each eligible single adds 10 bonus points. |
| Double Trouble | Each eligible numbered double adds +0.5 visit multiplier. |
| Familiar Ground | Two or more eligible hits on the same numbered sector add +1 visit multiplier, once per visit. |
| Grand Tour | Three eligible, different numbered sectors add +1 visit multiplier. |
| Odd Company | Each eligible odd numbered hit adds 12 bonus points. |
| Bull Market | Each eligible bull adds +1 visit multiplier. |
| Finisher | If dart 3 is eligible and worth at least 20 board points, add +0.75 visit multiplier. |
| House Special | Amplifier: ×1.5 if all three darts are eligible scoring hits. |

Use explicit terminology: “single” means S1–S20; “numbered double” means D1–D20; bulls have their own category. Misses never count toward repetition or variety. Unless stated otherwise, an effect applies once per qualifying physical dart.

Offer three starter choices: Single Minded, Double Trouble, or Grand Tour. They establish consistency, precision, and variety builds immediately.

### Two consumable slots

Consumables are part of the planned release, including powerups that grant extra darts. Use a small selection in the first prototype. Activate them only in round preview or between visits, before throwing the affected visit. Never activate them after recording a visit that has already exhausted the budget and produced a pending result. Equipping and buying remain shop-only actions.

### Extra darts and partial visits

- Start with 12 darts; flat equipment grants apply at round start. Conditional grants apply after resolving a visit. Consumables grant darts on activation.
- Cap the total granted budget at 24 darts per round, including the initial 12 and all sources. Spending darts does not reopen capacity. Preview truncation, and prevent consuming an item solely for a dart grant when already capped.
- A visit's size is fixed when it starts: `min(3, remaining darts)`. Grants earned during that visit become available for the next visit; they do not extend a visit already thrown.
- Example: +2 darts yields four visits of three followed by one visit of two. +3 yields five full visits. The physical player retrieves their usual darts between visits.
- Each new visit starts at virtual dart slot 1. A two-dart visit uses slots 1 and 2. Third-dart and explicitly three-hit effects cannot trigger in a partial visit; per-hit effects still work.
- Extra physical darts can trigger equipment normally, but each conditional grant has a once-per-round limit. There are no free replayed hits or unbounded extra-dart loops.
- The interface shows **darts remaining** first, plus the size of the next visit and each source of extra darts. Announce earned darts after visit resolution.
- Fixed spending order for reward accounting: consume the baseline 12 darts first. Early-clear coins use only unspent baseline darts: `min(2, floor(unspent baseline darts / 3))`. Buying more darts cannot create additional early-clear income.
- Show both total budget and spent darts in the run log. Corrections replay grant triggers and counters deterministically; if a correction invalidates later visits' available darts, discard that dependent suffix after a clear confirmation.

Extra darts are a full build direction, competing for equipment slots with stronger scoring effects. Do not automatically raise an individual run's targets to cancel out purchased dart upgrades.

Avoid accuracy promises, instructions to throw harder, time pressure, or unusual throwing stances. The strategy belongs in the choice of targets and equipment.

## 5. The shop and economy

- Start with 4 coins, awarded into the first shop together with the first round's winnings.
- Normal round reward: 5 coins. Boss reward: 8 coins.
- Early-clear bonus: 1 coin per three unspent baseline darts, capped at 2; extra darts never increase this reward.
- Shop offers two charms, two dart replacements, and one consumable, selected from seeded pools.
- Initial prices: basic darts 4–6 coins, common charms 5–7, rare charms 8–10.
- Extra-dart charms start at 7–10 coins; consumables at 3–5. Unconditional +3-dart equipment should cost more than conditional +1-dart equipment. All prices need playtesting.
- Refresh all unpurchased offers for 2 coins; subsequent refreshes in that shop cost 1 more each.
- Sell purchased equipment for half its paid price, rounded down; starter equipment sells for zero.
- Purchases cannot be duplicated from the same offer. No duplicate charms in the initial version.
- If a slot is full, show the replacement and sale value before confirming the transaction.
- Always offer at least one affordable scoring improvement when the shop opens. Validate this against the player's equipment and available coins; a duplicate or unusable replacement does not qualify.
- No interest, debt, paid currency, or permanent starting-power purchases in the first version.

The shop shows the next target, next boss rule, current loadout, and item explanations together. Give players a real tradeoff between a reliable improvement now and saving for a stronger combination.

### Economy as a build archetype

The central tradeoff is: **use this charm slot to become stronger now, or earn more money and become stronger later?** Economy should reward actual hits, efficient clearance, purchasing decisions, and explicit risk-taking. Base round rewards must still support winning without economy equipment.

For example, Single Minded + Familiar Ground + Deep Pockets + Tip Jar + Bargain Hunter fills all five charm slots. Two scoring effects and extra darts help the player survive while two economy effects fund better shops. Additional coin effects require replacing part of that build.

The catalogue adds Double Pay, Loose Change, Cash Bull, Clean Checkout, Coupon Book, Pawn Broker, and High Roller alongside existing economy items. Their conditions support precision, singles, efficiency, shopping, and higher encounter targets. Exact rewards are provisional. Do not silently raise shop prices or targets because a player has accumulated more coins.

Economy-heavy builds should be more vulnerable immediately and have more flexibility later. Selling economy charms to equip scoring effects before a final boss, or deep into future Endless Mode, is an intended strategy. Keep scoring-only builds viable at every difficulty; no economy charm may become a required purchase.

### Coin accounting and shop interactions

- Hit-triggered earnings accumulate as **pending round coins**. Pay them once when a successful round is committed, together with clearance rewards. A failed run has no additional shop or spendable payout. Corrections recompute pending earnings rather than adding them twice.
- Coin rewards are separate from run points: scoring multipliers, amplifiers, and bonus-point doublers never multiply coins. One actual dart can qualify for multiple distinct equipped effects, each subject to its own cap.
- Boss-disabled hits generate no coin triggers. A visit-wide scoring veto also suppresses that visit's coin triggers and its contribution to coin-effect counters. Non-coin dart grants retain their existing rules.
- Extra darts can earn hit-based coins within each item's cap. Early-clear effects use only unused baseline darts. Round clearance ends play immediately after visit resolution; the player cannot keep throwing to farm coins after reaching the target.
- Freeze shop modifiers from the equipped loadout at shop entry. Their benefit persists for that shop even if sold; purchases activate starting with the following shop. This gives a predictable final use when converting an economy build into scoring equipment.
- Apply all applicable purchase discounts together, then enforce a minimum price of 1 coin. Bargain Hunter and Coupon Book can combine on the first purchase if it is a consumable; both counters are consumed. Refresh costs are separate from item purchase discounts.
- Pawn Broker initially raises resale from 50% to 75% of the amount actually paid, rounded down. Starter equipment still sells for zero. Discounted purchases never resell for their undiscounted price, and resale cannot exceed paid price. Sold items leave the inventory and are not re-added as offers.
- High Roller offers an explicit preview toggle: raise the target by 20%, rounded up, for +3 clearance coins. Lock the choice before the first throw; show both values before confirmation. No payout on failure, no stacking or repeated activation, and no extra leaderboard credit merely for raising the target.
- On the final boss, flag that clearance coins will have no spending value in a standard run. Do not encourage a risk-only High Roller activation there; disable its wager unless an implemented continuation provides a subsequent shop.

## 5a. Rotating-number charms — the House Number

Each round can give the player a fresh reason to aim somewhere unexpected. **The House Number** is a single highlighted sector from 1–20, fixed throughout the encounter and changed for the next round. It only affects play through equipped charms. The same number drives all rotating-number charms, avoiding several competing targets to remember.

### Recommended first two charms

**House Number — scoring:** every eligible hit on the highlighted number adds 25 bonus points. Singles, doubles, and trebles each trigger it once, with their normal board value retained. This is an easier introduction than a rotating multiplier because the gain is visible on each hit.

**Bounty Board — economy:** every eligible hit on that number earns 1 pending coin, capped at 3 coins per round. Its appeal is a decision: spend a few darts earning money on the bounty, then switch to your strongest scoring target to survive. A double or treble still earns one coin, not two or three.

Example: the House Number is **5**. With both charms equipped, S5, S5, D5 gives 20 board points + 75 bonus points = **95 run points**, plus **3 pending coins**. Other equipped scoring effects can increase those points; none multiply the coins. Once the bounty cap is reached, show “3 / 3 coins earned” so the player knows there is no more income from aiming at 5 this round.

Compared with Home Ground, which lets the player choose a comfortable number for +15 points per hit, House Number pays more for adapting to an assigned target. This is a meaningful choice between control and a stronger conditional reward.

### Selection and timing

- Generate each encounter's number deterministically from run seed, encounter index, rules version, and a dedicated random stream. Shop refreshes, buying/selling a charm, reloading, undoing, and preview toggles cannot change it. Generate the sequence independently of equipped items so shared challenge runs get the same sequence.
- Select uniformly from eligible numbers, excluding the previous round's number so it actually changes every round. Exclude any sector disabled for the entire encounter, such as 20 against the Bouncer. A temporary rotating boss restriction can block the selected number for a visit; display that clearly without rerolling it.
- Generate the number after the encounter rule is known. Reveal the next number in the preceding shop and on its rotating-charm offers, then prominently in round preview. For round 1, reveal it at setup. Do not expose the full future sequence in the normal UI.
- Keep that number fixed for all visits, partial visits, extra darts, and consumable use. It is a numbered sector, never a bull or miss. Normal boss eligibility and coin veto rules apply.
- If future boss content leaves no eligible choice, reject that encounter/number combination during generation and choose a compatible encounter deterministically. Never offer an impossible bounty or silently waive the boss rule.

### Further variants and useful combinations

- **Hot Number:** hits on the House Number add visit multiplier rather than flat points; a stronger fit with high-base scoring equipment.
- **Encore Number:** hit it three times over the round to earn extra darts once. The player can return to their primary target after completing the objective.
- **Dealer's Choice:** choose a scoring or coin reward for the House Number in preview, then lock that choice for the encounter. Flexible, but individually weaker than the specialist charms.
- **A roaming regular:** Steady Dart + House Number + Familiar Ground rewards repeated singles on a new number each round. Bounty Board can turn the same physical hits into both progress and future spending power.
- **A detour for cash:** Bounty Board beside a doubles build makes the player decide whether a few visits to a low bounty number are worth delaying double-focused scoring.
- **Three targets, one stop:** Grand Tour encourages hitting the House Number once in a three-number visit, then moving on. The rotating target need not force repetition.

Use clear on-screen copy: **“THIS ROUND: 5”**, **“+25 points per hit”**, **“Bounty: 1 / 3 coins”**, and **“Next round: 14”** in the shop. Highlight the sector on the board with a number label and icon, not color alone. This display is separate from the encounter's total score target. Show boss blocking and completed caps directly on the relevant charm.

Prototype House Number and Bounty Board first. Test whether low numbers offer enough compensation, whether high numbers become automatic choices, and whether stacking both makes every other aim uncompetitive. Tune the flat reward and coin caps before adding random jackpots, target rerolls, or per-visit target changes. All five rotating variants have distinct catalogue IDs below; numerical upgrades do not create additional effects.

## 6. Bosses with special rules

Bosses are score challenges with one persistent rule, not simulated opponents taking turns. Present them as rival characters with a large portrait, concise rule, and highlighted board regions.

| Boss | Rule | Strategic response |
| --- | --- | --- |
| The Bouncer | Sector 20 generates no run points or triggers. | Move the build to another number. |
| The Wanderer | After the first hit on a numbered sector in a visit, later hits on that sector are disabled. Bulls remain eligible. | Spread throws across numbers. |
| The Minimalist | Numbered trebles count as singles for run scoring and triggers. Physical stats retain the treble. | Use singles, doubles, or bulls. |
| The Gatekeeper | The visit only scores if it includes a numbered double or bull. | Allocate one throw to opening the scoring gate. |
| The Landlord | Before each visit, visibly disable one of three fixed sector groups, rotating in a known sequence. Bulls remain eligible. | Plan around the displayed board. |

Prototype with Bouncer, Wanderer, and Minimalist. Gatekeeper should initially be Expert-only because one precision requirement can make a casual player's entire visit worthless. Final-boss presentation can use the Landlord once its board overlays are implemented and tested.

Design constraints: preview every restriction; preserve a viable scoring route; avoid combining boss rules initially. Never disable all of the player's equipment. Tune target and restriction together. If a boss still creates unavoidable losses, change the rule or generation constraints rather than hiding it until the encounter.

## 7. Progression and replayability

On defeat, show the reached round, target shortfall, strongest visit, and which equipment produced the most points. Let the player immediately start a new run.

On victory, show the complete build and offer a harder difficulty next time. Endless mode can follow later.

Unlock additional starter choices, charms, bosses, cosmetic dart appearances, and titles through play. Unlocks expand choices rather than permanently raising base scoring power. Keep the initial content pool curated so new unlocks do not simply dilute useful shop offers.

Later: daily seeded challenges, seed sharing, optional challenge routes, endless runs, and weekly boss rotations. Shared challenges must fix difficulty, rules version, and available item pool as well as the seed. Scores remain self-reported because the player records physical throws; do not present them as verified competitive results.

### Friends leaderboard — core release priority

**Competing with friends is a central reason to replay this mode. The friends leaderboard is a release requirement, not a later social extra.** Build it into solo entry and the end-of-run experience, using Oche's existing accepted-friends relationships.

For release, provide a weekly shared-seed challenge and a leaderboard containing the player plus their accepted friends. Keep Social, Regular, and Expert separate. Each weekly challenge pins its seed, boss sequence, content pool, starter options, rotating House Numbers, and rules version. Make the challenge's full item pool available to all participants regardless of personal unlocks. Unlimited attempts are allowed; retain one best finished result per player, with attempt count visible.

Initial ranking proposal: rounds cleared descending, then total **capped encounter progress** descending. For each encounter add `min(earned run points, standard encounter target)`; cleared encounters therefore contribute their standard target, and partial progress distinguishes failed runs. If still tied, fewer physical darts thrown wins. Equal values share a rank. This lets survival lead the ranking and prevents oversized final-visit multipliers or an economy wager from inflating rank. High Roller changes the clearance requirement but not the encounter's ranking cap. Extra-dart builds trade more survival chances against the darts-used tie-break; validate this tradeoff in playtests. Display raw run score and best visit as secondary statistics, not the primary competition metric.

Leaderboard rows show rank, friend name/avatar, rounds cleared, capped progress, physical darts, and completion date. Selecting a row opens the final build, encounter results, and raw/modified scoring breakdown. After a run, show “New personal best,” the player's rank, and the concrete gap to the next friend. Show a friendly empty state linking to the existing Add friends flow. Standard random-seed runs get personal history but do not mix into the shared-seed table. Future Endless Mode needs its own leaderboard.

Only signed-in, finished, server-validated challenge runs enter the board. Guests can practice locally and are prompted to sign in before starting a ranked attempt. Validate the action log by replaying the pinned rules, including hits, purchases, coin caps, target choices, and dart budgets; submission is idempotent per run ID. Repeated submission or post-submission editing cannot create another result. Local corrections are allowed before completion, with their final sequence validated. Physical hits remain self-reported: label the competition accordingly without claiming sensor verification.

Use a documented weekly UTC boundary and show its local equivalent in the UI. Rank by challenge ID, not upload time; a run must finish and be submitted before that challenge closes to count. Offline runs may resume and submit before the deadline; later submissions remain personal history. Show the deadline before starting.

Enforce current friendship access on both leaderboard queries and run details. Removing a friend immediately removes mutual visibility without deleting either person's personal history. Do not expose email addresses, unrelated players, or their friend lists. Test ties, best-result replacement, version/difficulty isolation, deadline handling, duplicate submissions, replay rejection, friendship removal, and access to another user's run details.

## 8. Screens and physical play

1. **Solo entry:** New run / Resume run, difficulty, starter charm, short rules explanation.
2. **Run overview:** nine encounter markers, current equipment, coins, upcoming boss.
3. **Round:** large target and progress, darts remaining and next visit size, boss rule, three virtual dart indicators, five shared charm slots, consumables, current House Number and reward counters when relevant, existing dartboard/keypad input.
4. **Visit result:** automatic score breakdown with a brief skippable effect animation.
5. **Round result and shop:** earnings, equipment offers, clear Continue button.
6. **Run result:** win/loss, physical accuracy, modified points, build, restart, friends rank, personal best, and distance to the next friend.
7. **Friends leaderboard:** current weekly challenge, difficulty filter, best run per friend, your highlighted row, and run/build details. Make it accessible from solo entry and run results.

Players can throw all three physical darts before recording them in order. No required screen interaction between physical throws. Show any order-dependent equipment before the visit begins. Prefer visit-based effects to effects that require live recalculation while holding darts.

Allow correcting recorded darts until the player commits the round result and proceeds to the shop or final result. A pending win/loss must remain editable. Recompute the round deterministically after correction; committed purchases and prior rounds are locked. An editing correction is not permission to physically rethrow a dart.

Respect reduced-motion settings and keep the target readable from the throwing line. Highlight useful targets as optional hints, not forced instructions.

## 9. Fit with the existing app

The repository already has individual `Throw`/`Visit` records, pure game engines under `lib/games`, `DartboardInput`, Zustand state, local persistence, and match statistics. Reuse those foundations where their contracts fit.

Use a dedicated solo run shell and state machine because the existing match flow does not represent shops, equipment changes, and round commitments. Avoid treating purchases as throws or run score as physical dart points.

Proposed implementation boundaries:

- `lib/games/roguelike/`: pure scoring, challenge rules, equipment definitions, seeded shop generation, action validation, replay, and tests.
- `store/soloRun.ts`: current run and explicit actions such as record/correct dart, commit round, buy/sell, refresh shop, and start round.
- `lib/localSoloRunStorage.ts`: versioned local run persistence; keep the last valid save and recover gracefully from invalid data.
- `app/solo/`: setup, resumable run, shops, and results, reusing scoring input and visual primitives.
- Separate signed-in run history and friends leaderboard storage are required for release. Keep roguelike results out of existing head-to-head records and normal match win rates.

State includes run ID, seed, random-generator position, rules/content version, difficulty, starter choice, round, phase, coins, equipment, consumables, shop offers, physical throws, derived scoring events, and committed actions. Track total granted/spent darts, fixed current visit size, grant provenance, per-effect limits, round counters, and pending next-visit effects. Also track the challenge ID/owner for ranked runs, House Number sequence, pending coin ledger, paid purchase prices, frozen shop modifiers and discount counters, High Roller choice, and Dealer's Choice mode. Pin a started run to its rules version so a balance update cannot silently alter an in-progress run.

Phases: `setup → roundPreview → playing → roundResultPending → shop → roundPreview`, with committed final results moving to `won` or `lost`.

Start locally with guest support and refresh-safe resume. Add signed-in run submission and the friends leaderboard before release; full cross-device in-progress saving can follow later, after device-conflict handling is defined. Audit the existing registry and dashboard contracts before deciding whether to register a thin single-player adapter or introduce a separate solo entry.

The first implementation uses dedicated Next.js solo routes; see `solo-implementation.md`. Before further route or component changes, read the relevant installed Next.js guides as required by the repository's AGENTS.md.

## 10. Delivery plan

### A. Prove the game at a real board

Build or manually run a three-round slice: one starter charm, two normal rounds, Bouncer boss, two shops, five scoring charms, three replacement darts, Deep Pockets (+2 darts), and Pocket Dart (+1 dart consumable). Use the proposed scoring calculation and a minimal score breakdown. This is an internal mechanics test, not the full requested content release.

Exit criteria: players understand why points were awarded; at least two builds feel viable; shop choices change aiming decisions; recording scores does not dominate the session. Adjust numbers before producing a large content pool.

### B. Playable solo MVP

Expand to nine rounds, three bosses, three starter choices, and the three difficulty presets. The release content requirement is at least 50 mechanically distinct player effects, excluding bosses and numerical upgrade tiers; the catalogue below proposes 72. Include dart variants, scoring charms, extra-dart equipment, economy items, and consumables. Include local save/resume, corrections, win/loss screens, accurate separation of physical and modified scores, and the release-critical friends leaderboard with signed-in run submission. Implement the 3 / 5 / 2 equipment structure, economy builds, and at least House Number and Bounty Board from the rotating-number family.

Verify deterministic scoring and generation, effect boundaries, boss interactions, invalid purchases, insufficient funds, full slots, final-visit outcomes, correction of a pending result, persistence, and replay. Specifically cover 13/14/15-dart budgets, slot order on partial visits, final-visit dart grants, simultaneous grants and the cap, grant invalidation on correction, early-clear reward accounting, and once-per-round resets. Browser-check a complete run flow, including reload during a round and shop.

Additionally verify exactly three dart slots, five shared charm slots, and two consumable slots; discounts and resale without profit loops; deterministic rotating numbers across reloads and differing shop actions; blocked sectors; coin caps and correction replay; and locked preview choices. End-to-end acceptance includes two accepted friends completing the same challenge, seeing the correct best-result ranking and build details, and losing mutual access after friendship removal. The UI examples need five-slot layouts plus House Number and leaderboard screens before being treated as final designs.

### C. Balance and presentation

Playtest across casual and experienced throwers. Track time spent throwing versus entering scores/shopping, clear rate by round and difficulty, coins earned/spent, purchased items, boss losses, and equipment's contribution to scoring. Test varied recorded throw sequences against seeded runs, including all misses and highly accurate play, without mistaking simulation for real-world enjoyment.

Look specifically for a universally best target, a mandatory item, unwinnable shop sequences, runaway multipliers, and bosses that punish accuracy too heavily. Ship broad content only after multiple build paths can finish the run.

The fifth charm slot increases total build power, so retest existing target curves rather than assuming four-slot balancing still holds. Compare scoring-only, mixed, and economy-heavy builds; measure when an economy purchase repays its cost and whether selling it late is useful. Test low/high House Numbers, stacked bounty/scoring effects, and the leaderboard's darts-used tie-break across extra-dart builds. Track friends-challenge participation and repeat attempts as well as solo clearance rates.

### D. Expand after the core works

Add equipment upgrade levels, more bosses, unlocks, cross-device in-progress sync, daily challenges, and endless mode as demand supports them. Signed-in result history and the friends leaderboard are already required for release. The 50+ effects and extra-dart powerups belong to the initial content release, not this deferred list. Keep branching maps, multiplayer roguelike modes, crafting, and automatic board detection outside the initial scope.

## 11. Effect catalogue — 72 distinct player effects

These 72 effect designs are implemented in the first beta and remain subject to balance changes. Boss rules and future numerical upgrade levels do not count toward the 50-effect minimum. Prices, rarity, and numerical strength remain tunable, but each entry below defines a distinct trigger or behavior.

Catalogue conventions:

- “Hit” means an eligible scoring hit after boss transformations; use transformed run values for conditions unless explicitly labeled physical. Misses and disabled hits are excluded from scoring combinations.
- “Number” means sector 1–20; bulls are separate. “Double” and “treble” mean numbered doubles and trebles. “Bull” includes outer and inner bull.
- “+mult” adds to the visit multiplier. Bonus points enter the scoring formula before multiplication.
- Visit-wide conditions requiring three hits require a full three-dart visit. All run-long equipment effects reset their round counters at each round start.
- Virtual darts occupy one of three dart slots; all persistent charms and utility items share the five charm slots. There are no free utility slots. Consumables occupy the two consumable slots and disappear when used.
- No duplicate persistent effect IDs, including dart variants, in the initial release. This keeps stacking and item explanations manageable.

### A. Dart variants (15)

Each effect applies only to that virtual dart's assigned throw, once per visit at most.

| ID | Name | Effect |
| --- | --- | --- |
| 01 | Steady Dart | A single adds 12 bonus points. |
| 02 | Heavy Dart | Any hit adds 8 bonus points. |
| 03 | Precision Dart | A double adds 30 bonus points. |
| 04 | Bull Dart | A bull adds 40 bonus points. |
| 05 | Echo Dart | Matching the previous dart's eligible number adds 20 bonus points; inactive in slot 1. |
| 06 | Opening Dart | In slot 1, a hit adds +0.5 mult. |
| 07 | Anchor Dart | In slot 3, a hit adds 25 bonus points if both earlier darts were eligible hits. |
| 08 | Climbing Dart | A numbered hit higher than the previous eligible numbered dart adds +0.5 mult; inactive in slot 1. |
| 09 | Neighbour Dart | Hitting a different number adjacent to the previous eligible number in physical board order adds 25 bonus points; inactive in slot 1. |
| 10 | Underdog Dart | A hit on 1–5 adds 25 bonus points. |
| 11 | Prime Dart | A hit on 2, 3, 5, 7, 11, 13, 17, or 19 adds +0.4 mult. |
| 12 | Treble Dart | A treble adds +0.75 mult. |
| 13 | Recovery Dart | A hit immediately after a physical miss in the same visit adds 30 bonus points. |
| 14 | Alternator Dart | A numbered hit of opposite parity to the previous eligible numbered dart adds 18 bonus points; inactive in slot 1. |
| 15 | Growing Dart | A hit adds 4 bonus points for every earlier eligible hit made with this virtual dart this round, capped at 24. |

### B. Scoring charms (25)

| ID | Name | Effect |
| --- | --- | --- |
| 16 | Single Minded | Each single adds 10 bonus points. |
| 17 | Double Trouble | Each double adds +0.5 mult. |
| 18 | Familiar Ground | At least two hits on the same number add +1 mult, once per visit. |
| 19 | Grand Tour | Three different eligible numbers add +1 mult. |
| 20 | Odd Company | Each odd numbered hit adds 12 bonus points. |
| 21 | Bull Market | Each bull adds +1 mult. |
| 22 | Finisher | An eligible dart 3 worth at least 20 board points adds +0.75 mult. |
| 23 | House Special | Amplifier: ×1.5 when all three darts are eligible hits. |
| 24 | Even Company | Each even numbered hit adds +0.25 mult. |
| 25 | Straight Up | Three eligible numbers in strictly ascending throw order add +1.5 mult. |
| 26 | Countdown | Three eligible numbers in strictly descending throw order add 50 bonus points. |
| 27 | Sandwich | Eligible darts 1 and 3 share a number and dart 2 hits a different number: +1.25 mult. |
| 28 | Ring Circus | One single, one double, and one treble, in any order, add +2 mult. |
| 29 | Hat Trick | All three eligible hits share a number: add 60 bonus points. |
| 30 | Around the Clock | Each number's first eligible hit of the round adds 10 bonus points. |
| 31 | Home Ground | Choose a number in round preview; each eligible hit on it adds 15 bonus points. Choice locks before throwing. |
| 32 | Neighbourhood | Three distinct eligible numbers forming a consecutive group around the physical board, in any throw order, add +1.5 mult. |
| 33 | Clean Sheet | A visit with three eligible hits adds +0.25 mult per consecutive full, all-hit visit this round, including this visit, capped at +1. A miss, disabled hit, or partial visit resets the streak. |
| 34 | Second Wind | After a visit containing a physical miss, the next visit adds 30 bonus points if it contains any eligible hit. Does not stack across visits. |
| 35 | Last Orders | A visit that starts with three or fewer remaining darts adds +1 mult if it contains an eligible hit, once per round. |
| 36 | Patient Player | From visit 5 onward, each visit containing an eligible hit adds 20 bonus points. |
| 37 | Small Fortune | A full visit of three eligible hits totaling at most 30 board points adds +2 mult. |
| 38 | Rising Form | A visit's eligible board total exceeding the previous visit's adds +0.75 mult; inactive on visit 1. |
| 39 | Exact Change | An eligible board total of exactly 25, 50, 75, or 100 adds 40 bonus points. |
| 40 | Split Decision | A full visit of three eligible hits including both a number from 1–10 and one from 11–20 adds +0.75 mult. |

### C. Extra-dart and utility items (10)

These occupy charm slots, so extra attempts and income compete directly with scoring upgrades.

| ID | Name | Effect |
| --- | --- | --- |
| 41 | Deep Pockets | Grant +2 darts at the start of every round. |
| 42 | Spare Set | Grant +3 darts at round start, but subtract 1 coin from the round's base clear reward. |
| 43 | Double Delivery | The round's first eligible double grants +1 dart after its visit. |
| 44 | Scenic Route | On reaching six distinct eligible numbers in a round, grant +2 darts after that visit, once per round. |
| 45 | Safety Net | The first visit containing two or more physical misses grants +2 darts, once per round. |
| 46 | Overtime | If a visit exhausts the budget while below target but at or above 80% of it, grant +3 darts, once per round. |
| 47 | Tip Jar | Clearing a round with at least one eligible bull recorded awards +2 coins. |
| 48 | Bargain Hunter | The first purchase in each shop costs 2 fewer coins, minimum price 1. |
| 49 | Shopkeeper's Friend | The first refresh in each shop is free; subsequent paid refreshes cost 2, then 3, then 4 coins, etc. |
| 50 | Collector's Case | Add one charm offer to each shop. It adds a shop offer, not an equipped charm slot. |

Income effects pay once on committed clearance, using the pending coin ledger and per-effect limits in section 5. Shop modifiers are evaluated when the shop opens and remain fixed for that shop, preventing buy/sell exploits; acquiring one activates it starting with the next shop. Sale prices always use the amount actually paid. Selling a utility item does not regenerate offers or refund used refreshes.

Resolve grants after scoring: victory first, then earned grants 43–45, Bull Contract (52), and Encore Number (71), then Overtime only if the budget is still exhausted. Apply grant IDs in ascending order when the cap truncates them. A fired grant consumes its once-per-round trigger even if capped. Round-start grants resolve in the same stable order.

### D. Consumable powerups (10)

| ID | Name | Effect |
| --- | --- | --- |
| 51 | Pocket Dart | Immediately grant +1 dart to this round. |
| 52 | Bull Contract | The next visit grants +3 darts if it contains an eligible bull, once. |
| 53 | House Pass | Ignore the current boss rule for the next visit. Only usable in a boss round. |
| 54 | Chalk Boost | The next visit containing an eligible hit adds 40 bonus points; expires after the upcoming visit whether it hits or misses. |
| 55 | Double Ink | Double all bonus points produced by equipment in the next visit; does not double base points, multiplier bonuses, or other consumable bonuses. |
| 56 | Focus Tonic | The next visit adds +1 mult if it contains any eligible hit. |
| 57 | Single Service | Each eligible numbered hit in the next visit is treated as a single for run scoring and equipment triggers. Physical stats remain unchanged. |
| 58 | Bullseye Lens | Eligible outer bulls in the next visit use inner-bull value and classification for run scoring. Physical stats remain unchanged. |
| 59 | Salvage Ticket | Each physical miss in the next visit adds 15 bonus points; misses stay misses and do not become eligible hits or trigger hit combos. |
| 60 | Loaded Flight | Choose a virtual dart slot before the next visit; double the bonus points and multiplier bonuses generated by that dart variant for that visit. Does not affect charms or physical points. |

Allow at most one consumable per visit boundary. For Pocket Dart this means one use before the next visit, even though its effect is immediate. Powerups 52–60 expire after the upcoming visit, and additional earned darts are played afterward with normal rules. A consumed powerup is restored only by undoing its activation before any affected throws are recorded; correction of throws alone does not refund it.

Apply House Pass before boss restrictions. Apply Single Service and Bullseye Lens after boss eligibility, before equipment triggers; neither revives a disabled hit. Gatekeeper's double/bull check uses boss-transformed eligible hits before consumable transformations. Its scoring veto suppresses all visit points, including Salvage Ticket, but not explicitly earned dart grants. Resolve Bull Contract alongside other earned grants before Overtime.

### E. Additional economy charms (7)

These extend existing effects 47–49 and share the same five charm slots with every other persistent non-dart effect. All earned coins are pending until successful round commitment. The limits below are initial playtest values.

| ID | Name | Effect |
| --- | --- | --- |
| 61 | Double Pay | The first eligible numbered double in a round earns +1 coin, once per round. |
| 62 | Loose Change | Every third eligible single earns +1 coin, capped at 2 coins per round. |
| 63 | Cash Bull | The first eligible inner bull earns +2 coins, once per round. |
| 64 | Clean Checkout | Clear the round with at least six unused baseline darts to gain +1 coin, in addition to normal early-clear income. No exact finish is required. |
| 65 | Coupon Book | The first consumable purchased in each shop costs 2 fewer coins; apply combined discounts with a final minimum price of 1. |
| 66 | Pawn Broker | Purchased equipment sells for 75% of its actual paid price, rounded down, while this shop-entry modifier is active. Starter equipment still sells for zero. |
| 67 | High Roller | Before throwing, optionally raise the encounter target by 20%, rounded up, for +3 coins on clearance. Once per round; unavailable when there is no subsequent shop. |

### F. Rotating-number charms (5)

All five use the same deterministic House Number described in section 5a. Each occupies one shared charm slot. House Number and Bounty Board are the first implementation priorities; the other three extend the family after playtesting.

| ID | Name | Effect |
| --- | --- | --- |
| 68 | House Number | Each eligible hit on this round's highlighted number adds 25 bonus points. |
| 69 | Bounty Board | Each eligible hit on the House Number earns +1 coin, capped at 3 coins per round. |
| 70 | Hot Number | Each eligible hit on the House Number adds +0.5 visit multiplier, capped at +1.5 per visit. |
| 71 | Encore Number | The third eligible hit on the House Number in a round grants +2 darts after that visit, once per round. |
| 72 | Dealer's Choice | Choose Points or Coins in round preview. Points: each eligible House Number hit adds 20 bonus points. Coins: every second eligible House Number hit earns +1 coin, capped at 3 per round. Choice locks before throwing. |

Encore Number resolves with the other earned dart grants before Overtime, subject to the same total granted budget cap of 24. It cannot reopen a cleared round. Coin caps are per effect; Bounty Board and Dealer's Choice can both pay for qualifying hits if both consume charm slots. The selected Coins mode does not award bonus points, and the Points mode does not award coins.

### Build examples to validate

- **Marathon:** Deep Pockets + Scenic Route + Patient Player + Grand Tour. Visit many numbers to earn extra attempts and stronger late visits.
- **Precision engine:** Precision Dart + Double Trouble + Double Delivery. Doubles provide points, multiplier, and an additional chance to score.
- **Pub regular:** Steady Dart + Single Minded + Familiar Ground + Deep Pockets. Reliable singles, repeated targets, and a longer round.
- **Recovery:** Recovery Dart + Second Wind + Safety Net. Misses create a limited recovery opportunity; tune so intentional missing is not the optimal strategy.
- **Closing time:** Anchor Dart + Finisher + Last Orders + Overtime. A strong final visit with one conditional extension; account for partial visits skipping slot 3.
- **Invest in the house:** Single Minded + Familiar Ground + Deep Pockets + Tip Jar + Bargain Hunter occupies all five charm slots. Earn and save coins while retaining a reliable scoring core; sell economy effects to strengthen the final-boss build.
- **Follow the bounty:** House Number + Bounty Board + Familiar Ground + Encore Number + Single Minded occupies all five charm slots. Repeated hits on a different number each round create points, capped income, and extra darts. Validate this as a powerful synergy without making it the dominant build.

Examples with fewer than five charms intentionally leave room for further purchases. Dart variants occupy their own three slots, not charm slots.

Acceptance for content breadth: at least 50 distinct implemented and tested catalogue IDs available through the game's content pools. Locked effects may count only if their unlock path is implemented. Reskins, rarity variants, boss rules, and larger numeric tiers do not count as additional effects.

## Recommended first decision

Build the three-round slice first. The key unknown is whether choosing between reliable singles, varied targets, and precision throws feels satisfying while standing at a real board. Everything else should grow from that playtest.
