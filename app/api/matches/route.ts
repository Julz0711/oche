// app/api/matches/route.ts
import { connectDB } from '@/lib/db';
import { Match } from '@/lib/db/models';
import { NextRequest, NextResponse } from 'next/server';
import { auth } from '@/lib/auth';
import { gameRegistry, getGameModule, GameId } from '@/lib/games/registry';
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

  const gameModule = await getGameModule(gameId as GameId);

  // Settings are optional — a caller that omits them gets the game's defaults. When provided,
  // they must fully validate against this game's own schema (the dashboard sends a complete
  // settings object, built from defaultSettings with the user's picks overlaid, never a partial
  // one) so a malformed or forged settings payload can't reach match state.
  const settingsInput = (body as { settings?: unknown })?.settings;
  let settings = gameModule.defaultSettings;
  if (settingsInput !== undefined) {
    const parsed = gameModule.settingsSchema.safeParse(settingsInput);
    if (!parsed.success) {
      return NextResponse.json({ error: 'Invalid settings for this game' }, { status: 400 });
    }
    settings = parsed.data;
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
      settings,
      userId: session?.user?.id,
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
  while (await Match.exists({ roomCode })) {
    roomCode = generateRoomCode();
  }

  const match = await Match.create({
    gameId,
    mode: 'remote',
    status: 'lobby',
    roomCode,
    settings,
    hostId: identity.id,
    players: [seatFor(identity, session?.user?.name ?? 'Guest')],
  });

  return applyIdentityCookie(NextResponse.json({ id: match._id.toString(), roomCode }), newGuestCookie);
}
