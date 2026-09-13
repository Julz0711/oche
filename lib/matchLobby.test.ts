// lib/matchLobby.test.ts
import { describe, it, expect } from 'vitest';
import { seatFor, identityIdOf, isSeated, canJoinLobby, canStartMatch, canReorderLobby, canEditSettings, canLeaveMatch, allParticipantsLeft, MatchPlayerDoc } from './matchLobby';
import { Identity } from './identity';

const TWO_TO_FOUR: [number, number] = [2, 4];
const TWO_TO_EIGHT: [number, number] = [2, 8];

describe('seatFor / identityIdOf', () => {
  it('maps a user identity to a player doc', () => {
    const identity: Identity = { type: 'user', id: 'u1' };
    const player = seatFor(identity, 'Alex');
    expect(player).toEqual({ userId: 'u1', guestId: undefined, name: 'Alex', isGuest: false });
    expect(identityIdOf(player)).toBe('u1');
  });

  it('maps a guest identity to a player doc', () => {
    const identity: Identity = { type: 'guest', id: 'g1' };
    const player = seatFor(identity, 'Guest');
    expect(player).toEqual({ userId: undefined, guestId: 'g1', name: 'Guest', isGuest: true });
    expect(identityIdOf(player)).toBe('g1');
  });
});

describe('isSeated', () => {
  const players: MatchPlayerDoc[] = [seatFor({ type: 'guest', id: 'g1' }, 'Host')];

  it('is true when the identity matches a seated player', () => {
    expect(isSeated(players, { type: 'guest', id: 'g1' })).toBe(true);
  });

  it('is false otherwise', () => {
    expect(isSeated(players, { type: 'guest', id: 'g2' })).toBe(false);
  });
});

describe('canJoinLobby', () => {
  const host = seatFor({ type: 'guest', id: 'g1' }, 'Host');

  it('allows joining an open lobby with room left', () => {
    expect(canJoinLobby({ status: 'lobby', players: [host] }, { type: 'guest', id: 'g2' }, TWO_TO_FOUR)).toEqual({
      ok: true,
    });
  });

  it('is idempotent for a player who already joined', () => {
    expect(canJoinLobby({ status: 'lobby', players: [host] }, { type: 'guest', id: 'g1' }, TWO_TO_FOUR)).toEqual({
      ok: true,
    });
  });

  it('rejects joining a lobby at the game\'s max player count', () => {
    const guest = seatFor({ type: 'guest', id: 'g2' }, 'Guest');
    const result = canJoinLobby({ status: 'lobby', players: [host, guest] }, { type: 'guest', id: 'g3' }, [2, 2]);
    expect(result).toEqual({ ok: false, status: 409, error: 'Match is full' });
  });

  it('allows joining up to 8 players for a game with that range', () => {
    const players = [host, ...Array.from({ length: 6 }, (_, i) => seatFor({ type: 'guest', id: `g${i + 2}` }, `P${i}`))];
    expect(players.length).toBe(7);
    const result = canJoinLobby({ status: 'lobby', players }, { type: 'guest', id: 'g9' }, TWO_TO_EIGHT);
    expect(result).toEqual({ ok: true });
  });

  it('rejects joining a match that already started', () => {
    const result = canJoinLobby({ status: 'live', players: [host] }, { type: 'guest', id: 'g2' }, TWO_TO_FOUR);
    expect(result).toEqual({ ok: false, status: 409, error: 'Match is not open for joining' });
  });
});

