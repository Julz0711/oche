// app/api/user/route.ts
import { NextRequest, NextResponse } from 'next/server';
import { ObjectId } from 'mongodb';
import { auth } from '@/lib/auth';
import clientPromise from '@/lib/mongodb-client';

/** Updates the signed-in user's display name. Session strategy is "jwt", so there's no
 *  database-backed session to invalidate — the new name only shows up once the client re-reads
 *  the session (the settings page re-fetches after a successful PATCH). */
export async function PATCH(req: NextRequest) {
  const session = await auth();
  if (!session?.user?.id) {
    return NextResponse.json({ error: 'Not signed in' }, { status: 401 });
  }

  const body = await req.json().catch(() => null);
  const name = typeof body?.name === 'string' ? body.name.trim() : '';
  if (!name || name.length > 60) {
    return NextResponse.json({ error: 'Name must be 1-60 characters' }, { status: 400 });
  }

  const client = await clientPromise;
  await client
    .db()
    .collection('users')
    .updateOne({ _id: new ObjectId(session.user.id) }, { $set: { name } });

  return NextResponse.json({ name });
}
