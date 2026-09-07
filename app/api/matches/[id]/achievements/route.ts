// app/api/matches/[id]/achievements/route.ts
/**
 * Achievement evaluation for a finished match.
 *
 * The engine (`lib/games/achievements.ts`) talks to mongoose, so it can only run on the server —
 * the match page is a client component and calls this route once the match it is showing has been
 * persisted as complete. The response carries the *newly* unlocked achievements, each enriched
 * with the user's current `count` so the toast can render "(xN)" for repeatable ones.
 *
 * Evaluation is claimed atomically per (match, user): the first successful call records the user
 * in `achievementsEvaluatedFor`, and any later call — a page reload on a finished match, a double
 * mount in dev — matches nothing and returns an empty list, so repeatable achievements can't be
 * farmed by re-opening a completed match.
 */
import { auth } from '@/lib/auth';
import { connectDB } from '@/lib/db';
import { Match } from '@/lib/db/models';
import { NextResponse } from 'next/server';
import mongoose from 'mongoose';
import { evaluateAchievements } from '@/lib/games/achievements';
import type { MatchData } from '@/lib/achievements/types';
import { isParticipant, withCounts, type MatchDoc } from '@/lib/achievements/matchAccess';

/**
 * In a local match both players share one device: the account holder is seated first (see
 * `POST /api/matches`, which names `players[0]` after the session user), and the engine seats
 * players as `player1`/`player2`, so a stored winner of `player1` means the owner won.
 */
const LOCAL_OWNER_PLAYER_ID = 'player1';

/**
 * Build the engine's view of the match from the persisted document.
 *
 * Only the signals that can be read straight off the match are provided; the optional ones
 * (`dartsThrown`, `bestLegAverage`, …) are per-game derivations the engine deliberately skips
 * when absent, so nothing is ever awarded on a guessed value.
 */
function buildMatchData(match: MatchDoc, matchId: string, userId: string): MatchData {
  const storedWinner = match.winnerId ?? null;
  const userWon =
    match.mode === 'local'
      ? match.userId === userId && storedWinner === LOCAL_OWNER_PLAYER_ID
      : storedWinner === userId;

  return {
    matchId,
    gameId: match.gameId,
    // Local matches store seat ids ('player1'), not user ids — normalise to the user id so the
    // engine's `winnerId === userId` checks read the same in both modes.
    winnerId: userWon ? userId : storedWinner,
  };
}

export async function POST(_req: Request, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  if (!mongoose.Types.ObjectId.isValid(id)) {
    return NextResponse.json({ error: 'Invalid match id' }, { status: 400 });
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

  // Claim this (match, user) pair before evaluating. A null result means the match isn't complete
  // yet or this user was already evaluated for it.
  const claimed = await Match.findOneAndUpdate(
    { _id: id, status: 'complete', achievementsEvaluatedFor: { $ne: userId } },
    { $addToSet: { achievementsEvaluatedFor: userId } }
  );
  if (!claimed) {
    return NextResponse.json({ achievements: [] });
  }

  const unlocked = await evaluateAchievements(buildMatchData(match, id, userId), userId);
  return NextResponse.json({ achievements: await withCounts(unlocked, userId) });
}