describe('canStartMatch', () => {
  const host = seatFor({ type: 'guest', id: 'g1' }, 'Host');
  const guest = seatFor({ type: 'guest', id: 'g2' }, 'Guest');

  it('allows the host to start once the minimum is met', () => {
    const match = { status: 'lobby', players: [host, guest], hostId: 'g1' };
    expect(canStartMatch(match, { type: 'guest', id: 'g1' }, TWO_TO_FOUR)).toEqual({ ok: true });
  });

  it('allows starting with fewer than the max (e.g. 3 of up to 8)', () => {
    const third = seatFor({ type: 'guest', id: 'g3' }, 'Third');
    const match = { status: 'lobby', players: [host, guest, third], hostId: 'g1' };
    expect(canStartMatch(match, { type: 'guest', id: 'g1' }, TWO_TO_EIGHT)).toEqual({ ok: true });
  });

  it('rejects a non-host', () => {
    const match = { status: 'lobby', players: [host, guest], hostId: 'g1' };
    const result = canStartMatch(match, { type: 'guest', id: 'g2' }, TWO_TO_FOUR);
    expect(result).toEqual({ ok: false, status: 403, error: 'Only the host can start the match' });
  });

  it('rejects starting below the minimum player count', () => {
    const match = { status: 'lobby', players: [host], hostId: 'g1' };
    const result = canStartMatch(match, { type: 'guest', id: 'g1' }, TWO_TO_FOUR);
    expect(result).toEqual({ ok: false, status: 400, error: 'Match needs at least 2 players to start' });
  });

  it('rejects starting a match that is not in lobby status', () => {
    const match = { status: 'live', players: [host, guest], hostId: 'g1' };
    const result = canStartMatch(match, { type: 'guest', id: 'g1' }, TWO_TO_FOUR);
    expect(result).toEqual({ ok: false, status: 409, error: 'Match already started' });
  });
});

describe('canReorderLobby', () => {
  const host = seatFor({ type: 'guest', id: 'g1' }, 'Host');
  const guest = seatFor({ type: 'guest', id: 'g2' }, 'Guest');
  const third = seatFor({ type: 'guest', id: 'g3' }, 'Third');

  it('allows the host to reorder the currently-seated players', () => {
    const match = { status: 'lobby', players: [host, guest, third], hostId: 'g1' };
    const result = canReorderLobby(match, { type: 'guest', id: 'g1' }, ['g3', 'g1', 'g2']);
    expect(result).toEqual({ ok: true });
  });

  it('rejects a non-host', () => {
    const match = { status: 'lobby', players: [host, guest], hostId: 'g1' };
    const result = canReorderLobby(match, { type: 'guest', id: 'g2' }, ['g2', 'g1']);
    expect(result).toEqual({ ok: false, status: 403, error: 'Only the host can reorder players' });
  });

  it('rejects reordering after the match has started', () => {
    const match = { status: 'live', players: [host, guest], hostId: 'g1' };
    const result = canReorderLobby(match, { type: 'guest', id: 'g1' }, ['g2', 'g1']);
    expect(result).toEqual({ ok: false, status: 409, error: 'Can only reorder players before the match starts' });
  });

  it('rejects an order missing a seated player', () => {
    const match = { status: 'lobby', players: [host, guest, third], hostId: 'g1' };
    const result = canReorderLobby(match, { type: 'guest', id: 'g1' }, ['g1', 'g2']);
    expect(result).toEqual({ ok: false, status: 400, error: 'New order must include every seated player exactly once' });
  });

  it('rejects an order with a duplicate', () => {
    const match = { status: 'lobby', players: [host, guest], hostId: 'g1' };
    const result = canReorderLobby(match, { type: 'guest', id: 'g1' }, ['g1', 'g1']);
    expect(result).toEqual({ ok: false, status: 400, error: 'New order must include every seated player exactly once' });
  });

  it('rejects an order naming an unseated player', () => {
    const match = { status: 'lobby', players: [host, guest], hostId: 'g1' };
    const result = canReorderLobby(match, { type: 'guest', id: 'g1' }, ['g1', 'g9']);
    expect(result).toEqual({ ok: false, status: 400, error: 'New order must include every seated player exactly once' });
  });
});

