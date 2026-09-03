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
