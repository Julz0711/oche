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
- **Navigation:** Play, Friends, History, and Account are available in a bottom bar on phones and a header on larger screens. Live matches retain their dedicated scoring layout. Sign-out is under Account → Account settings.
- **Friends:** signed-in players get a private 12-character code on `/friends`. Send a code-based request; the recipient can accept or decline, and the sender can cancel. Accepted friendships appear for both players. Remove a friend from their head-to-head page without deleting match history.
- **Head-to-head:** totals and per-game records include completed, one-on-one online matches in which both accounts participated, including matches played before becoming friends. Local guest games and multiplayer rooms are excluded. Recent matches paginate in completion order.

Friend data uses the existing MongoDB connection: `socialProfiles` stores unique codes and `friendships` stores one relationship per account pair. Indexes are created idempotently on first use. Requests and head-to-head records require authentication; code lookup returns only the target's display name through the request list, never an email. Pending outgoing requests are limited to 25. The friends page refreshes on focus and every 30 seconds while visible.

Run unit tests with `npx vitest run`. Database integration tests are opt-in:

```sh
OCHE_TEST_MONGODB_URI="mongodb://localhost:27017" npx vitest run lib/friends/repository.integration.test.ts
```

The integration suite creates a unique `oche_friends_test_*` database and deletes that database afterward. It covers concurrent requests, acceptance permissions, cancel/decline/remove, privacy, pagination, and preserving match history.
