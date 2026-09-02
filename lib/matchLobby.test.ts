// lib/matchLobby.test.ts
import { describe, it, expect } from 'vitest';
import { seatFor, identityIdOf, isSeated, canJoinLobby, canStartMatch, MatchPlayerDoc } from './matchLobby';
import { Identity } from './identity';

describe('seatFor / identityIdOf', () => {
  it('maps a user identity to a userId-based seat', () => {
    const identity: Identity = { type: 'user', id: 'u1' };
    const seat = seatFor(identity, 'Alex', 0);
    expect(seat).toEqual({ userId: 'u1', guestId: undefined, name: 'Alex', seat: 0, isGuest: false });
    expect(identityIdOf(seat)).toBe('u1');
  });

  it('maps a guest identity to a guestId-based seat', () => {
    const identity: Identity = { type: 'guest', id: 'g1' };
    const seat = seatFor(identity, 'Guest', 1);
    expect(seat).toEqual({ userId: undefined, guestId: 'g1', name: 'Guest', seat: 1, isGuest: true });
    expect(identityIdOf(seat)).toBe('g1');
  });
});

describe('isSeated', () => {
  const players: MatchPlayerDoc[] = [seatFor({ type: 'guest', id: 'g1' }, 'Host', 0)];

  it('is true when the identity matches a seated player', () => {
    expect(isSeated(players, { type: 'guest', id: 'g1' })).toBe(true);
  });

  it('is false otherwise', () => {
    expect(isSeated(players, { type: 'guest', id: 'g2' })).toBe(false);
  });
});

describe('canJoinLobby', () => {
  const host = seatFor({ type: 'guest', id: 'g1' }, 'Host', 0);

  it('allows joining an open lobby with one seat filled', () => {
    expect(canJoinLobby({ status: 'lobby', players: [host] }, { type: 'guest', id: 'g2' })).toEqual({ ok: true });
  });

  it('is idempotent for a player who already joined', () => {
    expect(canJoinLobby({ status: 'lobby', players: [host] }, { type: 'guest', id: 'g1' })).toEqual({ ok: true });
  });

  it('rejects joining a full lobby', () => {
    const guest = seatFor({ type: 'guest', id: 'g2' }, 'Guest', 1);
    const result = canJoinLobby({ status: 'lobby', players: [host, guest] }, { type: 'guest', id: 'g3' });
    expect(result).toEqual({ ok: false, status: 409, error: 'Match is full' });
  });

  it('rejects joining a match that already started', () => {
    const result = canJoinLobby({ status: 'live', players: [host] }, { type: 'guest', id: 'g2' });
    expect(result).toEqual({ ok: false, status: 409, error: 'Match is not open for joining' });
  });
});

describe('canStartMatch', () => {
  const host = seatFor({ type: 'guest', id: 'g1' }, 'Host', 0);
  const guest = seatFor({ type: 'guest', id: 'g2' }, 'Guest', 1);

  it('allows the host to start a full lobby', () => {
    const match = { status: 'lobby', players: [host, guest], hostId: 'g1' };
    expect(canStartMatch(match, { type: 'guest', id: 'g1' })).toEqual({ ok: true });
  });

  it('rejects a non-host', () => {
    const match = { status: 'lobby', players: [host, guest], hostId: 'g1' };
    const result = canStartMatch(match, { type: 'guest', id: 'g2' });
    expect(result).toEqual({ ok: false, status: 403, error: 'Only the host can start the match' });
  });

  it('rejects starting with only one player seated', () => {
    const match = { status: 'lobby', players: [host], hostId: 'g1' };
    const result = canStartMatch(match, { type: 'guest', id: 'g1' });
    expect(result).toEqual({ ok: false, status: 400, error: 'Match needs exactly 2 players to start' });
  });

  it('rejects starting a match that is not in lobby status', () => {
    const match = { status: 'live', players: [host, guest], hostId: 'g1' };
    const result = canStartMatch(match, { type: 'guest', id: 'g1' });
    expect(result).toEqual({ ok: false, status: 409, error: 'Match already started' });
  });
});
