This is a [Next.js](https://nextjs.org) project bootstrapped with [`create-next-app`](https://nextjs.org/docs/app/api-reference/cli/create-next-app).

## Getting Started

First, run the development server:

```bash
npm run dev
# or
yarn dev
# or
pnpm dev
# or
bun dev
```

Open [http://localhost:3000](http://localhost:3000) with your browser to see the result.

You can start editing the page by modifying `app/page.tsx`. The page auto-updates as you edit the file.

This project uses [`next/font`](https://nextjs.org/docs/app/building-your-application/optimizing/fonts) to automatically optimize and load [Geist](https://vercel.com/font), a new font family for Vercel.

## Learn More

To learn more about Next.js, take a look at the following resources:

- [Next.js Documentation](https://nextjs.org/docs) - learn about Next.js features and API.
- [Learn Next.js](https://nextjs.org/learn) - an interactive Next.js tutorial.

You can check out [the Next.js GitHub repository](https://github.com/vercel/next.js) - your feedback and contributions are welcome!

## Deploy on Vercel

The easiest way to deploy your Next.js app is to use the [Vercel Platform](https://vercel.com/new?utm_medium=default-template&filter=next.js&utm_source=create-next-app&utm_campaign=create-next-app-readme) from the creators of Next.js.

Check out our [Next.js deployment documentation](https://nextjs.org/docs/app/building-your-application/deploying) for more details.

## Rooms, navigation, and friends

- **Join a room:** the link beside the dashboard play actions opens `/join`. Enter a six-character room code; guests and signed-in players can join. Shared `/join/[code]` links still work.
- **Navigation:** Play, Friends, Stats, and Account are available in a bottom bar on phones and a header on larger screens. Live matches retain their dedicated scoring layout. Sign-out is under Account → Account settings.
- **Friends:** signed-in players get a private 12-character code on `/friends`. Send a code-based request; the recipient can accept or decline, and the sender can cancel. Accepted friendships appear for both players. Remove a friend from their head-to-head page without deleting match history.
- **Head-to-head:** totals and per-game records include completed, one-on-one online matches in which both accounts participated, including matches played before becoming friends. Local guest games and multiplayer rooms are excluded. Recent matches paginate in completion order.

Friend data uses the existing MongoDB connection: `socialProfiles` stores unique codes and `friendships` stores one relationship per account pair. Indexes are created idempotently on first use. Requests and head-to-head records require authentication; code lookup returns only the target's display name through the request list, never an email. Pending outgoing requests are limited to 25. The friends page refreshes on focus and every 30 seconds while visible.

Run unit tests with `npx vitest run`. Database integration tests are opt-in:

```sh
OCHE_TEST_MONGODB_URI="mongodb://localhost:27017" npx vitest run lib/friends/repository.integration.test.ts
```

The integration suite creates a unique `oche_friends_test_*` database and deletes that database afterward. It covers concurrent requests, acceptance permissions, cancel/decline/remove, privacy, pagination, and preserving match history.

### Play again in the same room

After an online match, the host can expand **Play again** in the summary, keep the current settings or choose X01, Cricket, or Copycat with new settings, then open the next lobby. The room code, host, player identities, and seating order carry over. Other participants see **Join next match** in their summary and can enter when ready; the host starts play from the lobby as usual.

Each round of matches creates a separate match record, preserving results, visits, achievements, and head-to-head history. A completed match has only one successor: an atomic reservation plus an idempotent insert handles simultaneous submissions and interrupted requests. Room codes are reserved across completed matches as well as active ones. The summary checks for the next lobby every three seconds while visible, stopping once it is available.

Remote matches broadcast small refresh notifications instead of complete game histories, so additional legs cannot exceed Ably's message size limit. Clients fetch the saved snapshot after a notification, reconnection, returning to the app, or a successful scoring request; a visible-page poll also recovers missed messages. Player presence shows Online/Away, and shows Unknown while the local realtime connection is unavailable. Presence can take time to detect an interrupted connection. Rejoining by room code preserves an existing account or guest-cookie seat; guests need the original browser cookie. Signed-in players can also use Resume on the dashboard.

Cricket supports Standard and No points scoring in match setup and rematch setup. Standard awards overflow hits on a closed number while any opponent still has it open, and requires closing every number with at least as many points as every opponent. No points awards the leg as soon as a player closes all seven numbers. Undo restores marks and points as well as the visible darts. Copycat shows the live remaining target (or overshoot) in the middle information panel. Heatmaps are shown and aggregated for X01 only; other games retain their normal throw history and statistics.

Run the isolated database tests with `OCHE_TEST_MONGODB_URI="mongodb://localhost:27017" npx vitest run lib/rematch.integration.test.ts`. They cover authorization, validation, concurrent requests, recovery, and result/roster preservation. They create and remove their own `oche_rematch_test_*` database. Restart the development server after updating the Mongoose schema so cached models pick up the new fields.


### Profiles, performance, and account controls

Stats includes Today, This week, This month, and All time results, plus a game breakdown and match history. Calendar periods use UTC and Monday-start weeks. Totals include the signed-in first player in local matches and the player's own seat in online matches. The profile shows a compact version of these results alongside friends and achievements.

Accepted friends can open each other's profiles through the friends list, profile sidebar, or head-to-head page. Profile responses expose the player's name, image, performance and achievements, never email or their friends list. Removing the friendship revokes access.

Achievement tiles open a keyboard-accessible detail dialog with the description and first award date. Recurring awards now also store `last_unlocked_at`; older repeated awards without that field explicitly show that the last date was not recorded.

Account settings contains display-name editing, sound preferences and sign-out. The quick mute control appears only in the desktop navigation; phones and tablets use Settings. The phone navigation retains four destinations. Mobile safe-area padding includes extra spacing below the iOS status bar for page headers and match back buttons.

### House Rules — solo roguelike beta

Open `/solo` or choose **House Rules** on the dashboard. Play nine encounters with three bosses, 72 equipment effects, three virtual dart slots, five shared charm slots, and two consumable slots. Shops support purchases, sales, positional dart swaps, and refreshing unsold offers. Extra darts, partial visits, economy builds, and rotating House Numbers use the same deterministic engine in the browser and on the server.

Practice runs need no account. Each action saves locally with a previous-save backup; reload to resume, export the run from its footer, or recover a damaged save from the recovery screen. Undo remains available until a round is confirmed. Completed runs remain on the results screen until a new run starts; the most recent 20 previous results are retained in local storage. Cross-device in-progress sync and a history browser are future work.

Signed-in players can enter a weekly shared-seed challenge and submit their finished run to a private friends leaderboard. Weeks roll over Monday at 00:00 UTC. Rankings separate difficulty and rules versions, sort by rounds cleared, capped encounter progress, then fewer darts, and share exact ties. `soloRuns` stores server-created attempts and idempotent, replay-validated results. Only accepted friends can see results and encounter details; physical hits are self-reported. A run must be submitted before the challenge deadline. No solo points are mixed into normal match statistics.

Run the focused tests with `npx vitest run lib/games/roguelike lib/solo`. Database tests use `OCHE_TEST_MONGODB_URI="mongodb://127.0.0.1:27017" npx vitest run lib/solo/repository.integration.test.ts`; they create and remove only their own unique `oche_solo_test_*` database. The design and implementation notes are in `docs/solo-roguelike-plan.md` and `docs/solo-implementation.md`. Targets and item prices still need real-board playtesting.
