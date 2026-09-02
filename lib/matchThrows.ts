// lib/matchThrows.ts
import { GameModule, PlayerId, Throw } from './types';

export function canSubmitThrow(
  gameModule: GameModule<any, any>,
  state: any,
  identityId: string
): { ok: true } | { ok: false; status: number; error: string } {
  const current = gameModule.currentPlayer(state);
  if (current !== identityId) {
    return { ok: false, status: 403, error: 'Not your turn' };
  }
  return { ok: true };
}

export interface VisitDocFields {
  playerId: string;
  throws: Throw[];
  scoreBefore: number;
  scoreAfter: number;
  busted: boolean;
  isCheckout: boolean;
}

/** If the throw just applied completed a visit (regardless of whether it also ended a leg or
 *  the match), returns that visit's fields for persistence. Returns null if the visit is still
 *  in progress. `newState` must be the state *after* the throw that's being checked. */
export function newlyCompletedVisit(
  gameModule: GameModule<any, any>,
  newState: any,
  playerId: PlayerId
): VisitDocFields | null {
  if (gameModule.visitProgress(newState).darts !== 0) return null;
  const visit = gameModule.lastCompletedVisit(newState, playerId);
  if (!visit) return null;
  return { playerId: playerId as unknown as string, ...visit };
}