describe('canLeaveMatch', () => {
  const host = { userId: 'u1', guestId: undefined, name: 'Host', isGuest: false };
  const guest = { userId: 'u2', guestId: undefined, name: 'Guest', isGuest: false };

  it('allows the host to leave a live match', () => {
    const match = { status: 'live', hostId: 'u1', players: [host, guest] };
    expect(canLeaveMatch(match, 'u1')).toEqual({ ok: true });
  });

  it('allows a seated non-host player to leave', () => {
    const match = { status: 'live', hostId: 'u1', players: [host, guest] };
    expect(canLeaveMatch(match, 'u2')).toEqual({ ok: true });
  });

  it('rejects a user who is neither host nor a seated player', () => {
    const match = { status: 'live', hostId: 'u1', players: [host, guest] };
    const result = canLeaveMatch(match, 'u3');
    expect(result).toEqual({ ok: false, status: 403, error: 'Not a participant in this match' });
  });

  it('rejects leaving a match that already finished', () => {
    const match = { status: 'complete', hostId: 'u1', players: [host, guest] };
    const result = canLeaveMatch(match, 'u1');
    expect(result).toEqual({ ok: false, status: 409, error: 'Match is not active' });
  });

  it('rejects leaving a match that was already abandoned', () => {
    const match = { status: 'abandoned', hostId: 'u1', players: [host, guest] };
    const result = canLeaveMatch(match, 'u1');
    expect(result).toEqual({ ok: false, status: 409, error: 'Match is not active' });
  });
});

describe('allParticipantsLeft', () => {
  const host = { userId: 'u1', guestId: undefined, name: 'Host', isGuest: false };
  const guest = { userId: 'u2', guestId: undefined, name: 'Guest', isGuest: false };

  it('is false when nobody has left', () => {
    const match = { hostId: 'u1', players: [host, guest], leftBy: [] };
    expect(allParticipantsLeft(match)).toBe(false);
  });

  it('is false when only some participants have left', () => {
    const match = { hostId: 'u1', players: [host, guest], leftBy: ['u1'] };
    expect(allParticipantsLeft(match)).toBe(false);
  });

  it('is true once every participant with a userId has left', () => {
    const match = { hostId: 'u1', players: [host, guest], leftBy: ['u1', 'u2'] };
    expect(allParticipantsLeft(match)).toBe(true);
  });

  it('ignores guest seats, which never appear in leftBy', () => {
    const guestSeat = { userId: undefined, guestId: 'g9', name: 'Guest', isGuest: true };
    const match = { hostId: 'u1', players: [host, guestSeat], leftBy: ['u1'] };
    expect(allParticipantsLeft(match)).toBe(true);
  });
});


describe('canEditSettings', () => {
  const lobby = { status: 'lobby', hostId: 'g1' };

  it('lets the host change the rules while the match is still a lobby', () => {
    expect(canEditSettings(lobby, { type: 'guest', id: 'g1' })).toEqual({ ok: true });
  });

  it('refuses anyone who is not the host, seated or not', () => {
    const result = canEditSettings(lobby, { type: 'guest', id: 'g2' });
    expect(result).toEqual({ ok: false, status: 403, error: 'Only the host can change the match settings' });
  });

  // The settings are baked into the game state once play starts — X01's starting score is
  // already on the scoreboard — so a late change would disagree with what everyone can see.
  it('refuses the host once the match is live', () => {
    const result = canEditSettings({ status: 'live', hostId: 'g1' }, { type: 'guest', id: 'g1' });
    expect(result).toEqual({ ok: false, status: 409, error: 'Settings can only be changed before the match starts' });
  });

  it('refuses on a completed or abandoned match', () => {
    for (const status of ['complete', 'abandoned']) {
      expect(canEditSettings({ status, hostId: 'g1' }, { type: 'guest', id: 'g1' }).ok).toBe(false);
    }
  });

  it('identifies the host by identity id, so a signed-in host works the same way', () => {
    expect(canEditSettings({ status: 'lobby', hostId: 'u1' }, { type: 'user', id: 'u1' }).ok).toBe(true);
  });
});
