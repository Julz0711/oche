// app/api/ably/token/route.ts
import { NextRequest, NextResponse } from 'next/server';
import mongoose from 'mongoose';
import { connectDB } from '@/lib/db';
import { Match } from '@/lib/db/models';
import { getIdentity, applyIdentityCookie } from '@/lib/identity';
import { createMatchToken } from '@/lib/realtime';

export async function GET(req: NextRequest) {
  const matchId = req.nextUrl.searchParams.get('matchId');
  if (!matchId || !mongoose.Types.ObjectId.isValid(matchId)) {
    return NextResponse.json({ error: 'Invalid or missing matchId' }, { status: 400 });
  }

  const { identity, newGuestCookie } = await getIdentity(req);

  await connectDB();
  const match = await Match.findById(matchId);
  if (!match) {
    return NextResponse.json({ error: 'Match not found' }, { status: 404 });
  }

  const isSeated = match.players.some(
    (p: { userId?: string; guestId?: string }) => p.userId === identity.id || p.guestId === identity.id
  );
  if (!isSeated) {
    return NextResponse.json({ error: 'Not a participant in this match' }, { status: 403 });
  }

  let tokenRequest;
  try {
    tokenRequest = await createMatchToken(matchId, identity.id);
  } catch (err) {
    console.error('Ably token request failed:', err);
    return NextResponse.json(
      { error: 'Live updates are unavailable. Please try again.' },
      { status: 500 }
    );
  }
  return applyIdentityCookie(NextResponse.json(tokenRequest), newGuestCookie);
}
