// app/api/matches/[id]/route.ts
import { connectDB } from '@/lib/db';
import { Match } from '@/lib/db/models';
import { NextRequest, NextResponse } from 'next/server';
import mongoose from 'mongoose';
import { getIdentity, applyIdentityCookie } from '@/lib/identity';
import { isSeated } from '@/lib/matchLobby';
import { auth } from '@/lib/auth';

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

/** Lets the host remove a not-yet-finished match from their own "active games" list — a soft
 *  delete via the 'abandoned' status (already reserved on the schema, never previously set
 *  anywhere) rather than an actual document delete, so a still-connected opponent's client
 *  doesn't hit a 404 mid-match; it just stops showing up as resumable for the host. */
export async function DELETE(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
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
  if (match.hostId !== session.user.id) {
    return NextResponse.json({ error: 'Only the host can delete this match' }, { status: 403 });
  }
  if (match.status === 'complete') {
    return NextResponse.json({ error: 'Match already completed' }, { status: 409 });
  }

  match.status = 'abandoned';
  await match.save();

  return NextResponse.json({ ok: true });
}
