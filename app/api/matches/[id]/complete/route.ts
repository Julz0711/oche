// app/api/matches/[id]/complete/route.ts
import { connectDB } from '@/lib/db';
import { Match } from '@/lib/db/models';
import { NextRequest, NextResponse } from 'next/server';
import { getIdentity } from '@/lib/identity';
import { canAccessMatch } from '@/lib/matchAccess';
import mongoose from 'mongoose';

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
  const state = (body as { state?: unknown })?.state;
  const winnerId = (body as { winnerId?: unknown })?.winnerId;
  if (
    state === undefined ||
    state === null ||
    typeof state !== 'object' ||
    (typeof winnerId !== 'string' && winnerId !== null)
  ) {
    return NextResponse.json({ error: 'Invalid body' }, { status: 400 });
  }

  await connectDB();
  const match = await Match.findById(id);
  if (!match) {
    return NextResponse.json({ error: 'Match not found' }, { status: 404 });
  }
  if (match.mode !== 'local') {
    return NextResponse.json({ error: 'This route is for local matches only' }, { status: 400 });
  }

  const { identity } = await getIdentity(req);
  if (!canAccessMatch(match, identity)) {
    return NextResponse.json({ error: 'Only the owner can complete this match' }, { status: 403 });
  }

  await Match.findOneAndUpdate(
    { _id: id, status: 'live' },
    { state, winnerId, status: 'complete', completedAt: new Date() }
  );
  // Idempotent either way: if another request already completed this match between the
  // findById above and this update, the filter simply matches nothing and this is a no-op.

  return NextResponse.json({ ok: true });
}
