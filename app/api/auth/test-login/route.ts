import { connectDB } from '@/lib/db';
import { NextResponse } from 'next/server';
import clientPromise from '@/lib/mongodb-client';

/**
 * Dev-only route: quickly authenticate as a test user without OAuth.
 * Only available in development mode.
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

    if (!result || !result.value || !result.value._id) {
      throw new Error('Failed to create test user');
    }

    const user = result.value;

    // Create a session for the test user
    const sessionsCollection = db.collection('sessions');
    const sessionToken = `test-session-${Date.now()}-${Math.random().toString(36).substr(2)}`;

    await sessionsCollection.insertOne({
      sessionToken,
      userId: user._id,
      expires: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000), // 30 days
      createdAt: new Date(),
    });

    // Redirect to dashboard with session cookie
    const response = NextResponse.redirect(new URL('/', process.env.NEXTAUTH_URL || 'http://localhost:3000'));
    response.cookies.set('next-auth.session-token', sessionToken, {
      httpOnly: true,
      secure: false, // Always false in dev
      sameSite: 'lax',
      maxAge: 30 * 24 * 60 * 60,
    });

    return response;
  } catch (error) {
    console.error('Test login error:', error);
    return NextResponse.json({ error: 'Failed to create test session' }, { status: 500 });
  }
}
