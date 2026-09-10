import { NextRequest, NextResponse } from 'next/server';

export function proxy(request: NextRequest) {
  // Dev-only: intercept session endpoint for dev login
  if (process.env.NODE_ENV === 'development' && request.nextUrl.pathname === '/api/auth/session') {
    const devUserId = request.cookies.get('__dev-user-id')?.value;
    if (devUserId) {
      console.log('[middleware] Dev login detected, returning fake session');
      return NextResponse.json({
        user: {
          id: devUserId,
          name: 'Test User',
          email: 'test@oche.local',
          image: null,
        },
        expires: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString(),
      });
    }
  }

  return NextResponse.next();
}

export const config = {
  matcher: ['/api/auth/session'],
};
