// app/api/matches/[id]/route.ts
import { connectDB } from '@/lib/db';
import { Match } from '@/lib/db/models';
import { NextRequest, NextResponse } from 'next/server';
import mongoose from 'mongoose';
import { getIdentity, applyIdentityCookie } from '@/lib/identity';
import { isSeated } from '@/lib/matchLobby';

export async function GET(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;

  if (!mongoose.Types.ObjectId.isValid(id)) {
    return NextResponse.json({ error: 'Invalid match id' }, { status: 400 });
  }

  await connectDB();
  const match = await Match.findById(id);

  if (!match) {
    return NextResponse.json({ error: 'Match not found' }, { status: 404 });
  }

  const { identity, newGuestCookie } = await getIdentity(req);

  return applyIdentityCookie(
    NextResponse.json({
      gameId: match.gameId,
      mode: match.mode,
      status: match.status,
      state: match.state ?? null,
      settings: match.settings ?? null,
      players: match.players,
      hostId: match.hostId ?? null,
      roomCode: match.roomCode ?? null,
      you: isSeated(match.players, identity) ? identity.id : null,
    }),
    newGuestCookie
  );
}
