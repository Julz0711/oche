// lib/matchLobby.ts
import { Identity } from './identity';

export interface MatchPlayerDoc {
  userId?: string;
  guestId?: string;
  name: string;
  seat: number;
  isGuest: boolean;
}

export function seatFor(identity: Identity, name: string, seat: number): MatchPlayerDoc {
  return {
    userId: identity.type === 'user' ? identity.id : undefined,
    guestId: identity.type === 'guest' ? identity.id : undefined,
    name,
    seat,
    isGuest: identity.type === 'guest',
  };
}

export function identityIdOf(player: MatchPlayerDoc): string {
  return (player.userId ?? player.guestId) as string;
}

export function isSeated(players: MatchPlayerDoc[], identity: Identity): boolean {
  return players.some((p) => identityIdOf(p) === identity.id);
}

type LobbyResult = { ok: true } | { ok: false; status: number; error: string };

export function canJoinLobby(match: { status: string; players: MatchPlayerDoc[] }, identity: Identity): LobbyResult {
  if (match.status !== 'lobby') {
    return { ok: false, status: 409, error: 'Match is not open for joining' };
  }
  if (isSeated(match.players, identity)) {
    return { ok: true }; // idempotent re-join
  }
  if (match.players.length >= 2) {
    return { ok: false, status: 409, error: 'Match is full' };
  }
  return { ok: true };
}

export function canStartMatch(
  match: { status: string; players: MatchPlayerDoc[]; hostId: string },
  identity: Identity
): LobbyResult {
  if (identity.id !== match.hostId) {
    return { ok: false, status: 403, error: 'Only the host can start the match' };
  }
  if (match.status !== 'lobby') {
    return { ok: false, status: 409, error: 'Match already started' };
  }
  if (match.players.length !== 2) {
    return { ok: false, status: 400, error: 'Match needs exactly 2 players to start' };
  }
  return { ok: true };
}
