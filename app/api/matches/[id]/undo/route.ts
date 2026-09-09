// app/api/matches/[id]/undo/route.ts
import { connectDB } from '@/lib/db';
import { Match, Visit } from '@/lib/db/models';
import { NextRequest, NextResponse } from 'next/server';
import mongoose from 'mongoose';
import { getIdentity } from '@/lib/identity';
import { isSeated } from '@/lib/matchLobby';
import { publishMatchEvent } from '@/lib/realtime';
import { getGameModule, GameId } from '@/lib/games/registry';

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
  if (match.status !== 'live') {
    return NextResponse.json({ error: 'Match is not live' }, { status: 409 });
  }

  const { identity } = await getIdentity(req);
  if (!isSeated(match.players, identity)) {
    return NextResponse.json({ error: 'Not a participant in this match' }, { status: 403 });
  }

  const gameModule = await getGameModule(match.gameId as GameId);
  const removedCompletedVisit = gameModule.visitProgress(match.state).darts === 0;
  const newState = gameModule.undo(match.state);

  match.state = newState;
  await match.save();

  // Mid-turn undo only removes a dart; preserve the previously completed Visit row.
  // At a visit boundary the engine removes the last completed visit, so remove its row too.
  if (removedCompletedVisit) await Visit.findOneAndDelete({ matchId: id }).sort({ createdAt: -1 });

  await publishMatchEvent(id, { name: 'state', data: { state: newState, status: match.status } });

  return NextResponse.json({ ok: true });
}
