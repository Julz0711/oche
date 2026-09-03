# Share Images Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Let a player generate and share a compact 1080×1080 result-card image from the post-match screen, working identically for X01 and Cricket (and any future `GameModule`).

**Architecture:** A new stateless, game-agnostic API route renders the image via `next/og`'s `ImageResponse` from a small JSON payload the client already has computed (no DB read, no `GameModule` import in the route). A new `ShareResultButton` component calls the route and hands the result to `navigator.share` (native share sheet) with a download-link fallback. `PostMatchStats.tsx` computes the payload from data it already has and renders the new button.

**Tech Stack:** Next.js 16 App Router route handlers, `next/og`'s `ImageResponse` (ships with Next.js, already proven working in this exact repo by `scripts/generate-pwa-icons.js`), Zod for payload validation, Vitest.

**Spec:** [2026-09-04-share-images-design.md](../specs/2026-09-04-share-images-design.md)

## Global Constraints

- The share-image API route must never read the database and must never import a `GameModule` — it only ever sees the plain payload shape below, so it stays generic across all current and future games by construction.
- Reuse the app's existing design tokens exactly: `--oche` `#141A18`, `--slate` `#1E2724`, `--chalk` `#F2F4F3`, `--sisal` `#E4D8BC`, `--wire` `#C0A15C` (from `lib/theme.ts`). No new colors.
- Reuse the PWA icon's concentric-ring dartboard motif (`scripts/generate-pwa-icons.js`) for the share image's header glyph, at small scale — do not invent a different-looking icon.
- Image size is fixed at 1080×1080.
- Payload shape (validated with Zod in the route):
  ```ts
  {
    gameName: string;
    matchInfo: string;
    players: {
      name: string;
      isWinner: boolean;
      statLabel: string;
      statValue: string;
    }[]; // 2-4 entries
  }
  ```
- The button's failure modes (network error, non-200 response, a `navigator.share` rejection other than the user cancelling) must never throw uncaught and must never block the existing "Back to Dashboard" flow.
- `AbortError` from a user cancelling the native share sheet is not an error — it must be swallowed silently, not shown as a failure.
- No new npm dependencies — `next/og`, `zod`, and the existing `Button` component are sufficient.

---

### Task 1: Share-image API route

**Files:**
- Create: `app/api/matches/[id]/share-image/schema.ts`
- Create: `app/api/matches/[id]/share-image/route.tsx`
- Test: `app/api/matches/[id]/share-image/schema.test.ts`
- Test: `app/api/matches/[id]/share-image/route.test.ts`

**Interfaces:**
- Produces: `ShareImagePayloadSchema` (a Zod schema) and `ShareImagePayload` (its inferred type), both exported from `schema.ts`, for Task 2/3's client code to build a matching payload shape.
- Produces: `POST` handler at `app/api/matches/[id]/share-image/route.tsx`. Accepts a `NextRequest` with a JSON body matching `ShareImagePayload`; returns a `200` PNG (`Content-Type: image/png`) on success, `400` with `{error: string}` on an invalid body, `500` with `{error: string}` on an unexpected render failure. The route ignores the `[id]` path segment entirely — it exists only so the endpoint reads as "this match's share image"; no code reads it.
- Consumes: nothing from other tasks — this task is fully self-contained.

- [ ] **Step 1: Write the schema**

```ts
// app/api/matches/[id]/share-image/schema.ts
import { z } from 'zod';

export const ShareImagePayloadSchema = z.object({
  gameName: z.string().min(1),
  matchInfo: z.string().min(1),
  players: z
    .array(
      z.object({
        name: z.string().min(1),
        isWinner: z.boolean(),
        statLabel: z.string().min(1),
        statValue: z.string().min(1),
      })
    )
    .min(2)
    .max(4),
});

export type ShareImagePayload = z.infer<typeof ShareImagePayloadSchema>;
```

- [ ] **Step 2: Write the schema's tests**

