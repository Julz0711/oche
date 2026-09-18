import { NextResponse } from 'next/server';
import { allowDemoLogin } from '@/lib/dev/login';

/** Compatibility link. Authentication uses the normal CSRF-protected sign-in POST. */
export async function GET(request: Request) {
  if (!allowDemoLogin(request.url)) return NextResponse.json({ error: 'Not available' }, { status: 403 });
  const response = NextResponse.redirect(new URL('/signin', request.url));
  response.cookies.delete('__dev-user-id');
  return response;
}
