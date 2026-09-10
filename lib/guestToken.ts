import { createHmac, timingSafeEqual } from 'node:crypto';

function secret(): string {
  const value = process.env.AUTH_SECRET || process.env.NEXTAUTH_SECRET;
  if (!value) throw new Error('AUTH_SECRET or NEXTAUTH_SECRET must be configured');
  return value;
}

export function signGuestId(id: string): string {
  const signature = createHmac('sha256', secret()).update(`oche-guest:${id}`).digest('base64url');
  return `${id}.${signature}`;
}

export function verifyGuestToken(token: string | undefined): string | undefined {
  if (!token) return undefined;
  const [id, signature, extra] = token.split('.');
  if (extra !== undefined || !/^[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(id) || !signature) return undefined;
  const expected = Buffer.from(signGuestId(id).split('.')[1]);
  const received = Buffer.from(signature);
  return expected.length === received.length && timingSafeEqual(expected, received) ? id : undefined;
}