```ts
// app/api/matches/[id]/share-image/schema.test.ts
import { describe, it, expect } from 'vitest';
import { ShareImagePayloadSchema } from './schema';

const validPayload = {
  gameName: 'X01',
  matchInfo: 'Leg 2',
  players: [
    { name: 'Alice', isWinner: true, statLabel: '3-dart avg', statValue: '58.3' },
    { name: 'Bob', isWinner: false, statLabel: '3-dart avg', statValue: '41.2' },
  ],
};

describe('ShareImagePayloadSchema', () => {
  it('accepts a valid 2-player payload', () => {
    expect(ShareImagePayloadSchema.safeParse(validPayload).success).toBe(true);
  });

  it('accepts a valid 4-player payload', () => {
    const fourPlayers = {
      ...validPayload,
      players: [
        ...validPayload.players,
        { name: 'Carol', isWinner: false, statLabel: '3-dart avg', statValue: '30.1' },
        { name: 'Dan', isWinner: false, statLabel: '3-dart avg', statValue: '25.0' },
      ],
    };
    expect(ShareImagePayloadSchema.safeParse(fourPlayers).success).toBe(true);
  });

  it('rejects fewer than 2 players', () => {
    const result = ShareImagePayloadSchema.safeParse({
      ...validPayload,
      players: [validPayload.players[0]],
    });
    expect(result.success).toBe(false);
  });

  it('rejects more than 4 players', () => {
    const fivePlayers = {
      ...validPayload,
      players: [
        ...validPayload.players,
        { name: 'Carol', isWinner: false, statLabel: 'x', statValue: '1' },
        { name: 'Dan', isWinner: false, statLabel: 'x', statValue: '1' },
        { name: 'Eve', isWinner: false, statLabel: 'x', statValue: '1' },
      ],
    };
    expect(ShareImagePayloadSchema.safeParse(fivePlayers).success).toBe(false);
  });

  it('rejects a payload missing a required field', () => {
    const { gameName, ...rest } = validPayload;
    expect(ShareImagePayloadSchema.safeParse(rest).success).toBe(false);
  });

  it('rejects a payload with a wrong field type', () => {
    const result = ShareImagePayloadSchema.safeParse({
      ...validPayload,
      players: [{ ...validPayload.players[0], isWinner: 'yes' }, validPayload.players[1]],
    });
    expect(result.success).toBe(false);
  });
});
```

- [ ] **Step 3: Run the schema tests to verify they pass**

