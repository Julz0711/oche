import type { FriendAction, Friendship } from './types';

export const friendshipKey = (a: string, b: string) => [a, b].sort().join(':');
export const normalizeFriendCode = (value: string) => value.replace(/[\s-]/g, '').toUpperCase();
export const validFriendCode = (value: string) => /^[A-F0-9]{12}$/.test(value);
export const validUserId = (value: string) => /^[a-f0-9]{24}$/.test(value);

/** The same predicate is applied to the atomic database write, not just a prior read. */
export function actionFilter(actor: string, other: string, action: FriendAction): Partial<Friendship> {
  const base = { _id: friendshipKey(actor, other), members: [actor, other].sort() };
  if (action === 'remove') return { ...base, status: 'accepted' };
  return { ...base, status: 'pending', ...(action === 'cancel' ? { requester: actor } : { recipient: actor }) };
}
