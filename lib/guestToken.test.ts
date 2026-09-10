import { afterEach, describe, expect, it, vi } from 'vitest';
import { signGuestId, verifyGuestToken } from './guestToken';
import { canAccessMatch } from './matchAccess';

const guest = '5b51bc70-b4f6-4b58-a0fb-219dbb4d880d';
afterEach(() => vi.unstubAllEnvs());

describe('guest authentication', () => {
  it('accepts only signed identities, not exposed player ids or tampered cookies', () => {
    vi.stubEnv('AUTH_SECRET', 'review-test-secret');
    const token = signGuestId(guest);
    expect(verifyGuestToken(token)).toBe(guest);
    expect(verifyGuestToken(guest)).toBeUndefined();
    expect(verifyGuestToken(`${token}x`)).toBeUndefined();
    expect(verifyGuestToken(token.replace('5b51', '6b51'))).toBeUndefined();
    expect(verifyGuestToken(`${token}.extra`)).toBeUndefined();
    expect(verifyGuestToken(signGuestId('account-id'))).toBeUndefined();
  });
  it('rejects tokens signed with another secret', () => {
    vi.stubEnv('AUTH_SECRET', 'first-secret');
    const token = signGuestId(guest);
    vi.stubEnv('AUTH_SECRET', 'second-secret');
    expect(verifyGuestToken(token)).toBeUndefined();
  });
  it('does not turn a guest cookie into a signed-in player', () => {
    const match = { mode: 'remote', players: [{ userId: 'account-id', name: 'Owner', isGuest: false }] };
    expect(canAccessMatch(match, { type: 'guest', id: 'account-id' })).toBe(false);
    expect(canAccessMatch(match, { type: 'user', id: 'account-id' })).toBe(true);
  });
  it('restricts local matches to their creator and fails closed for ownerless legacy games', () => {
    const match = { mode: 'local', hostId: guest, players: [] };
    expect(canAccessMatch(match, { type: 'guest', id: guest })).toBe(true);
    expect(canAccessMatch(match, { type: 'guest', id: 'outsider' })).toBe(false);
    expect(canAccessMatch({ ...match, userId: 'account-id' }, { type: 'guest', id: guest })).toBe(false);
    expect(canAccessMatch({ ...match, userId: 'account-id' }, { type: 'user', id: 'account-id' })).toBe(true);
    expect(canAccessMatch({ mode: 'local', players: [] }, { type: 'guest', id: guest })).toBe(false);
  });
});
