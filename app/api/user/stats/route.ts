import { NextResponse } from 'next/server';
import { auth } from '@/lib/auth';
import clientPromise from '@/lib/mongodb-client';
import { getStatsBoard } from '@/lib/stats/board';

export async function GET() {
  const session = await auth();
  if (!session?.user?.id) return NextResponse.json({ error: 'Not signed in' }, { status: 401 });
  try {
    const periods = await getStatsBoard((await clientPromise).db(), session.user.id);
    return NextResponse.json({ ...periods.all, periods }, { headers: { 'Cache-Control': 'private, no-store' } });
  } catch {
    return NextResponse.json({ error: 'Statistics are unavailable. Please try again.' }, { status: 503 });
  }
}
