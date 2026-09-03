# Share Images Design

**Date:** 2026-09-04
**Status:** Approved for implementation
**Parent spec:** [2026-09-01-oche-mvp-architecture.md](2026-09-01-oche-mvp-architecture.md) (section 8, M5–M7 — second of five sub-projects this phase decomposes into; PWA installability shipped first)

## 1. Scope

Lets a player generate and share a compact result-card image after a match ends, from the existing post-match screen (`PostMatchStats.tsx`). This is the second of five independent sub-projects the M5–M7 "polish" phase decomposes into (live drawer, aggregate stats page, PWA — shipped, offline support, share images) — each gets its own spec/plan cycle.

**In scope:**
- A new stateless API route that renders a 1080×1080 PNG result card via `next/og`'s `ImageResponse` (the same rendering approach already proven working end-to-end for PWA icon generation)
- A `ShareResultButton` component added to `PostMatchStats.tsx`, wired to the app's existing native share sheet (`navigator.share`) with a plain-download fallback
- A card design generic across game types (X01, Cricket, and any future `GameModule`), built entirely from the `GameModule` interface's existing generic accessors (`matchStats`, `statTiles`, `matchInfo`, `winner`) — no game-specific code in the image-rendering route

**Out of scope (explicitly):**
- Any server-side persistence of generated images (each request renders fresh, nothing is stored)
- A share-preview modal — the image is generated and immediately handed to the share sheet/download, no intermediate preview screen (first version; can be revisited)
- Using this image as an actual Open Graph / link-preview meta tag anywhere (a plausible future reuse of the same route, not part of this scope)
- Any change to `GameModule`, match state, scoring, or persistence — this reads already-computed client-side data and touches no existing route

## 2. Architecture

A new route, `POST /api/matches/[id]/share-image`, is **stateless and game-agnostic**: it never reads the database and never imports a `GameModule`. It receives a small JSON payload — already-computed values the client has in memory when a match ends — validates it with Zod, and renders a PNG via `ImageResponse`.

This design choice avoids two problems: (1) recomputing `matchStats` server-side would require duplicating each game's stats logic in the route, defeating the entire point of the `GameModule` abstraction; (2) reading match data from the DB would only work for remote matches, since local matches have no per-visit DB persistence (a known, deliberately-scoped gap from M3) — passing client-held data instead makes local and remote matches behave identically, for free.

**Request payload** (validated with Zod in the route):

```ts
{
  gameName: string;        // gameModule.name, e.g. "X01" or "Cricket"
  matchInfo: string;       // one line built client-side from gameModule.matchInfo(state, settings),
                            // e.g. "First to 3 legs" — joined/formatted client-side, the route
                            // just renders a plain string
  players: {
    name: string;           // display name, already resolved client-side (falls back to raw
                             // playerId in local mode, same as today's PostMatchStats rendering)
    isWinner: boolean;
    statLabel: string;      // statTiles[0].label for this game
    statValue: string;      // statTiles[0].value(stats) for this player, already formatted
  }[];                       // 2–4 entries, matching gameModule.playerRange
}
```

**Response:** `200`, `Content-Type: image/png`, raw PNG bytes. `400` with a JSON error body on payload validation failure.

## 3. Image Design

1080×1080, matching the app's existing dark palette exactly (`--oche` background, `--wire` accent, `--chalk` primary text, `--sisal` muted text, `--slate` surface) — no new colors, same tokens used throughout the app and the PWA icon set.

