// app/api/matches/history/route.ts
import { connectDB } from '@/lib/db';
import { Match } from '@/lib/db/models';
import { NextRequest, NextResponse } from 'next/server';
import { auth } from '@/lib/auth';
import { getGameModule, gameRegistry, GameId } from '@/lib/games/registry';
import { resolveYourPlayerId, summarize } from '@/lib/matchHistory';
import { identityIdOf, MatchPlayerDoc } from '@/lib/matchLobby';

export async function GET(req: NextRequest) {
  const session = await auth();
  if (!session?.user?.id) {
    return NextResponse.json({ error: 'Not signed in' }, { status: 401 });
  }

  const gameIdParam = req.nextUrl.searchParams.get('gameId');
  const gameIdFilter =
    gameIdParam && Object.prototype.hasOwnProperty.call(gameRegistry, gameIdParam)
      ? (gameIdParam as GameId)
      : null;

  await connectDB();

  const query: Record<string, unknown> = {
    status: 'complete',
    $or: [{ userId: session.user.id }, { 'players.userId': session.user.id }],
  };
  if (gameIdFilter) {
    query.gameId = gameIdFilter;
  }

  const docs = await Match.find(query).sort({ completedAt: -1 });

  const matches: {
    id: string;
    gameId: string;
    gameName: string;
    mode: 'local' | 'remote';
    completedAt: string;
    won: boolean;
    opponents: string[];
    headline: { label: string; value: string };
  }[] = [];

  for (const doc of docs) {
    const youPlayerId = resolveYourPlayerId(
      { mode: doc.mode, players: doc.players as MatchPlayerDoc[] },
      session.user.id
    );
    if (youPlayerId === null) continue;

    try {
      const gameModule = await getGameModule(doc.gameId as GameId);
      const stats = gameModule.matchStats(doc.state, youPlayerId, doc.settings);
      const headlineTile = gameModule.statTiles[0];

      const opponents =
        doc.mode === 'remote'
          ? (doc.players as MatchPlayerDoc[])
              .filter((p) => identityIdOf(p) !== youPlayerId)
              .map((p) => p.name)
          : [];

      matches.push({
        id: doc._id.toString(),
        gameId: doc.gameId,
        gameName: gameModule.name,
        mode: doc.mode,
        completedAt: (doc.completedAt as Date).toISOString(),
        won: doc.winnerId === youPlayerId,
        opponents,
        headline: { label: headlineTile.label, value: String(headlineTile.value(stats)) },
      });
    } catch {
      // A single malformed or legacy match document (unregistered gameId, corrupt state, etc.)
      // must not take down the whole history response — skip it, keep the rest.
      continue;
    }
  }

  const summary = summarize(matches.map((m) => ({ won: m.won })));

  return NextResponse.json({ matches, summary });
}
