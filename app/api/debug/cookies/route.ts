import { NextResponse } from 'next/server';

// Never reflect credentials, including HttpOnly cookies, into a response body.
export async function GET() {
  return NextResponse.json({ error: 'Not found' }, { status: 404 });
}