- **Header:** the PWA icon's concentric-ring dartboard glyph at small scale, next to "OCHE" in the display font, top-left, small and unobtrusive.
- **Match context line:** `{gameName} · {matchInfo}` (e.g. "X01 · First to 3 legs"), centered, `--sisal` muted text, below the header.
- **Player grid:** a responsive grid — 1 row × 2 columns for 2 players, 2 rows × 2 columns for 3–4 players (Cricket's `playerRange` max). Each player is a card: `--slate` surface by default; the winner's card gets a `--wire` border and a `bg-wire/10`-equivalent tint plus a small crown glyph next to their name — the exact same winner-highlight treatment `PostMatchStats.tsx` already uses (`border-wire bg-wire/10`), so the shared image visually matches the screen it was generated from. Below the name: the headline stat as a large number (`statValue`) with `statLabel` in small caps beneath it.
- **Footer:** a thin `--wire` accent bar along the bottom edge — no text, no domain (none confirmed for this deployment yet; adding one later is a one-line change to the render function, not worth blocking on).

## 4. Component Changes

**New: `app/api/matches/[id]/share-image/route.ts`**
- Node runtime (required by `next/og`'s `ImageResponse`, consistent with how the standalone icon-generation script was verified during the PWA work).
- Validates the request body against a Zod schema (above). Returns `400` with `{error: string}` on failure.
- Builds the JSX tree described in section 3 via `ImageResponse`, using the fonts already available to the app (system font stack is fine — no custom font loading needed, keeping this route dependency-free beyond `next/og` itself, which ships with Next.js).
- Route ignores the `[id]` path param entirely for now (no DB read) — it's present only so the endpoint reads naturally as "this match's share image" and could be extended later (e.g. rate-limiting per match) without a route shape change.

**New: `components/organisms/ShareResultButton.tsx`**
- `'use client'`. Props: `{gameName: string, matchInfo: string, players: {name, isWinner, statLabel, statValue}[]}` — plain data, no `GameModule`/state/settings passed in, so this component has zero knowledge of any specific game.
- On click: `fetch`es the route with the payload, awaits the PNG as a `Blob`, then:
  - If `navigator.canShare?.({files: [file]})` is true (constructs a `File` from the blob first): calls `navigator.share({files: [file], title: 'Oche match result'})`.
  - Otherwise: creates an object URL and a synthetic `<a download="oche-result.png">` click, then revokes the URL.
- Shows a disabled/spinner state on the button while the fetch is in flight; on any failure (network error, non-200 response, `navigator.share` rejection other than user-cancel — `AbortError` from a cancelled share sheet is not an error and is swallowed silently) shows an inline "Couldn't generate image — try again" message next to the button. Never throws uncaught; a failure here must never affect the rest of the post-match screen.

**Modified: `components/organisms/PostMatchStats.tsx`**
- Computes the `ShareResultButton` payload from data it already has in its render (it already calls `gameModule.matchStats` per player and has `gameModule.name`; add one call to `gameModule.matchInfo(state, settings)` and `gameModule.statTiles[0]` lookup per player, joining `matchInfo`'s label/value pairs into a single display string).
- Renders `<ShareResultButton .../>` next to the existing "Back to Dashboard" `<Button>`.

## 5. Error Handling

- Route: Zod validation failure → `400`. Any unexpected render error → `500` with a generic error body (not expected in normal operation; the payload shape is fully controlled by the one client component that calls it).
- Client: every failure mode (fetch failure, non-200, share-sheet rejection) is caught and shown as a small inline message. The feature is additive — its failure state never blocks or degrades the existing post-match screen, the "Back to Dashboard" button always works regardless of share-image state.

## 6. Testing

- No existing route in this project has automated tests (`app/api/**` has no `.test.ts` files anywhere) — this is a genuinely new pattern for the project, not an established one to follow. Keep it simple: a standalone unit test for the route's exported Zod schema (`schema.safeParse(validPayload).success === true`; missing field / wrong player count / wrong type → `.success === false`), plus one lightweight test that imports the route's `POST` handler directly and calls it with a mock `Request` carrying a valid payload, asserting `response.status === 200` and `response.headers.get('content-type') === 'image/png'` — no test server needed, Next.js route handlers are plain async functions.
- No automated visual regression testing for the rendered image itself, consistent with the PWA work's precedent — manual verification: complete a match (both X01 and Cricket, to confirm generic rendering holds for both), click Share, confirm the PNG's layout, colors, and winner-highlight render correctly for 2-player and (Cricket) 3–4-player matches, and confirm both the native-share path (on a device/browser that supports `navigator.share` with files) and the download fallback work. Flag explicitly in the plan's final verification task if a real mobile device/browser supporting `navigator.share({files})` isn't available in this environment, the same way PWA's Task 4 flagged its own real-device gaps rather than silently skipping them.

## 7. Summary

A small, additive feature: one new stateless, game-agnostic API route rendering a PNG via the already-proven `next/og` `ImageResponse` approach, one new button component handling the share-sheet/download-fallback logic, and a small addition to the existing `PostMatchStats.tsx` to wire the two together. Nothing here touches `GameModule`, match state, scoring, or any existing route — the route doesn't even read the database. Generic across all current and future game types by construction, since it only ever sees plain strings and booleans, never game-specific state.
