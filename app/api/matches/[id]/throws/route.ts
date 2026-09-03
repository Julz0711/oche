// app/api/matches/[id]/throws/route.ts
import { connectDB } from '@/lib/db';
import { Match, Visit } from '@/lib/db/models';
import { NextRequest, NextResponse } from 'next/server';
import mongoose from 'mongoose';
import { getIdentity } from '@/lib/identity';
import { canSubmitThrow, newlyCompletedVisit } from '@/lib/matchThrows';
import { publishMatchEvent } from '@/lib/realtime';
import { getGameModule, GameId } from '@/lib/games/registry';
import { createPlayerId, Throw, Ring } from '@/lib/types';

const VALID_RINGS: readonly Ring[] = ['S', 'D', 'T', 'OB', 'IB', 'M'];

/** Type guard for the six valid Ring values — basic request-shape hygiene, not anti-cheat (no
 *  engine trusts a client-supplied `points` value regardless of how well-formed the throw is). */
function isValidRing(ring: unknown): ring is Ring {
  return typeof ring === 'string' && (VALID_RINGS as readonly string[]).includes(ring);
}

/** Whether `sector` is legal for the given `ring`. OB/IB are fixed-value bull rings — the client
 *  encodes both with `sector: 25`, but the sector value doesn't affect them, so any sector is
 *  accepted. M (miss) is likewise sector-irrelevant. S/D/T require a sector in the 1-20 range. */
function isValidSector(sector: unknown, ring: Ring): boolean {
  if (typeof sector !== 'number' || !Number.isInteger(sector)) return false;
  if (ring === 'OB' || ring === 'IB' || ring === 'M') return true;
  return sector >= 1 && sector <= 20;
}

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
  // Points are never trusted from the client — every GameModule's applyThrow derives the real
  // score itself from sector+ring+its own state, so whatever points value throw_ carries here is
  // ignored by the engine entirely.
  const newState = gameModule.applyThrow(match.state, throw_, match.settings);

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
