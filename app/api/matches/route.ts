// app/api/matches/route.ts
import { connectDB } from '@/lib/db';
import { Match } from '@/lib/db/models';
import { NextRequest, NextResponse } from 'next/server';
import { auth } from '@/lib/auth';
import { gameRegistry } from '@/lib/games/registry';

export async function POST(req: NextRequest) {
  let body: unknown;
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: 'Invalid JSON body' }, { status: 400 });
  }

  const gameId = (body as { gameId?: unknown })?.gameId;
  if (typeof gameId !== 'string' || !(gameId in gameRegistry)) {
    return NextResponse.json({ error: 'Invalid or unrecognized gameId' }, { status: 400 });
  }

  await connectDB();
  const session = await auth();

  const match = await Match.create({
    gameId,
    mode: 'local',
    status: 'live',
    players: [
      { name: session?.user?.name || 'Guest 1', isGuest: !session },
      { name: 'Guest 2', isGuest: true },
    ],
  });

  return NextResponse.json({ id: match._id.toString() });
}
