// lib/games/cricket/matchStats.ts
import { PlayerId } from '@/lib/types';
import { CricketState, CRICKET_NUMBERS, marksForThrow } from './engine';
import { CricketSettings } from './schema';
import { CricketStats, EMPTY_CRICKET_STATS } from './stats';

export function matchStats(state: CricketState, playerId: PlayerId, settings: CricketSettings): CricketStats {
  const entries = state.visitHistory.filter((entry) => entry.playerId === playerId);

  const numbersClosed = CRICKET_NUMBERS.filter((n) => state.marks[playerId][n] === 3).length;

  if (entries.length === 0) {
    return { ...EMPTY_CRICKET_STATS, numbersClosed };
  }

  let totalMarks = 0;
  let totalDarts = 0;
  let pointsScored = 0;

  entries.forEach((entry) => {
    pointsScored += entry.scoreAfter - entry.scoreBefore;
    entry.throws.forEach((t) => {
      totalDarts++;
      const target = marksForThrow(t.sector, t.ring);
      if (target) totalMarks += target.marks;
    });
  });

  const mpr = totalDarts > 0 ? (totalMarks / totalDarts) * 3 : 0;

  return {
    mpr: Math.round(mpr * 100) / 100,
    totalMarks,
    pointsScored,
    numbersClosed,
  };
}
