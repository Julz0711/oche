import type { Identity } from './identity';
import { isSeated, type MatchPlayerDoc } from './matchLobby';

type MatchAccess = { mode: string; hostId?: string; userId?: string; players: MatchPlayerDoc[] };

export function canAccessMatch(match: MatchAccess, identity: Identity): boolean {
  if (match.mode === 'remote') return isSeated(match.players, identity);
  return identity.type === 'user'
    ? match.userId === identity.id
    : !match.userId && match.hostId === identity.id;
}
