// app/api/matches/[id]/visits/achievements/route.ts
/**
 * Achievement evaluation for a single completed visit.
 *
 * The engine (`lib/games/achievements.ts`) talks to mongoose, so it can only run on the server,
 * but the visit that just finished exists on the client: local matches keep their whole game state
 * in localStorage until completion, so there is no server-side visit to read for them. The match
 * page therefore posts the visit it just saw complete for the signed-in player's own seat, and
 * this route evaluates the round-scoped achievements (180s, 100+ rounds, all-triples rounds,
 * first triple / first bull, …) and returns the newly unlocked ones, each with the user's current
 * count so the toast can render "(xN)".
 *
 * Trust: the darts' `points` are never taken from the request — `parseThrows` recomputes each
 * dart's value from sector+ring, so the only thing a client can influence is *which* darts it
 * claims to have thrown. Evaluation is limited to live matches the caller is a participant in.
 */
import { auth } from '@/lib/auth';
import { connectDB } from '@/lib/db';
import { Match } from '@/lib/db/models';
import { NextRequest, NextResponse } from 'next/server';
import mongoose from 'mongoose';
import { evaluateVisitAchievements } from '@/lib/games/achievements';
import type { VisitData } from '@/lib/achievements/types';
import { isParticipant, withCounts, type MatchDoc } from '@/lib/achievements/matchAccess';
import { parseThrows } from '@/lib/throwValidation';

/** No game in the registry allows more than three darts in a visit; the cap is a sanity bound. */
const MAX_DARTS_PER_VISIT = 3;

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

  const { throws: throwsInput, busted, isCheckout } = (body ?? {}) as {
    throws?: unknown;
    busted?: unknown;
    isCheckout?: unknown;
  };
  const throws = parseThrows(throwsInput, MAX_DARTS_PER_VISIT);
  if (!throws || throws.length === 0) {
    return NextResponse.json({ error: 'Invalid visit throws' }, { status: 400 });
  }

  await connectDB();
  const session = await auth();
  const userId = session?.user?.id;
  if (!userId) {
    // Guests have no achievement record to write to — not an error, just nothing to award.
    return NextResponse.json({ achievements: [] });
  }

  const match = (await Match.findById(id).lean()) as MatchDoc | null;
  if (!match) {
    return NextResponse.json({ error: 'Match not found' }, { status: 404 });
  }
  if (!isParticipant(match, userId)) {
    return NextResponse.json({ error: 'Not a participant in this match' }, { status: 403 });
  }
  if (match.status !== 'live') {
    // A finished or not-yet-started match has no visits in flight; refusing here keeps a stale
    // page from replaying rounds against a match that is already over.
    return NextResponse.json({ achievements: [] });
  }

  // `score` is deliberately omitted: the engine sums the server-computed dart points itself, which
  // is the round total every round-scoring achievement is defined against, in every game mode.
  const visit: VisitData = {
    throws: throws.map((dart, order) => ({ ...dart, order })),
    busted: busted === true,
    isCheckout: isCheckout === true,
  };

  const unlocked = await evaluateVisitAchievements(visit, userId);
  return NextResponse.json({ achievements: await withCounts(unlocked, userId) });
}