Run: `npx vitest run app/api/matches/[id]/share-image/schema.test.ts`
Expected: all 6 tests PASS (the schema is complete code, not a stub, so this should pass immediately — this is a validation step, not red-green TDD, since there's no meaningful "fails first" state for a pure schema file).

- [ ] **Step 4: Write the route**

```tsx
// app/api/matches/[id]/share-image/route.tsx
import { ImageResponse } from 'next/og';
import { NextRequest, NextResponse } from 'next/server';
import type { ReactNode } from 'react';
import { ShareImagePayloadSchema, ShareImagePayload } from './schema';

const OCHE = '#141A18';
const SLATE = '#1E2724';
const CHALK = '#F2F4F3';
const SISAL = '#E4D8BC';
const WIRE = '#C0A15C';

const SIZE = 1080;

/** Reuses the exact concentric-ring motif from scripts/generate-pwa-icons.js's targetIcon(),
 *  at a small scale for the header glyph, so the share image and the PWA icon look like the
 *  same brand mark. */
function TargetGlyph({ size }: { size: number }) {
  const ring = (scale: number, color: string, child?: ReactNode) => (
    <div
      style={{
        width: size * scale,
        height: size * scale,
        borderRadius: '50%',
        background: color,
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
      }}
    >
      {child}
    </div>
  );
  return ring(1, WIRE, ring(0.66, OCHE, ring(0.4, WIRE, ring(0.18, CHALK))));
}

function PlayerCard({ player }: { player: ShareImagePayload['players'][number] }) {
  return (
    <div
      style={{
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        justifyContent: 'center',
        width: '440px',
        height: '260px',
        borderRadius: '24px',
        border: player.isWinner ? `4px solid ${WIRE}` : '4px solid transparent',
        background: player.isWinner ? 'rgba(192, 161, 92, 0.12)' : SLATE,
        margin: '16px',
      }}
    >
      <div style={{ display: 'flex', alignItems: 'center' }}>
        {player.isWinner && (
          <div
            style={{
              display: 'flex',
              width: 14,
              height: 14,
              borderRadius: '50%',
              background: WIRE,
              marginRight: '10px',
            }}
          />
        )}
        <div style={{ display: 'flex', fontSize: 32, fontWeight: 700, color: CHALK }}>{player.name}</div>
      </div>
      <div style={{ display: 'flex', fontSize: 96, fontWeight: 800, color: WIRE, marginTop: '12px' }}>
        {player.statValue}
      </div>
      <div
        style={{
          display: 'flex',
          fontSize: 24,
          fontWeight: 600,
          color: SISAL,
          textTransform: 'uppercase',
          letterSpacing: '2px',
          marginTop: '4px',
        }}
      >
        {player.statLabel}
      </div>
    </div>
  );
}

function buildShareImage(payload: ShareImagePayload) {
  return (
    <div
      style={{
        width: SIZE,
        height: SIZE,
        background: OCHE,
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        padding: '60px',
      }}
    >
      <div style={{ display: 'flex', alignItems: 'center', width: '100%' }}>
        <TargetGlyph size={56} />
        <div style={{ display: 'flex', fontSize: 40, fontWeight: 800, color: CHALK, marginLeft: '16px' }}>
          OCHE
        </div>
      </div>

      <div style={{ display: 'flex', fontSize: 30, color: SISAL, marginTop: '24px' }}>
        {`${payload.gameName} · ${payload.matchInfo}`}
      </div>

      <div
        style={{
          display: 'flex',
          flex: 1,
          width: '100%',
          flexDirection: 'row',
          flexWrap: 'wrap',
          justifyContent: 'center',
          alignItems: 'center',
          alignContent: 'center',
        }}
      >
        {payload.players.map((player, i) => (
          <PlayerCard key={i} player={player} />
        ))}
      </div>

      <div
        style={{
          display: 'flex',
          width: '100%',
          height: '8px',
          background: WIRE,
          borderRadius: '4px',
        }}
      />
    </div>
  );
}

export async function POST(req: NextRequest) {
  let body: unknown;
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: 'Invalid JSON body' }, { status: 400 });
  }

  const parsed = ShareImagePayloadSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json({ error: 'Invalid payload' }, { status: 400 });
  }

  try {
    return new ImageResponse(buildShareImage(parsed.data), { width: SIZE, height: SIZE });
  } catch (err) {
    console.error('share-image render failed:', err);
    return NextResponse.json({ error: 'Failed to render image' }, { status: 500 });
  }
}
```

- [ ] **Step 5: Write the route's tests**

```ts
// app/api/matches/[id]/share-image/route.test.ts
import { describe, it, expect } from 'vitest';
import { NextRequest } from 'next/server';
import { POST } from './route';

const validPayload = {
  gameName: 'X01',
  matchInfo: 'Leg 2',
  players: [
    { name: 'Alice', isWinner: true, statLabel: '3-dart avg', statValue: '58.3' },
    { name: 'Bob', isWinner: false, statLabel: '3-dart avg', statValue: '41.2' },
  ],
};

function makeRequest(body: unknown) {
  return new NextRequest('http://localhost/api/matches/abc/share-image', {
    method: 'POST',
    body: JSON.stringify(body),
    headers: { 'content-type': 'application/json' },
  });
}

describe('POST /api/matches/[id]/share-image', () => {
  it('returns a PNG for a valid payload', async () => {
    const response = await POST(makeRequest(validPayload));
    expect(response.status).toBe(200);
    expect(response.headers.get('content-type')).toBe('image/png');
    const buf = Buffer.from(await response.arrayBuffer());
    expect(buf.length).toBeGreaterThan(0);
    expect(buf.subarray(0, 8)).toEqual(Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]));
  });

  it('returns a PNG for a 4-player payload', async () => {
    const fourPlayers = {
      ...validPayload,
      players: [
        ...validPayload.players,
        { name: 'Carol', isWinner: false, statLabel: '3-dart avg', statValue: '30.1' },
        { name: 'Dan', isWinner: false, statLabel: '3-dart avg', statValue: '25.0' },
      ],
    };
    const response = await POST(makeRequest(fourPlayers));
    expect(response.status).toBe(200);
  });

  it('returns 400 for a payload missing required fields', async () => {
    const response = await POST(makeRequest({ gameName: 'X01' }));
    expect(response.status).toBe(400);
  });

  it('returns 400 for invalid JSON', async () => {
    const req = new NextRequest('http://localhost/api/matches/abc/share-image', {
      method: 'POST',
      body: '{not json',
      headers: { 'content-type': 'application/json' },
    });
    const response = await POST(req);
    expect(response.status).toBe(400);
  });
});
```

This test suite was verified against a real `ImageResponse` call in this exact repo/Next.js version during planning: `content-type` is exactly `image/png` (no charset suffix) and `status` is `200` by default — the assertions above are not guesses.

- [ ] **Step 6: Run the route tests to verify they pass**

Run: `npx vitest run app/api/matches/[id]/share-image/`
Expected: all tests in both files PASS.

- [ ] **Step 7: Commit**

```bash
git add app/api/matches/[id]/share-image/
git commit -m "feat(share): add share-image API route"
```

---

### Task 2: ShareResultButton component

**Files:**
- Create: `components/organisms/ShareResultButton.tsx`

**Interfaces:**
- Consumes: nothing from Task 1's code directly (it builds a plain object literal matching `ShareImagePayload`'s shape by convention, not by importing the type — a client component doesn't need the Zod schema, only the shape).
- Produces: `ShareResultPlayer` (exported interface: `{name: string; isWinner: boolean; statLabel: string; statValue: string}`) and `ShareResultButton` (exported component, props `{matchId: string; gameName: string; matchInfo: string; players: ShareResultPlayer[]}`) — Task 3 imports both.

- [ ] **Step 1: Write the component**

```tsx
// components/organisms/ShareResultButton.tsx
'use client';

import { useState } from 'react';
import { Button } from '@/components/atoms/Button';

export interface ShareResultPlayer {
  name: string;
  isWinner: boolean;
  statLabel: string;
  statValue: string;
}

interface ShareResultButtonProps {
  matchId: string;
  gameName: string;
  matchInfo: string;
  players: ShareResultPlayer[];
}

export function ShareResultButton({ matchId, gameName, matchInfo, players }: ShareResultButtonProps) {
  const [status, setStatus] = useState<'idle' | 'loading' | 'error'>('idle');

  async function handleShare() {
    setStatus('loading');
    try {
      const response = await fetch(`/api/matches/${matchId}/share-image`, {
        method: 'POST',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify({ gameName, matchInfo, players }),
      });
      if (!response.ok) {
        setStatus('error');
        return;
      }
      const blob = await response.blob();
      const file = new File([blob], 'oche-result.png', { type: 'image/png' });

      if (typeof navigator.canShare === 'function' && navigator.canShare({ files: [file] })) {
        try {
          await navigator.share({ files: [file], title: 'Oche match result' });
          setStatus('idle');
          return;
        } catch (err) {
          if (err instanceof DOMException && err.name === 'AbortError') {
            setStatus('idle');
            return;
          }
          // Any other share failure falls through to the download fallback below.
        }
      }

      const url = URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = url;
      link.download = 'oche-result.png';
      link.click();
      URL.revokeObjectURL(url);
      setStatus('idle');
    } catch {
      setStatus('error');
    }
  }

  return (
    <div className="flex flex-col items-center gap-2">
      <Button variant="secondary" onClick={handleShare} disabled={status === 'loading'}>
        {status === 'loading' ? 'Generating…' : 'Share Result'}
      </Button>
      {status === 'error' && <p className="text-sm text-treble">Couldn't generate image — try again.</p>}
    </div>
  );
}
```

- [ ] **Step 2: Verify it type-checks**

Run: `npx tsc --noEmit`
Expected: no new errors introduced by this file. There is no automated test for this component — the project has zero component-level tests anywhere (`find components -iname "*.test.*"` returns nothing), consistent with its established pattern of testing pure logic only and verifying UI manually. This file's logic (fetch → share-or-download) depends entirely on browser APIs (`navigator.share`, `URL.createObjectURL`, DOM element creation) that aren't available in this project's `vitest` config (`environment: 'node'`, no jsdom) — manual verification happens in Task 3.

- [ ] **Step 3: Commit**

```bash
git add components/organisms/ShareResultButton.tsx
git commit -m "feat(share): add ShareResultButton component"
```

---

### Task 3: Wire into PostMatchStats and verify end-to-end

**Files:**
- Modify: `components/organisms/PostMatchStats.tsx` (entire file, currently 57 lines — replaced in full below)
- Modify: `app/(match)/match/[id]/page.tsx:325-334` (the `<PostMatchStats>` call site)

**Interfaces:**
- Consumes: `ShareResultButton`, `ShareResultPlayer` from Task 2 (`@/components/organisms/ShareResultButton`).
- Consumes (pre-existing, not from this plan): `GameModule.matchInfo`, `GameModule.matchStats`, `GameModule.statTiles`, `GameModule.name` from `lib/types.ts`; the `displayNames: Map<string, string>` already built in `page.tsx` (currently only passed to `HistoryPanel`, not to `PostMatchStats`).
- Produces: nothing further — this is the final task.

**Note on `displayNames`:** `PostMatchStats.tsx` currently renders the raw `playerId` on screen (`{playerId}{isWinner ? ' — Winner' : ''}`), never resolving it to a display name — unlike `HistoryPanel`, which already receives and uses `displayNames`. This task adds a `displayNames` prop to `PostMatchStats` and uses it both for the on-screen player label (a small, in-scope visual fix — remote-mode post-match now shows real names instead of raw player IDs, matching what `HistoryPanel` already does) and for the share image's `name` field. In local mode `displayNames` is empty (per the existing comment in `page.tsx`), so `.get(playerId) ?? playerId` falls back to the raw ID exactly as today — this is not a behavior change for local matches.

- [ ] **Step 1: Replace `components/organisms/PostMatchStats.tsx` in full**

```tsx
// components/organisms/PostMatchStats.tsx
'use client';
import { GameModule, PlayerId, StatTileDef } from '@/lib/types';
import { HeatmapBoard } from './HeatmapBoard';
import { Button } from '@/components/atoms/Button';
import { ShareResultButton, ShareResultPlayer } from './ShareResultButton';

interface PostMatchStatsProps {
  matchId: string;
  gameModule: GameModule<any, any>;
  state: any;
  settings: any;
  players: PlayerId[];
  winnerId: PlayerId | null;
  displayNames: Map<string, string>;
}

export function PostMatchStats({
  matchId,
  gameModule,
  state,
  settings,
  players,
  winnerId,
  displayNames,
}: PostMatchStatsProps) {
  const headlineTile = gameModule.statTiles[0];
  const matchInfoText = gameModule
    .matchInfo(state, settings)
    .map((info: { label: string; value: string }) => `${info.label} ${info.value}`)
    .join(' · ');

  const sharePlayers: ShareResultPlayer[] = players.map((playerId) => {
    const stats = gameModule.matchStats(state, playerId, settings);
    return {
      name: displayNames.get(playerId) ?? playerId,
      isWinner: playerId === winnerId,
      statLabel: headlineTile.label,
      statValue: String(headlineTile.value(stats)),
    };
  });

  return (
    <div className="rounded-2xl bg-slate p-4 border border-wire/40 flex flex-col gap-4">
      <p className="text-lg font-display font-bold text-center">Match Complete!</p>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {players.map((playerId) => {
          const stats = gameModule.matchStats(state, playerId, settings);
          const heatmap = gameModule.heatmap(state, playerId);
          const isWinner = playerId === winnerId;

          return (
            <div
              key={playerId}
              className={`rounded-2xl p-4 border-2 flex flex-col gap-3 ${
                isWinner ? 'border-wire bg-wire/10' : 'border-transparent bg-oche'
              }`}
            >
              <div className="text-sm font-bold uppercase tracking-widest text-sisal">
                {displayNames.get(playerId) ?? playerId}
                {isWinner ? ' — Winner' : ''}
              </div>

              <div className="grid grid-cols-2 gap-3">
                {gameModule.statTiles.map((tile: StatTileDef<any>) => (
                  <div key={tile.key} className="text-center">
                    <div className="text-[10px] font-bold uppercase tracking-widest text-sisal">{tile.label}</div>
                    <div className="text-xl font-display font-bold">{tile.value(stats)}</div>
                  </div>
                ))}
              </div>

              <HeatmapBoard heatmap={heatmap} />
            </div>
          );
        })}
      </div>

      <div className="flex gap-3 justify-center">
        <ShareResultButton
          matchId={matchId}
          gameName={gameModule.name}
          matchInfo={matchInfoText}
          players={sharePlayers}
        />
        <Button onClick={() => (window.location.href = '/')}>Back to Dashboard</Button>
      </div>
    </div>
  );
}
```

- [ ] **Step 2: Update the call site in `app/(match)/match/[id]/page.tsx`**

Find (around line 325-334):

```tsx
      {isComplete && (
        <PostMatchStats
          gameModule={gameModule}
          state={gameState}
          settings={settings}
          players={players}
          winnerId={gameModule.winner(gameState)}
        />
      )}
```

Replace with:

```tsx
      {isComplete && (
        <PostMatchStats
          matchId={id}
          gameModule={gameModule}
          state={gameState}
          settings={settings}
          players={players}
          winnerId={gameModule.winner(gameState)}
          displayNames={displayNames}
        />
      )}
```

(`id` and `displayNames` are both already in scope at this point in `page.tsx` — `id` from `const { id } = use(params);` near the top of the component, `displayNames` from the `Map` built just above the returned JSX.)

- [ ] **Step 3: Run the full regression check**

Run: `npx tsc --noEmit && npx vitest run`
Expected: `tsc` clean, all existing tests plus this plan's new tests in Task 1 pass (test count increases by the number of tests added in Task 1's two test files; no other test file changes).

