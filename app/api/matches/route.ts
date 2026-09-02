// app/api/matches/route.ts
import { connectDB } from '@/lib/db';
import { Match } from '@/lib/db/models';
import { NextRequest, NextResponse } from 'next/server';
import { auth } from '@/lib/auth';
import { gameRegistry } from '@/lib/games/registry';
import { getIdentity, applyIdentityCookie } from '@/lib/identity';
import { generateRoomCode } from '@/lib/roomCode';
import { seatFor } from '@/lib/matchLobby';

export async function POST(req: NextRequest) {
  let body: unknown;
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: 'Invalid JSON body' }, { status: 400 });
  }

  const gameId = (body as { gameId?: unknown })?.gameId;
  if (typeof gameId !== 'string' || !Object.prototype.hasOwnProperty.call(gameRegistry, gameId)) {
    return NextResponse.json({ error: 'Invalid or unrecognized gameId' }, { status: 400 });
  }

  const modeInput = (body as { mode?: unknown })?.mode;
  const mode = modeInput === 'remote' ? 'remote' : 'local';

  await connectDB();

  if (mode === 'local') {
    const session = await auth();
    const match = await Match.create({
      gameId,
      mode: 'local',
      status: 'live',
      players: [
        { name: session?.user?.name || 'Guest 1', isGuest: !session },
        { name: 'Guest 2', isGuest: true },
      ],
    });
    return NextResponse.json({ id: match._id.toString() });
  }

  // mode === 'remote'
  const { identity, newGuestCookie } = await getIdentity(req);
  const session = await auth();

  let roomCode = generateRoomCode();
  while (await Match.exists({ roomCode, status: { $in: ['lobby', 'live'] } })) {
    roomCode = generateRoomCode();
  }

  const match = await Match.create({
    gameId,
    mode: 'remote',
    status: 'lobby',
    roomCode,
    hostId: identity.id,
    players: [seatFor(identity, session?.user?.name ?? 'Guest', 0)],
  });

  return applyIdentityCookie(NextResponse.json({ id: match._id.toString(), roomCode }), newGuestCookie);
}
