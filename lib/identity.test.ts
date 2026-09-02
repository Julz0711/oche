// lib/identity.test.ts
import { describe, it, expect, vi } from 'vitest';

// Mock auth before importing identity module
vi.mock('@/lib/auth', () => ({
  auth: vi.fn(() => Promise.resolve(null)),
}));

import { resolveIdentity } from './identity';

describe('resolveIdentity', () => {
  it('prefers a session user id over any guest cookie', () => {
    const { identity, newGuestCookie } = resolveIdentity('user-123', 'guest-abc');
    expect(identity).toEqual({ type: 'user', id: 'user-123' });
    expect(newGuestCookie).toBeUndefined();
  });

  it('uses an existing guest cookie when there is no session', () => {
    const { identity, newGuestCookie } = resolveIdentity(undefined, 'guest-abc');
    expect(identity).toEqual({ type: 'guest', id: 'guest-abc' });
    expect(newGuestCookie).toBeUndefined();
  });

  it('issues a new guest id when there is neither a session nor a cookie', () => {
    const { identity, newGuestCookie } = resolveIdentity(undefined, undefined);
    expect(identity.type).toBe('guest');
    expect(identity.id).toMatch(/^[0-9a-f-]{36}$/); // a UUID
    expect(newGuestCookie).toBe(identity.id);
  });
});