- [ ] **Step 4: Manual end-to-end verification**

Using `npm run dev`:

1. Start and complete a local X01 match (2 players). On the post-match screen, confirm both players now show correctly (raw player IDs, since `displayNames` is empty in local mode — unchanged from before), confirm the "Share Result" button appears next to "Back to Dashboard", click it, confirm a PNG downloads (or the share sheet opens, if the test browser/OS supports `navigator.share({files})`) showing both players' names, the winner highlighted with the wire-gold border, and each player's 3-dart average as the headline stat.
2. Repeat for a completed Cricket match (2 players), confirming the headline stat shown is MPR (Cricket's `statTiles[0]`), proving the route and button are genuinely generic across game types with zero game-specific code.
3. Repeat once more with a 3- or 4-player Cricket match if convenient, to visually confirm the 2×2 card grid layout holds up with more than 2 players.
4. If available, test on a mobile browser (or one of this machine's browsers) known to support `navigator.share({files: [...]})` (e.g. Chrome on Android, Safari on iOS) to confirm the native share sheet opens with the image attached, not just the download fallback. If no such device/browser is available in this environment, note that explicitly as an acknowledged gap in the final report — do not claim it was tested if it wasn't, matching how the PWA plan's Task 4 handled its own real-device verification gaps.
5. Confirm clicking "Back to Dashboard" still works normally regardless of whether Share was used first.

- [ ] **Step 5: Commit**

```bash
git add components/organisms/PostMatchStats.tsx "app/(match)/match/[id]/page.tsx"
git commit -m "feat(share): wire ShareResultButton into the post-match screen"
```

- [ ] **Step 6: Report**

No further commit needed — Step 4 is verification only. Summarize what was verified for X01 and Cricket, and note explicitly whether the native-share (not just download-fallback) path was actually confirmed on a real device/browser, or flagged as an acknowledged gap.
