import { describe, expect, it } from 'vitest';
import { actionFilter, friendshipKey, normalizeFriendCode, validFriendCode } from './policy';

describe('friendship policy', () => {
  it('uses the same unique relationship key from either side', () => {
    expect(friendshipKey('a', 'b')).toBe(friendshipKey('b', 'a'));
  });
  it('only lets a recipient respond, a sender cancel, and a member remove an accepted friendship', () => {
    expect(actionFilter('a', 'b', 'accept')).toMatchObject({ recipient: 'a', status: 'pending' });
    expect(actionFilter('a', 'b', 'decline')).toMatchObject({ recipient: 'a', status: 'pending' });
    expect(actionFilter('a', 'b', 'cancel')).toMatchObject({ requester: 'a', status: 'pending' });
    expect(actionFilter('a', 'b', 'remove')).toEqual({ _id: 'a:b', members: ['a', 'b'], status: 'accepted' });
  });
  it('normalizes shared codes without accepting extra characters', () => {
    expect(normalizeFriendCode(' abcd-1234 ef56 ')).toBe('ABCD1234EF56');
    expect(validFriendCode('ABCD1234EF56')).toBe(true);
    expect(validFriendCode('ABCD1234EF5Z')).toBe(false);
    expect(validFriendCode('ABCD1234EF56!')).toBe(false);
  });
});
