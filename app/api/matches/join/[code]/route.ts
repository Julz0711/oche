// app/api/matches/join/[code]/route.ts
import { connectDB } from '@/lib/db';
import { Match } from '@/lib/db/models';
import { NextRequest, NextResponse } from 'next/server';
import { auth } from '@/lib/auth';
import { getIdentity, applyIdentityCookie } from '@/lib/identity';
import { canJoinLobby, isSeated, seatFor } from '@/lib/matchLobby';
import { publishMatchEvent } from '@/lib/realtime';

export async function POST(req: NextRequest, { params }: { params: Promise<{ code: string }> }) {
  const { code } = await params;

  await connectDB();
  const match = await Match.findOne({ roomCode: code.toUpperCase() });
  if (!match) {
    return NextResponse.json({ error: 'Room not found' }, { status: 404 });
  }

  const { identity, newGuestCookie } = await getIdentity(req);
  const check = canJoinLobby({ status: match.status, players: match.players }, identity);
  if (!check.ok) {
    return NextResponse.json({ error: check.error }, { status: check.status });
  }

  if (!isSeated(match.players, identity)) {
    const session = await auth();
    match.players.push(seatFor(identity, session?.user?.name ?? 'Guest', match.players.length));
    await match.save();
    await publishMatchEvent(match._id.toString(), { name: 'lobby', data: { players: match.players } });
  }

  return applyIdentityCookie(NextResponse.json({ id: match._id.toString() }), newGuestCookie);
}
