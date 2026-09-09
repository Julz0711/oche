import { NextRequest, NextResponse } from 'next/server';
import { friendContext, friendError } from '@/lib/friends/http';
import { listFriends, requestFriend, FriendsError } from '@/lib/friends/repository';
import { normalizeFriendCode, validFriendCode } from '@/lib/friends/policy';

export async function GET() {
  try {
    const { db, actor } = await friendContext();
    return NextResponse.json(await listFriends(db, actor), { headers: { 'Cache-Control': 'private, no-store' } });
  } catch (error) { return friendError(error); }
}
export async function POST(req: NextRequest) {
  try {
    const { db, actor } = await friendContext();
    const body = await req.json().catch(() => null);
    const code = normalizeFriendCode(typeof body?.code === 'string' ? body.code : '');
    if (!validFriendCode(code)) throw new FriendsError('Enter a valid 12-character friend code.', 400);
    await requestFriend(db, actor, code);
    return NextResponse.json({ ok: true });
  } catch (error) { return friendError(error); }
}
