// lib/identity.ts
import { randomUUID } from 'crypto';
import { NextRequest, NextResponse } from 'next/server';
import { signGuestId, verifyGuestToken } from './guestToken';
import { auth } from '@/lib/auth';

export interface Identity {
  type: 'user' | 'guest';
  id: string;
}

export const GUEST_COOKIE_NAME = 'oche_guest_id';
const GUEST_COOKIE_MAX_AGE = 60 * 60 * 24 * 365; // 1 year

/** Pure decision: given an optional session user id and an optional existing guest cookie
 *  value, decide the caller's identity and whether a new guest cookie needs to be issued. */
export function resolveIdentity(
  sessionUserId: string | undefined,
  existingGuestCookie: string | undefined
): { identity: Identity; newGuestCookie?: string } {
  if (sessionUserId) {
    return { identity: { type: 'user', id: sessionUserId } };
  }
  if (existingGuestCookie) {
    return { identity: { type: 'guest', id: existingGuestCookie } };
  }
  const newId = randomUUID();
  return { identity: { type: 'guest', id: newId }, newGuestCookie: newId };
}

/** IO wrapper: reads the session and cookie off a real request, resolves identity via the pure
 *  function above. Does not itself mutate a response — call `applyIdentityCookie` on whatever
 *  response the calling route returns, so a newly issued guest cookie actually reaches the
 *  browser. */
export async function getIdentity(req: NextRequest): Promise<{ identity: Identity; newGuestCookie?: string }> {
  const session = await auth();
  const existingGuestCookie = req.cookies.get(GUEST_COOKIE_NAME)?.value;
  return resolveIdentity(session?.user?.id, verifyGuestToken(existingGuestCookie));
}

/** Sets the guest cookie on `response` if `getIdentity` issued a new one. Every route that calls
 *  `getIdentity` must pass its result's `newGuestCookie` through this before returning. */
export function applyIdentityCookie(response: NextResponse, newGuestCookie: string | undefined): NextResponse {
  if (newGuestCookie) {
    response.cookies.set(GUEST_COOKIE_NAME, signGuestId(newGuestCookie), {
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      maxAge: GUEST_COOKIE_MAX_AGE,
      sameSite: 'lax',
      path: '/',
    });
  }
  return response;
}
