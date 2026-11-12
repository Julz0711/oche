# Oche

A darts scoring and practice app for playing at the board, sharing a match remotely, and tracking your progress.

Play X01, Cricket, or Copycat with friends, or take on **House Rules**, a solo roguelike built around real dart throws entered in the app.

[Play modes](#play-modes) · [Features](#features) · [Quick start](#quick-start) · [Configuration](#configuration) · [Development](#development)

## Play modes

| Mode | Experience |
| --- | --- |
| X01 | Classic countdown scoring, checkout guidance, visits, and X01 heatmaps. |
| Cricket | Close 15–20 and bull with Standard or No points scoring. |
| Copycat | Match the previous visit's total to score a point. |
| Local play | Score a match together on one device. |
| Online rooms | Share a six-character code, join as an account or guest, and score across devices. |
| House Rules | A solo run of nine encounters, bosses, equipment, shops, and consumables. |

Physical throws are self-reported; this app does not automatically detect dart hits.

## Features

- **Match flow:** lobby setup, scoring, undo, summaries, and a new match in the same online room.
- **Realtime recovery:** small Ably notifications trigger snapshot refreshes; reconnect and visible-page polling recover missed updates.
- **Performance:** Today, This week, This month, and All time statistics, match history, achievements, and profiles.
- **Friends:** private friend codes, requests, accepted-friend profiles, and head-to-head records.
- **Solo practice:** local saves, resume, recovery backup, run export, and recent results.
- **Weekly challenge:** signed-in players can submit a shared-seed solo run to a private friends leaderboard.
- **App experience:** responsive layouts, installable PWA support, and local/offline match support.

Stats periods use UTC with Monday-start weeks. X01 heatmaps are specific to X01. Head-to-head records cover completed one-on-one online matches between the two accounts.

## Quick start

Use Node.js 22 LTS, npm, and a running MongoDB instance.

```sh
git clone https://github.com/Julz0711/oche.git
cd oche
npm ci
```

Create `.env.local`:

```dotenv
MONGODB_URI=mongodb://127.0.0.1:27017/oche
AUTH_SECRET=replace-with-a-long-random-secret
```

Start the app:

```sh
npm run dev
```

Open [localhost:3000](http://localhost:3000). A local demo account provider is available only in development on localhost/loopback hosts. Real OAuth sign-in and realtime online play need the additional configuration below.

## Configuration

| Variable | Purpose |
| --- | --- |
| `MONGODB_URI` | Database connection used by Mongoose and the authentication adapter. |
| `AUTH_SECRET` | Authentication signing secret; `NEXTAUTH_SECRET` is also accepted by the auth configuration. |
| `GOOGLE_ID`, `GOOGLE_SECRET` | Google OAuth credentials. |
| `DISCORD_ID`, `DISCORD_SECRET` | Discord OAuth credentials. |
| `ABLY_API_KEY` | Server-side Ably key for online match notifications and presence. |

OAuth callbacks use `/api/auth/callback/google` and `/api/auth/callback/discord` on the app's origin. Keep the Ably key and database credentials server-side.

For production, configure the database, secrets, OAuth providers, and realtime service, then use `npm run build` and `npm start`.

## Playing with friends

Create an online match and share its room code or `/join/<code>` link. Existing participants can rejoin with the same account or guest browser cookie. Signed-in players can also resume from the dashboard.

After a match, the host can choose **Play again**, adjust the game settings, and open the next lobby. The room code and player identities carry over; each match keeps its own result and history.

Friend relationships use a separate private 12-character code under **Friends**. Accepted friends can view each other's profiles and head-to-head results; removing the friendship revokes that access.

## House Rules

Practice runs need no account. Each action saves locally, with a previous-save backup; reload to resume or export the run from its footer. Undo is available until a round is confirmed. In-progress practice runs do not sync across devices.

Weekly challenges roll over Monday at 00:00 UTC. Finished runs must be submitted before the deadline; the server replays submitted actions to validate the result. Rankings are separated by difficulty and rules version. Solo results are separate from ordinary match statistics.

See [solo implementation notes](docs/solo-implementation.md) and the [House Rules design](docs/solo-roguelike-plan.md). Targets and equipment balance remain subject to real-board playtesting.

## Development

```sh
npx vitest run
npm run build
```

Focused solo tests:

```sh
npx vitest run lib/games/roguelike lib/solo
```

Database integration tests are opt-in:

```sh
OCHE_TEST_MONGODB_URI="mongodb://127.0.0.1:27017" npx vitest run lib/friends/repository.integration.test.ts lib/rematch.integration.test.ts lib/solo/repository.integration.test.ts
```

These suites create and remove their own uniquely named test databases. Use a development MongoDB instance.

## Code map

| Path | Responsibility |
| --- | --- |
| [app/](app/) | Match, solo, friends, profile, and settings pages; API routes. |
| [components/](components/) | Scoring UI, navigation, PWA, and sync interfaces. |
| [lib/games/](lib/games/) | Game engines, settings, statistics, and solo rules. |
| [lib/solo/](lib/solo/) | Solo persistence, weekly challenges, and run statistics. |
| [lib/friends/](lib/friends/) | Friend requests, access policy, and head-to-head data. |
| [lib/realtime.ts](lib/realtime.ts) | Ably notifications and scoped tokens. |
| [lib/auth.ts](lib/auth.ts) | Authentication providers and sessions. |
| [docs/](docs/) | Product, design, implementation, and review notes. |
