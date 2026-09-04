// app/api/matches/[id]/start/route.ts
import { connectDB } from '@/lib/db';
import { Match } from '@/lib/db/models';
import { NextRequest, NextResponse } from 'next/server';
import mongoose from 'mongoose';
import { getIdentity } from '@/lib/identity';
import { canStartMatch, identityIdOf } from '@/lib/matchLobby';
import { publishMatchEvent } from '@/lib/realtime';
import { getGameModule, GameId } from '@/lib/games/registry';
import { createPlayerId } from '@/lib/types';

export async function POST(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  if (!mongoose.Types.ObjectId.isValid(id)) {
    return NextResponse.json({ error: 'Invalid match id' }, { status: 400 });
  }

  await connectDB();
  const match = await Match.findById(id);
  if (!match) {
    return NextResponse.json({ error: 'Match not found' }, { status: 404 });
  }

  const { identity } = await getIdentity(req);
  const check = canStartMatch({ status: match.status, players: match.players, hostId: match.hostId }, identity);
  if (!check.ok) {
    return NextResponse.json({ error: check.error }, { status: check.status });
  }

  const gameModule = await getGameModule(match.gameId as GameId);
  const playerIds = match.players
    .sort((a: { seat: number }, b: { seat: number }) => a.seat - b.seat)
    .map((p: any) => createPlayerId(identityIdOf(p)));

  // The settings chosen at match-creation time (validated there against this game's schema)
  // ride along on the lobby document until the match actually starts — falls back to defaults
  // only if somehow absent (e.g. a match created before this field existed).
  const settings = match.settings ?? gameModule.defaultSettings;
  const state = gameModule.init(playerIds, settings);

  match.state = state;
  match.settings = settings;
  match.status = 'live';
  match.startedAt = new Date();
  await match.save();

  await publishMatchEvent(id, { name: 'state', data: { state, status: 'live' } });

  return NextResponse.json({ ok: true });
}
