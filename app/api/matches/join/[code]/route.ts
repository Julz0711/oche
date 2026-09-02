// app/api/matches/join/[code]/route.ts
import { connectDB } from '@/lib/db';
import { Match } from '@/lib/db/models';
import { NextRequest, NextResponse } from 'next/server';
import { auth } from '@/lib/auth';
import { getIdentity, applyIdentityCookie } from '@/lib/identity';
import { canJoinLobby, isSeated, seatFor } from '@/lib/matchLobby';
import { publishMatchEvent } from '@/lib/realtime';

// Room codes are reused once a match completes (see app/api/matches/route.ts's creation logic),
// so any lookup by roomCode alone must be scoped to still-open matches — otherwise a completed
// match with the same code can shadow a newer open lobby. Keeping 'live' in the filter preserves
// the correct "already started" 409 for a player re-opening their own join link post-start.
const OPEN_STATUS_FILTER = { $in: ['lobby', 'live'] as const };

export async function POST(req: NextRequest, { params }: { params: Promise<{ code: string }> }) {
  const { code } = await params;
  const roomCode = code.toUpperCase();

  await connectDB();
  const { identity, newGuestCookie } = await getIdentity(req);
  const session = await auth();
  const seatDoc = seatFor(identity, session?.user?.name ?? 'Guest', 1);

  // Atomic conditional write: only seats this identity if the match is still an open lobby with
  // at most one player currently seated. This closes the check-then-act race where two
  // near-simultaneous joins (e.g. React Strict Mode's double-invoked effect) could both read
  // players.length === 1 before either write lands, and both push — overfilling the match.
  const seatedMatch = await Match.findOneAndUpdate(
    {
      roomCode,
      status: 'lobby',
      'players.1': { $exists: false },
      // Exclude matches where this identity is already seated — otherwise a host re-hitting
      // their own join link before anyone else joins would match this same condition (only one
      // seat filled) and get double-seated. The idempotent "already seated" case is instead
      // handled entirely by the fallback re-fetch below via isSeated.
      players: { $not: { $elemMatch: { $or: [{ userId: identity.id }, { guestId: identity.id }] } } },
    },
    { $push: { players: seatDoc } },
    { new: true }
  );

  if (seatedMatch) {
    await publishMatchEvent(seatedMatch._id.toString(), { name: 'lobby', data: { players: seatedMatch.players } });
    return applyIdentityCookie(NextResponse.json({ id: seatedMatch._id.toString() }), newGuestCookie);
  }

  // The conditional update matched nothing — re-fetch to diagnose why, reusing the existing
  // lobby-eligibility helpers rather than duplicating their error messages.
  const match = await Match.findOne({ roomCode, status: OPEN_STATUS_FILTER }).sort({ createdAt: -1 });
  if (!match) {
    return NextResponse.json({ error: 'Room not found' }, { status: 404 });
  }

  if (isSeated(match.players, identity)) {
    // Idempotent: this identity is already seated (e.g. its own join link, or the losing side of
    // the race above whose write didn't land — findOneAndUpdate above would have been a no-op for
    // it, but it's already seated by the other request that did land).
    return applyIdentityCookie(NextResponse.json({ id: match._id.toString() }), newGuestCookie);
  }

  const check = canJoinLobby({ status: match.status, players: match.players }, identity);
  if (!check.ok) {
    return NextResponse.json({ error: check.error }, { status: check.status });
  }

  // canJoinLobby said ok but the atomic update still didn't match — status must have changed
  // between the two reads. Report as not-open rather than silently retrying.
  return NextResponse.json({ error: 'Match is not open for joining' }, { status: 409 });
}
