// lib/games/cricket/stats.ts
import { Visit, StatTileDef, GameStats } from '@/lib/types';
import { CricketSettings } from './schema';
import { marksForThrow } from './engine';

export interface CricketStats extends GameStats {
  mpr: number;
  totalMarks: number;
  pointsScored: number;
  /** Numbers currently closed (0-7), live-only — a flat Visit[] log has no marks-progression
   *  state to replay this from, so computeStats always reports null here; matchStats (which
   *  reads live in-memory state) reports the real count. */
  numbersClosed: number | null;
}

export const EMPTY_CRICKET_STATS: CricketStats = {
  mpr: 0,
  totalMarks: 0,
  pointsScored: 0,
  numbersClosed: null,
};

export function computeStats(visits: Visit[], settings: CricketSettings): CricketStats {
  if (visits.length === 0) {
    return { ...EMPTY_CRICKET_STATS };
  }

  let totalMarks = 0;
  let totalDarts = 0;
  let pointsScored = 0;

  visits.forEach((visit) => {
    pointsScored += (visit.scoreAfter ?? 0) - (visit.scoreBefore ?? 0);
    visit.throws.forEach((t) => {
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
    numbersClosed: null,
  };
}

export const statTiles: StatTileDef<CricketStats>[] = [
  { label: 'MPR', key: 'mpr', value: (s) => s.mpr.toFixed(2) },
  { label: 'Total Marks', key: 'totalMarks', value: (s) => `${s.totalMarks}` },
  { label: 'Points', key: 'pointsScored', value: (s) => `${s.pointsScored}` },
  {
    label: 'Numbers Closed',
    key: 'numbersClosed',
    value: (s) => (s.numbersClosed === null ? 'None' : `${s.numbersClosed}/7`),
  },
];
