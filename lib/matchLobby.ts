// lib/matchLobby.ts
import { Identity } from './identity';

export interface MatchPlayerDoc {
  userId?: string;
  guestId?: string;
  name: string;
  isGuest: boolean;
}

/** A player's throwing-order position is its index in `match.players` — there is no separate
 *  seat number. Join appends to the end; the host can rearrange the array via the reorder
 *  endpoint. This is what makes "customize starting order" a plain array rewrite. */
export function seatFor(identity: Identity, name: string): MatchPlayerDoc {
  return {
    userId: identity.type === 'user' ? identity.id : undefined,
    guestId: identity.type === 'guest' ? identity.id : undefined,
    name,
    isGuest: identity.type === 'guest',
  };
}

export function identityIdOf(player: MatchPlayerDoc): string {
  return (player.userId ?? player.guestId) as string;
}

export function isSeated(players: MatchPlayerDoc[], identity: Identity): boolean {
  return players.some((p) => (identity.type === 'user' ? p.userId : p.guestId) === identity.id);
}

type LobbyResult = { ok: true } | { ok: false; status: number; error: string };

export function canJoinLobby(
  match: { status: string; players: MatchPlayerDoc[] },
  identity: Identity,
  playerRange: [number, number]
): LobbyResult {
  if (match.status !== 'lobby') {
    return { ok: false, status: 409, error: 'Match is not open for joining' };
  }
  if (isSeated(match.players, identity)) {
    return { ok: true }; // idempotent re-join
  }
  if (match.players.length >= playerRange[1]) {
    return { ok: false, status: 409, error: 'Match is full' };
  }
  return { ok: true };
}

export function canStartMatch(
  match: { status: string; players: MatchPlayerDoc[]; hostId: string },
  identity: Identity,
  playerRange: [number, number]
): LobbyResult {
  if (identity.id !== match.hostId) {
    return { ok: false, status: 403, error: 'Only the host can start the match' };
  }
  if (match.status !== 'lobby') {
    return { ok: false, status: 409, error: 'Match already started' };
  }
  if (match.players.length < playerRange[0]) {
    return { ok: false, status: 400, error: `Match needs at least ${playerRange[0]} players to start` };
  }
  return { ok: true };
}

/** Validates a host-submitted reordering: must name every currently-seated identity exactly
 *  once, no more, no less (no adding/removing/duplicating players via this endpoint). */
export function canReorderLobby(
  match: { status: string; players: MatchPlayerDoc[]; hostId: string },
  identity: Identity,
  newOrder: string[]
): LobbyResult {
  if (identity.id !== match.hostId) {
    return { ok: false, status: 403, error: 'Only the host can reorder players' };
  }
  if (match.status !== 'lobby') {
    return { ok: false, status: 409, error: 'Can only reorder players before the match starts' };
  }
  const currentIds = match.players.map(identityIdOf);
  const sameMembers =
    newOrder.length === currentIds.length &&
    new Set(newOrder).size === newOrder.length &&
    currentIds.every((id) => newOrder.includes(id));
  if (!sameMembers) {
    return { ok: false, status: 400, error: 'New order must include every seated player exactly once' };
  }
  return { ok: true };
}

/** Any signed-in participant — host or seated player — can leave a match on their own, unlike
 *  the host-only DELETE. Leaving only needs to make sense while the match is still something to
 *  come back to; a finished or already-abandoned match has nothing left to leave. */
export function canLeaveMatch(match: { status: string; hostId?: string; players: MatchPlayerDoc[] }, userId: string): LobbyResult {
  const isParticipant = match.hostId === userId || match.players.some((p) => p.userId === userId);
  if (!isParticipant) {
    return { ok: false, status: 403, error: 'Not a participant in this match' };
  }
  if (match.status !== 'lobby' && match.status !== 'live') {
    return { ok: false, status: 409, error: 'Match is not active' };
  }
  return { ok: true };
}

/** True once every signed-in participant who could ever see this match on their dashboard (the
 *  host, plus any seated player with a userId) has left it — nobody with a stake in it left, so
 *  it can be marked abandoned instead of lingering forever. Guest seats never appear in leftBy
 *  (they have no dashboard "active games" list to leave from) and are ignored here too. */
export function allParticipantsLeft(match: { hostId?: string; players: MatchPlayerDoc[]; leftBy: string[] }): boolean {
  const participantIds = new Set<string>();
  if (match.hostId) participantIds.add(match.hostId);
  for (const p of match.players) if (p.userId) participantIds.add(p.userId);
  return participantIds.size > 0 && Array.from(participantIds).every((id) => match.leftBy.includes(id));
}
