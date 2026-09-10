// app/api/matches/route.ts
import { connectDB } from '@/lib/db';
import { Match } from '@/lib/db/models';
import { NextRequest, NextResponse } from 'next/server';
import { auth } from '@/lib/auth';
import { gameRegistry, getGameModule, GameId } from '@/lib/games/registry';
import { getIdentity, applyIdentityCookie } from '@/lib/identity';
import { generateRoomCode } from '@/lib/roomCode';
import { LocalPlayerNamesSchema, localSeats } from '@/lib/localPlayers';
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
  if (modeInput !== undefined && modeInput !== 'local' && modeInput !== 'remote') {
    return NextResponse.json({ error: 'Invalid match mode' }, { status: 400 });
  }
  const mode = modeInput === 'remote' ? 'remote' : 'local';
  const names = LocalPlayerNamesSchema.safeParse((body as { playerNames?: unknown })?.playerNames ?? ['Player 1', 'Player 2']);
  if (mode === 'local' && (!names.success || names.data.length < gameModule.playerRange[0] || names.data.length > gameModule.playerRange[1])) {
    return NextResponse.json({ error: 'Enter names of 1 to 32 characters for 2 to 8 players.' }, { status: 400 });
  }

  await connectDB();

  if (mode === 'local') {
    const session = await auth();
    const { identity, newGuestCookie } = await getIdentity(req);
    const match = await Match.create({
      gameId,
      mode: 'local',
      status: 'live',
      settings,
      userId: session?.user?.id,
      hostId: identity.id,
      players: localSeats(names.success ? names.data : [], session?.user?.name, session?.user?.id),
    });
    return applyIdentityCookie(NextResponse.json({ id: match._id.toString() }), newGuestCookie);
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
