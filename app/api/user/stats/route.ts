import { connectDB } from '@/lib/db';
import { Match } from '@/lib/db/models';
import { NextResponse } from 'next/server';
import { auth } from '@/lib/auth';
import mongoose from 'mongoose';

export async function GET() {
  const session = await auth();
  if (!session?.user?.id) {
    return NextResponse.json({ error: 'Not signed in' }, { status: 401 });
  }

  await connectDB();

  // Find all matches where this user is involved
  const userId = session.user.id;
  const matches = await Match.find({
    $or: [
      { hostId: userId },
      { 'players.userId': userId },
    ],
    status: { $in: ['complete'] },
  });

  const stats = {
    totalMatches: matches.length,
    wins: matches.filter((m) => m.winnerId === userId).length,
    losses: matches.length - matches.filter((m) => m.winnerId === userId).length,
    winRate: matches.length > 0
      ? Math.round((matches.filter((m) => m.winnerId === userId).length / matches.length) * 100)
      : 0,
  };

  return NextResponse.json(stats);
}
