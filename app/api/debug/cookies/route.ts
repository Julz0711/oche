import { NextRequest, NextResponse } from 'next/server';

export async function GET(request: NextRequest) {
  const cookieHeader = request.headers.get('cookie') || '';
  const cookies: Record<string, string> = {};

  cookieHeader.split(';').forEach(cookie => {
    const [name, value] = cookie.trim().split('=');
    if (name) cookies[name] = decodeURIComponent(value || '');
  });

  return NextResponse.json({
    cookieHeader,
    parsedCookies: cookies,
    hasSessionToken: 'next-auth.session-token' in cookies,
    hasDevLogin: '__dev-login' in cookies,
  });
}
