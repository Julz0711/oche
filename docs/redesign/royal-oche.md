# Royal Oche redesign

## Branches

- Current implementation: `redesign/royal-oche`, started from the original app at `fdac294`.
- First attempt preserved separately: `redesign/match-night`, checkpoint `30e3b5a`.

## Direction

A classic darts club in gold, red, green and black: emerald surfaces, brass borders, cream score typography and numbered game tickets. House Rules has its own club identity, with a crown, nine-round scorecard and illustrated equipment. Shared rectangular panels, controls and page headings carry the palette throughout the app.

## Local demo account

1. Run the development server with the existing local MongoDB and auth-secret configuration.
2. Open [Sign in](http://localhost:3000/signin).
3. Select **Try demo account**.

This signs in as Alex Morgan through the normal NextAuth session. Protected APIs work, including Stats, Profile, Settings and Friends. The initial fixture includes 12 completed X01, Cricket and Copycat matches, four sample achievements, two accepted friends and an incoming friend request. Match histories are generated through the actual game engines. Seeded records are deterministic and additive; signing in again preserves profile edits and subsequent activity.

Google setup is only needed when testing Google's OAuth flow itself. The demo provider requires development mode and a loopback auth URL. It is absent in production. The previous unsigned development cookie and fake session proxy have been removed. The old test-login link now redirects to the sign-in page in development and returns 403 in production.

Demo records use the configured development database. House Rules practice saves remain per-browser, as before; they are not automatically seeded or tied to the demo account.

## Mobile-first changes

- Five mobile destinations: Play, House Rules, Friends, Stats and Account. House Rules is separate from the Online / At the board chooser; the Join a room card appears under Online only.
- House Rules: redesigned hub, compact five-item tab bar, numbered setup steps, clearer target preview, compact phone/tablet keypad and full desktop board. Extra masthead content disappears during mobile scoring.
- Equipment shop and collection: illustrated rows on phones, card grids on larger screens; descriptions, prices and purchase actions have room to be read.
- Weekly leaderboard: labelled rows on phones and a table on larger screens. Results place New run and Back to hub beside the outcome.
- Profile columns can shrink on 320px screens, and statistics period controls fit without clipping the selected period.
- Shared styling covers account pages, achievements, settings, Friends, room setup, join/error screens, authentication and legal pages.

## Classic match layout

The original live-match composition remains: desktop opposing scores, central match progress, histories alongside a visible dartboard and a five-column keypad beneath it. Mobile retains the original player rows and docked keypad. Gold accents, red/green controls and shared typography improve the styling.

The scoring engines and rules, realtime synchronization, match persistence and heatmap scale remain intact. Authentication changed only to make the local demo use genuine sessions.

## Layout refinement

- Statistics separates Performance from Match history and remembers the chosen view. Performance places the period selector beside Overview and shows a compact overall record followed by X01 / Cricket / Copycat sub-tabs and expandable game sections with three headline metrics. Tabs and section markers use subtle home-screen gold, green and red accents. Selecting a game opens its section, detailed statistics and shot map by default; these remain collapsible. Additional figures are grouped under Scoring, Finishing and Accuracy in an expandable section.
- Shot maps use one board with All throws / Doubles, trebles & bulls filters. Summary figures sit in one row above a centered board, with the legend directly beneath, followed by region details and the list disclosure. The list arrow has explicit spacing. The board, callouts and list remain available without displaying two large boards simultaneously.
- Profile's match summary is an all-time snapshot with three aligned columns, subtle dividers and a Statistics link. Achievement progress has explicit spacing between the count, description and percentage.
- Settings uses one bounded column with separate Player profile, Preferences and Sign-in & security cards, consistent heading dividers and grouped labels, help text and actions. Desktop navigation uses an ordinary Account link.
- Friend code and Copy/Share actions occupy a compact strip; the add-friend form sits below it. Copy confirmation appears on the button for 2.5 seconds, without a page-level banner.
- Join a room is a quiet secondary row with a top divider and an extra 20px of separation below online game choices; the masthead link remains removed. The room's sticky Start match footer has no trailing desktop inset and reserves only the mobile navigation height on phones.

This pass was checked at 320, 390, 768 and 1440px widths, including populated account pages, expanded statistics, shot-map filters and match setup. Latest screenshots are in `output/playwright/refinement/`; earlier footer checks are in `output/playwright/layout-cleanup/`.

## Verification

| Check | Result |
| --- | --- |
| TypeScript and whitespace | Passed |
| Production build | Passed; 31 static pages generated |
| Vitest | 370 passed; 17 opt-in database integration tests skipped |
| Real demo account | Sign-in, protected APIs, profile edits, session update, reload, sign-out and repeat sign-in passed |
| Production auth boundary | No demo provider or button; old endpoint returns 403; unsigned cookie cannot authenticate |
| Classic match | Board/keypad input, single/triple, undo, reload recovery, statistics dialog, bust, double-out and results passed |
| Game variants | Cricket marks, Copycat targets and eight-player layouts passed |
| Online backend | Two browsers: room creation, rule changes, joining, start, score synchronization and turn gating passed |
| Local setup | Add/remove players, saved names/settings, eight-player start, score and undo passed |
| House Rules | Setup, preview, boss, scoring, bank, purchase, undo, shop, next round, winning/losing results, collection and stats reviewed |
| Weekly challenge | Actual start/submission APIs, leaderboard and build details passed |
| Responsive | 320px, 390px, 768px and 1440px widths; classic scoring also checked at 844×390 landscape |
| Supporting pages | Populated Stats, Profile, Settings, Friends, head-to-head and friend profiles; achievements, heatmaps, auth, join, legal and error states reviewed |

Browser checks used Chromium. Classic result scenarios and completed House Rules runs used valid engine-generated fixtures; account and online checks used the actual local backend. No page errors occurred in the completed flows. OAuth provider authentication and physical iOS devices were not exercised.

Screenshots are in the ignored `output/playwright/mobile-review/` directory, including `home.png`, `profile-320.png`, `solo.png`, `solo-boss-playing-390.png`, `solo-shop-390.png`, `solo-won-390.png`, `match-desktop.png` and `match-320.png`.
