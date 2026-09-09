import { NextResponse } from 'next/server';
import { friendContext, friendError } from '@/lib/friends/http';
import { friendProfile, FriendsError } from '@/lib/friends/repository';
import { validUserId } from '@/lib/friends/policy';
import { getStatsBoard } from '@/lib/stats/board';

export async function GET(_req: Request, { params }: { params: Promise<{ id: string }> }) {
  try {
    const { actor, db } = await friendContext();
    const { id } = await params;
    if (!validUserId(id)) throw new FriendsError('Invalid player.', 400);
    const person = await friendProfile(db, actor, id);
    const [periods, unlocked, definitions] = await Promise.all([
      getStatsBoard(db, id),
      db.collection('userachievements').find({ user_id: id }, { projection: { _id: 0, achievement_id: 1, unlocked_at: 1, last_unlocked_at: 1, count: 1 } }).toArray(),
      db.collection('achievements').find({}, { projection: { _id: 0, achievement_id: 1, name: 1, description: 1, rarity: 1, icon: 1, is_repeatable: 1, display_order: 1 } }).sort({ display_order: 1 }).toArray(),
    ]);
    return NextResponse.json({ person, periods, achievements: { unlocked, definitions } }, { headers: { 'Cache-Control': 'private, no-store' } });
  } catch (error) { return friendError(error); }
}
