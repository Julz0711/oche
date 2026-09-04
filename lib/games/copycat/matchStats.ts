// lib/games/copycat/matchStats.ts
import { PlayerId } from '@/lib/types';
import { CopycatState } from './engine';
import { CopycatSettings } from './schema';
import { CopycatStats, EMPTY_COPYCAT_STATS } from './stats';

export function matchStats(state: CopycatState, playerId: PlayerId, settings: CopycatSettings): CopycatStats {
  const entries = state.visitHistory.filter((entry) => entry.playerId === playerId);

  if (entries.length === 0) {
    return { ...EMPTY_COPYCAT_STATS };
  }

  let totalPoints = 0;
  let pointsWon = 0;
  let attemptsAgainstTarget = 0;
  let matches = 0;
  let doubleFinishes = 0;

  entries.forEach((entry) => {
    entry.throws.forEach((t) => {
      totalPoints += t.points;
    });

    if (entry.targetBefore !== null) {
      attemptsAgainstTarget++;
      if (entry.total === entry.targetBefore) matches++;
    }

    if (entry.wasPointWin) {
      pointsWon++;
      const wasMatchPointWin = entry.pointsWonBefore[playerId] === settings.firstTo - 1;
      const lastDart = entry.throws[entry.throws.length - 1];
      const wasDoubleFinish = lastDart.ring === 'D' || lastDart.ring === 'IB';
      if (wasMatchPointWin && wasDoubleFinish) doubleFinishes++;
    }
  });

  const avgVisit = totalPoints / entries.length;
  const matchRate = attemptsAgainstTarget > 0 ? (matches / attemptsAgainstTarget) * 100 : 0;

  return {
    points: pointsWon,
    avgVisit: Math.round(avgVisit * 100) / 100,
    matchRate: Math.round(matchRate * 100) / 100,
    doubleFinishes,
  };
}
