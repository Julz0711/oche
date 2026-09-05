// app/api/matches/[id]/complete/route.ts
import { connectDB } from '@/lib/db';
import { Match } from '@/lib/db/models';
import { NextRequest, NextResponse } from 'next/server';
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
  if (state === undefined || (typeof winnerId !== 'string' && winnerId !== null)) {
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
  if (match.status !== 'live') {
    // Idempotency guard: a second completion call (e.g. a duplicate effect firing) is a no-op.
    return NextResponse.json({ ok: true });
  }

  match.state = state;
  match.winnerId = winnerId;
  match.status = 'complete';
  match.completedAt = new Date();
  await match.save();

  return NextResponse.json({ ok: true });
}
