import { NextRequest, NextResponse } from 'next/server';
import { friendContext, friendError } from '@/lib/friends/http';
import { changeFriend, headToHead, FriendsError } from '@/lib/friends/repository';
import { validUserId } from '@/lib/friends/policy';
import type { FriendAction } from '@/lib/friends/types';

type Context = { params: Promise<{ id: string }> };
export async function GET(req: NextRequest, context: Context) {
  try {
    const { db, actor } = await friendContext();
    const { id } = await context.params;
    const cursor = req.nextUrl.searchParams.get('cursor');
    if (!validUserId(id) || (cursor && !validUserId(cursor))) throw new FriendsError('Invalid player or page.', 400);
    return NextResponse.json(await headToHead(db, actor, id, cursor), { headers: { 'Cache-Control': 'private, no-store' } });
  } catch (error) { return friendError(error); }
}
export async function PATCH(req: NextRequest, context: Context) {
  try {
    const { db, actor } = await friendContext();
    const { id } = await context.params;
    const body = await req.json().catch(() => null);
    const action = body?.action;
    if (!validUserId(id) || !['accept', 'decline', 'cancel', 'remove'].includes(action)) throw new FriendsError('Invalid friendship action.', 400);
    await changeFriend(db, actor, id, action as FriendAction);
    return NextResponse.json({ ok: true });
  } catch (error) { return friendError(error); }
}
