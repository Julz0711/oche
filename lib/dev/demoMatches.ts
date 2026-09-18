import { createPlayerId, type Throw } from '@/lib/types';
import * as x01 from '@/lib/games/x01/engine';
import * as cricket from '@/lib/games/cricket/engine';
import * as copycat from '@/lib/games/copycat/engine';
import { X01DefaultSettings } from '@/lib/games/x01/schema';
import { CricketDefaultSettings } from '@/lib/games/cricket/schema';
import { CopycatDefaultSettings } from '@/lib/games/copycat/schema';

/** Sample results are played through the real engines so history, stats and replay agree. */
export function buildDemoMatch(gameId: 'x01' | 'cricket' | 'copycat', actor: string, opponent: string, won: boolean, variant = 0) {
  const players = [createPlayerId(actor), createPlayerId(opponent)];
  const winner = players[won ? 0 : 1];
  const dart = (sector: number, ring: Throw['ring'], order: number): Throw => ({ sector: sector as Throw['sector'], ring, points: 0, order: order as Throw['order'] });
  if (gameId === 'x01') {
    const settings = { ...X01DefaultSettings, firstThrow: 'player1' as const };
    let state = x01.init(players, settings);
    for (let count = 0; !state.matchComplete && count < 240; count++) {
      const player = players[state.currentPlayerIndex];
      const remaining = state.playerScores[player] - state.currentVisit.reduce((sum, d) => sum + d.points, 0);
      const order = state.currentVisit.length;
      const strong = player === winner;
      let sector = strong ? (order + variant) % 3 === 0 ? 20 : 19 : 20;
      let ring: Throw['ring'] = strong && (count + variant) % 4 !== 0 ? 'T' : 'S';
      if (remaining <= 60) {
        ring = remaining % 2 === 0 && remaining <= 40 ? 'D' : 'S';
        sector = ring === 'D' ? remaining / 2 : remaining % 2 ? 1 : 20;
      }
      state = x01.applyThrow(state, dart(sector, ring, order), settings);
    }
    if (!state.matchComplete) throw new Error('Demo X01 did not finish');
    return { gameId, settings, state, winnerId: state.winnerId };
  }
  if (gameId === 'cricket') {
    const settings = CricketDefaultSettings;
    let state = cricket.init(players, settings);
    for (let count = 0; !state.matchComplete && count < 180; count++) {
      const player = players[state.currentPlayerIndex];
      const number = cricket.CRICKET_NUMBERS.find(n => state.marks[player][n] < 3) ?? 20;
      const ring: Throw['ring'] = number === 'bull' ? 'IB' : player === winner ? 'T' : 'S';
      state = cricket.applyThrow(state, dart(number === 'bull' ? 25 : number, ring, state.currentVisit.length), settings);
    }
    if (!state.matchComplete) throw new Error('Demo Cricket did not finish');
    return { gameId, settings, state, winnerId: state.winnerId };
  }
  const settings = { ...CopycatDefaultSettings, firstThrow: 'player1' as const };
  let state = copycat.init(players, settings);
  for (let count = 0; !state.matchComplete && count < 180; count++) {
    const player = players[state.currentPlayerIndex];
    const order = state.currentVisit.length;
    // The weaker player always sets 60. The stronger one matches it with a double finish.
    const sector = 20;
    const ring = player === winner && (state.target === null || order === 1) ? 'D' : 'S';
    state = copycat.applyThrow(state, dart(sector, ring, order), settings);
  }
  if (!state.matchComplete) throw new Error('Demo Copycat did not finish');
  return { gameId, settings, state, winnerId: state.winnerId };
}
