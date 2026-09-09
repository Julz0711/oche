import { auth } from '@/lib/auth';
import clientPromise from '@/lib/mongodb-client';
import { NextResponse } from 'next/server';
import { FriendsError } from './repository';
import { validUserId } from './policy';

const dbPromise = clientPromise.then(client => client.db());

export async function friendContext() {
  const session = await auth();
  if (!session?.user?.id || !validUserId(session.user.id)) throw new FriendsError('Sign in to use friends.', 401);
  return { actor: session.user.id, db: await dbPromise };
}
export function friendError(error: unknown) {
  if (error instanceof FriendsError) return NextResponse.json({ error: error.message }, { status: error.status });
  console.error('Friends request failed', error instanceof Error ? error.message : 'Unknown error');
  return NextResponse.json({ error: 'Friends are unavailable right now. Please try again.' }, { status: 503 });
}
