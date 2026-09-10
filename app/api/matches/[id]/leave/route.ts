// app/api/matches/[id]/leave/route.ts
import { connectDB } from '@/lib/db';
import { Match } from '@/lib/db/models';
import { NextRequest, NextResponse } from 'next/server';
import mongoose from 'mongoose';
import { auth } from '@/lib/auth';
import { canLeaveMatch, allParticipantsLeft } from '@/lib/matchLobby';

/** Lets any signed-in participant — host or seated player, not just the host — drop this match
 *  off their own "active games" list without touching it for anyone else still in it. Idempotent:
 *  leaving twice is a no-op. Once every participant has left, the match is marked abandoned so it
 *  doesn't linger forever with nobody left to come back to it. */
export async function POST(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;

  if (!mongoose.Types.ObjectId.isValid(id)) {
    return NextResponse.json({ error: 'Invalid match id' }, { status: 400 });
  }

  const session = await auth();
  if (!session?.user?.id) {
    return NextResponse.json({ error: 'Not signed in' }, { status: 401 });
  }

  await connectDB();
  const match = await Match.findById(id);
  if (!match) {
    return NextResponse.json({ error: 'Match not found' }, { status: 404 });
  }

  const userId = session.user.id;
  const result = canLeaveMatch(match, userId);
  if (!result.ok) {
    return NextResponse.json({ error: result.error }, { status: result.status });
  }

  if (!match.leftBy.includes(userId)) {
    match.leftBy = [...match.leftBy, userId];
    if (allParticipantsLeft(match)) {
      match.status = 'abandoned';
    }
    await match.save();
  }

  return NextResponse.json({ ok: true });
}
