# PWA Installability Design

**Date:** 2026-09-04
**Status:** Approved for implementation
**Parent spec:** [2026-09-01-oche-mvp-architecture.md](2026-09-01-oche-mvp-architecture.md) (section 8, M5–M7 — first of five sub-projects this phase decomposes into)

## 1. Scope

Makes Oche installable as a Progressive Web App ("Add to Home Screen" on Android/Chrome and iOS Safari) with an on-brand icon set. This is the first of five independent sub-projects the M5–M7 "polish" phase decomposes into (live drawer, aggregate stats page, PWA, offline support, share images) — each gets its own spec/plan cycle.

**In scope:**
- A generated web app manifest (`app/manifest.ts`, this Next.js version's native convention — verified directly against its own docs, not assumed)
- An on-brand icon set (192×192, 512×512, and a maskable 512×512 variant), built from the app's existing 7 design tokens, no new colors
- A minimal, no-op service worker — registered client-side, satisfies Android/Chrome's installability heuristics, but does no caching or fetch interception
- iOS Safari meta tags (`apple-touch-icon`, `apple-mobile-web-app-capable`, etc.) in the root layout
- Replacing `app/favicon.ico` (currently the stock Next.js logo) with the same on-brand icon, for visual consistency with the new PWA icons

**Out of scope (explicitly, per the approved scope decision):**
- Any caching strategy, offline fallback, or service worker fetch handling — that's the separate, later "Offline" sub-project, which needs its own design given this app's real-time server-authoritative architecture (a match's live state is never meaningfully "available offline" the way a static page would be)
- An install prompt UI (a custom "Install Oche" button) — relying on the browser's native install affordance (Chrome's address-bar icon, Android's install banner, iOS's manual "Add to Home Screen") is sufficient for this phase
- Push notifications, background sync, or any other service-worker capability beyond bare registration

## 2. Manifest

`app/manifest.ts`, using `next`'s `MetadataRoute.Manifest` type:

```ts
import type { MetadataRoute } from 'next';

export default function manifest(): MetadataRoute.Manifest {
  return {
    name: 'Oche',
    short_name: 'Oche',
    description: 'Real-time darts scoring web app',
    start_url: '/',
    display: 'standalone',
    background_color: '#141A18', // --oche token
    theme_color: '#141A18', // --oche token
    icons: [
      { src: '/icon-192.png', sizes: '192x192', type: 'image/png' },
      { src: '/icon-512.png', sizes: '512x512', type: 'image/png' },
      { src: '/icon-maskable-512.png', sizes: '512x512', type: 'image/png', purpose: 'maskable' },
    ],
  };
}
```

`background_color`/`theme_color` use the existing `--oche` token's hex value directly (`#141A18`) — manifest fields don't support CSS custom properties, so the literal value is copied here once; if the token ever changes, this file needs a matching update (a one-line, easy-to-grep dependency, not worth automating for a single manifest field).

## 3. Icon Design

A simple dartboard/target motif, built only from existing tokens (`--oche` background `#141A18`, `--wire` accent `#C0A15C`, `--chalk` `#F2F4F3`): concentric rings (outer `--wire`, alternating with `--oche`/darker rings) around a `--chalk` or `--wire` bullseye, matching the same visual language `HeatmapBoard`/`DartboardInput` already establish elsewhere in the app — this icon should look like it belongs to the same product, not a generic dart clipart.

Four files, generated as PNGs from a single source SVG (via a build-time or one-off conversion — implementation detail for the plan to specify):
- `public/icon-192.png` — 192×192, standard icon
- `public/icon-512.png` — 512×512, standard icon
- `public/icon-maskable-512.png` — 512×512, maskable variant (the dartboard motif inset with safe padding — maskable icons get cropped to a circle/rounded-square by the OS, so content must stay within the inner ~80% "safe zone", per the maskable icon spec)
- `app/apple-icon.png` — 180×180, iOS's recommended touch-icon size (see section 5 — Next.js's file-based icon convention picks this up automatically, no manifest/metadata wiring needed for it)

`app/favicon.ico` is also replaced with the same motif (rendered at favicon-appropriate small sizes, e.g. 16×16/32×32/48×48 multi-resolution `.ico`), removing the last piece of stock Next.js branding from the app.

## 4. Service Worker (No-Op)

`public/sw.js`:

```js
// A minimal, intentionally no-op service worker. Its only job is to exist and be registered —
// Android/Chrome's installability heuristics look for an active service worker even when there's
// nothing to cache. It does not intercept fetches or cache anything; that's the separate,
// later "Offline" sub-project's job, which needs its own design given this app's real-time,
// server-authoritative architecture.
self.addEventListener('install', () => self.skipWaiting());
self.addEventListener('activate', (event) => event.waitUntil(self.clients.claim()));
```

Registered via a small client component mounted in the root layout (e.g. `components/PwaRegistration.tsx`, a `'use client'` component with a `useEffect` calling `navigator.serviceWorker.register('/sw.js')`, guarded by `if ('serviceWorker' in navigator)` for browsers without support). This is intentionally the simplest possible registration — no update-prompt UI, no versioning scheme; the "Offline" sub-project can revisit this file's contents later without needing to change how it's registered.

## 5. iOS Meta Tags

Added to `app/layout.tsx`'s existing `metadata` export (extending it, not replacing it):

```ts
export const metadata: Metadata = {
  title: "Oche",
  description: "Real-time darts scoring web app",
  appleWebApp: {
    capable: true,
    statusBarStyle: 'black-translucent',
    title: 'Oche',
  },
};
```

Next.js's `Metadata` type's `appleWebApp` field generates the `apple-mobile-web-app-capable` and `apple-touch-icon`-adjacent meta tags automatically; the `apple-touch-icon` link itself is picked up automatically by Next.js's file-based icon convention if an `app/apple-icon.png` file exists (a fourth icon export, 180×180 per Apple's recommended size, same source motif as section 3).

## 6. Testing

No automated tests are meaningful for a manifest/icon/no-op-service-worker feature (there's no logic to unit test). Verification is manual: load the app in Chrome DevTools' Application panel and confirm the manifest is recognized with no installability warnings, confirm the install icon appears in Chrome's address bar (desktop) and the "Add to Home Screen" banner behavior on an Android device/emulator, and confirm iOS Safari's Share → "Add to Home Screen" picks up the correct icon and name. This is the same manual-verification pattern used throughout this project for UI-facing work with no meaningful automated coverage.

## 7. Summary

A small, self-contained addition: one new file (`app/manifest.ts`), one new no-op service worker plus its tiny registration component, four generated icon assets (192/512/512-maskable/180-apple) sharing one on-brand source design, a small `metadata` extension, and a replaced favicon. Nothing here touches match logic, the `GameModule` contract, or any existing route — it's purely additive, and deliberately leaves all caching/offline decisions to a separate, later sub-project.
