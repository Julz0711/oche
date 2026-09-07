import { connectDB } from '@/lib/db';
import { NextResponse } from 'next/server';
import clientPromise from '@/lib/mongodb-client';

/**
 * Dev-only route: quickly authenticate as a test user without OAuth.
 * Only available in development mode.
 *
 * Creates a test user in MongoDB and redirects. The session will be fetched
 * by the client and recognized via the dev-login flag.
 */
export async function GET() {
  if (process.env.NODE_ENV !== 'development') {
    return NextResponse.json({ error: 'Not available in production' }, { status: 403 });
  }

  try {
    await connectDB();
    const client = await clientPromise;
    const db = client.db('auth');
    const usersCollection = db.collection('users');

    // Create or find test user
    const result = await usersCollection.findOneAndUpdate(
      { email: 'test@oche.local' },
      {
        $setOnInsert: {
          name: 'Test User',
          email: 'test@oche.local',
          image: null,
          emailVerified: null,
          createdAt: new Date(),
        },
      },
      { upsert: true, returnDocument: 'after' }
    );

    if (!result || !result._id) {
      throw new Error('Failed to create test user');
    }

    const userId = result._id.toString();
    console.log('[test-login] Created/found test user:', userId);

    // Simple dev flag - client will check this to create a fake session
    const response = NextResponse.redirect(new URL('/', process.env.NEXTAUTH_URL || 'http://localhost:3000'));
    response.cookies.set('__dev-user-id', userId, {
      httpOnly: false,
      secure: process.env.NEXTAUTH_URL?.startsWith('https') ?? false,
      sameSite: 'lax',
      path: '/',
      maxAge: 30 * 24 * 60 * 60,
    });

    console.log('[test-login] Redirecting to dashboard with dev user flag');
    return response;
  } catch (error) {
    console.error('Test login error:', error);
    return NextResponse.json({ error: 'Failed to create test user' }, { status: 500 });
  }
}
