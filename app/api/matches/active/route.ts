// app/api/matches/active/route.ts
import { connectDB } from '@/lib/db';
import { Match } from '@/lib/db/models';
import { NextResponse } from 'next/server';
import { auth } from '@/lib/auth';
import { getGameModule, GameId } from '@/lib/games/registry';
import { identityIdOf, MatchPlayerDoc } from '@/lib/matchLobby';

/** Remote matches this user is part of that haven't finished yet — a lobby still waiting for
 *  players, or a live match in progress — so the dashboard can offer a way back in without the
 *  original room code/URL. Local matches aren't included: they're a single shared device, not
 *  something you "come back to" from the dashboard. */
export async function GET() {
  const session = await auth();
  if (!session?.user?.id) {
    return NextResponse.json({ error: 'Not signed in' }, { status: 401 });
  }

  await connectDB();

  const docs = await Match.find({
    mode: 'remote',
    status: { $in: ['lobby', 'live'] },
    $or: [{ hostId: session.user.id }, { 'players.userId': session.user.id }],
  }).sort({ createdAt: -1 });

  const matches: {
    id: string;
    gameId: string;
    gameName: string;
    status: 'lobby' | 'live';
    roomCode: string;
    opponents: string[];
  }[] = [];

  for (const doc of docs) {
    try {
      const gameModule = await getGameModule(doc.gameId as GameId);
      const players = doc.players as MatchPlayerDoc[];
      const opponents = players.filter((p) => identityIdOf(p) !== session.user!.id).map((p) => p.name);

      matches.push({
        id: doc._id.toString(),
        gameId: doc.gameId,
        gameName: gameModule.name,
        status: doc.status as 'lobby' | 'live',
        roomCode: doc.roomCode as string,
        opponents,
      });
    } catch {
      // Unregistered/legacy gameId — skip rather than take down the whole list.
      continue;
    }
  }

  return NextResponse.json({ matches });
}
