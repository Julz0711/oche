// app/api/matches/route.ts
import { connectDB } from '@/lib/db';
import { Match } from '@/lib/db/models';
import { NextRequest, NextResponse } from 'next/server';
import { auth } from '@/lib/auth';

export async function POST(req: NextRequest) {
  await connectDB();
  const session = await auth();

  const { gameId } = await req.json();

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

export async function GET(req: NextRequest) {
  await connectDB();
  const matches = await Match.find({}).limit(10).sort({ createdAt: -1 });
  return NextResponse.json(matches);
}
