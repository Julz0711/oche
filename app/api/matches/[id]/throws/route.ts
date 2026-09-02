// app/api/matches/[id]/throws/route.ts
import { connectDB } from '@/lib/db';
import { Match, Visit } from '@/lib/db/models';
import { NextRequest, NextResponse } from 'next/server';
import mongoose from 'mongoose';
import { getIdentity } from '@/lib/identity';
import { canSubmitThrow, newlyCompletedVisit } from '@/lib/matchThrows';
import { publishMatchEvent } from '@/lib/realtime';
import { getGameModule, GameId } from '@/lib/games/registry';
import { createPlayerId, Throw } from '@/lib/types';
import { computePoints, isValidRing, isValidSector } from '@/lib/scoring';

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
  const throw_ = (body as { throw?: Throw })?.throw;
  if (!throw_ || typeof throw_.sector !== 'number' || typeof throw_.ring !== 'string') {
    return NextResponse.json({ error: 'Invalid throw' }, { status: 400 });
  }
  if (!isValidRing(throw_.ring)) {
    return NextResponse.json({ error: 'Invalid ring' }, { status: 400 });
  }
  if (!isValidSector(throw_.sector, throw_.ring)) {
    return NextResponse.json({ error: 'Invalid sector' }, { status: 400 });
  }
  // Server is the source of truth for scoring: never trust the client-supplied `points` field.
  const points = computePoints(throw_.sector, throw_.ring);
  const trustedThrow: Throw = { ...throw_, points };

  await connectDB();
  const match = await Match.findById(id);
  if (!match) {
    return NextResponse.json({ error: 'Match not found' }, { status: 404 });
  }
  if (match.status !== 'live') {
    return NextResponse.json({ error: 'Match is not live' }, { status: 409 });
  }

  const { identity } = await getIdentity(req);
  const gameModule = await getGameModule(match.gameId as GameId);

  const check = canSubmitThrow(gameModule, match.state, identity.id);
  if (!check.ok) {
    return NextResponse.json({ error: check.error }, { status: check.status });
  }

  const playerId = createPlayerId(identity.id);
  const newState = gameModule.applyThrow(match.state, trustedThrow, match.settings);

  const visit = newlyCompletedVisit(gameModule, newState, playerId);
  if (visit) {
    await Visit.create({ matchId: id, ...visit, enteredBy: identity.id });
  }

  match.state = newState;
  let status = match.status;
  if (gameModule.isComplete(newState)) {
    status = 'complete';
    match.status = 'complete';
    match.winnerId = gameModule.winner(newState);
    match.completedAt = new Date();
  }
  await match.save();

  await publishMatchEvent(id, { name: 'state', data: { state: newState, status, winnerId: match.winnerId } });

  return NextResponse.json({ ok: true });
}
