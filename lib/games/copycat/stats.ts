// lib/games/copycat/stats.ts
import { Visit, StatTileDef, GameStats } from '@/lib/types';
import { CopycatSettings } from './schema';

export interface CopycatStats extends GameStats {
  points: number;
  avgVisit: number;
  /** Percentage (0-100) of visits thrown against a real target that matched it. null when it
   *  can't be reconstructed — a flat Visit[] log has no `targetBefore` to compare against
   *  (mirrors Cricket's own computeStats returning numbersClosed: null for the same reason). */
  matchRate: number | null;
  /** Points won specifically via a qualifying match-point double/inner-bull finish. null in
   *  computeStats for the same reason as matchRate — a flat Visit[] log has no point-win
   *  context to distinguish an ordinary double hit from a match-point-winning one. */
  doubleFinishes: number | null;
}

export const EMPTY_COPYCAT_STATS: CopycatStats = {
  points: 0,
  avgVisit: 0,
  matchRate: null,
  doubleFinishes: null,
};

export function computeStats(visits: Visit[], settings: CopycatSettings): CopycatStats {
  if (visits.length === 0) {
    return { ...EMPTY_COPYCAT_STATS };
  }

  let totalPoints = 0;
  let pointsWon = 0;

  visits.forEach((visit) => {
    if (visit.isCheckout) pointsWon++;
    visit.throws.forEach((t) => {
      totalPoints += t.points;
    });
  });

  const avgVisit = totalPoints / visits.length;

  return {
    points: pointsWon,
    avgVisit: Math.round(avgVisit * 100) / 100,
    matchRate: null,
    doubleFinishes: null,
  };
}

export const statTiles: StatTileDef<CopycatStats>[] = [
  { label: 'Points', key: 'points', value: (s) => `${s.points}` },
  { label: 'Avg Visit', key: 'avgVisit', value: (s) => s.avgVisit.toFixed(1) },
  {
    label: 'Match %',
    key: 'matchRate',
    value: (s) => (s.matchRate === null ? '—' : `${s.matchRate.toFixed(0)}%`),
  },
  {
    label: 'Double Finishes',
    key: 'doubleFinishes',
    value: (s) => (s.doubleFinishes === null ? '—' : `${s.doubleFinishes}`),
  },
];
