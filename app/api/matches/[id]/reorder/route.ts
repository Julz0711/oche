// app/api/matches/[id]/reorder/route.ts
import { connectDB } from '@/lib/db';
import { Match } from '@/lib/db/models';
import { NextRequest, NextResponse } from 'next/server';
import mongoose from 'mongoose';
import { getIdentity } from '@/lib/identity';
import { canReorderLobby, identityIdOf, MatchPlayerDoc } from '@/lib/matchLobby';
import { publishMatchEvent } from '@/lib/realtime';

export async function POST(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  if (!mongoose.Types.ObjectId.isValid(id)) {
    return NextResponse.json({ error: 'Invalid match id' }, { status: 400 });
  }

  let body: unknown;
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: 'Invalid JSON body' }, { status: 400 });
  }

  const order = (body as { order?: unknown })?.order;
  if (!Array.isArray(order) || !order.every((entry) => typeof entry === 'string')) {
    return NextResponse.json({ error: 'order must be an array of player ids' }, { status: 400 });
  }

  await connectDB();
  const match = await Match.findById(id);
  if (!match) {
    return NextResponse.json({ error: 'Match not found' }, { status: 404 });
  }

  const { identity } = await getIdentity(req);
  const check = canReorderLobby(
    { status: match.status, players: match.players, hostId: match.hostId },
    identity,
    order
  );
  if (!check.ok) {
    return NextResponse.json({ error: check.error }, { status: check.status });
  }

  const byIdentityId = new Map<string, MatchPlayerDoc>(match.players.map((p: MatchPlayerDoc) => [identityIdOf(p), p]));
  match.players = order.map((playerId: string) => byIdentityId.get(playerId));
  await match.save();

  await publishMatchEvent(id, { name: 'lobby', data: { players: match.players } });

  return NextResponse.json({ ok: true });
}
