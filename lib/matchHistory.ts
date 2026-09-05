// lib/matchHistory.ts
import { createPlayerId, PlayerId } from './types';
import { identityIdOf, MatchPlayerDoc } from './matchLobby';

/** Which `PlayerId` in a stored match's `state.players` is "you", for stats purposes.
 *  Local matches always name the first player `player1` by convention (matching local match
 *  creation's existing pattern of naming the first seat from `session.user.name` when signed
 *  in). Remote matches resolve to whichever seated player's `userId` matches the session. */
export function resolveYourPlayerId(
  match: { mode: 'local' | 'remote'; players: MatchPlayerDoc[] },
  sessionUserId: string
): PlayerId | null {
  if (match.mode === 'local') return createPlayerId('player1');
  const you = match.players.find((p) => p.userId === sessionUserId);
  return you ? createPlayerId(identityIdOf(you)) : null;
}

/** Summarizes a newest-first list of match results into played/wins/winRate and the player's
 *  current streak (the run of identical results starting from the most recent match). */
export function summarize(results: { won: boolean }[]): {
  played: number;
  wins: number;
  winRate: number;
  currentStreak: { type: 'win' | 'loss' | null; count: number };
} {
  const played = results.length;
  const wins = results.filter((r) => r.won).length;
  const winRate = played === 0 ? 0 : wins / played;

  let currentStreak: { type: 'win' | 'loss' | null; count: number } = { type: null, count: 0 };
  if (played > 0) {
    const streakType: 'win' | 'loss' = results[0].won ? 'win' : 'loss';
    let count = 0;
    for (const result of results) {
      const resultType: 'win' | 'loss' = result.won ? 'win' : 'loss';
      if (resultType !== streakType) break;
      count += 1;
    }
    currentStreak = { type: streakType, count };
  }

  return { played, wins, winRate, currentStreak };
}
