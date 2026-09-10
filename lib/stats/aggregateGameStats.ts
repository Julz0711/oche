// lib/stats/aggregateGameStats.ts
//
// A cross-match, properly-weighted version of each game's per-match matchStats: instead of
// averaging several matches' already-rounded rates (which risks the exact "misleading numbers"
// the aggregate-stats spec called out), these accumulate raw totals (points, darts, marks, hits,
// attempts) across every visit from every included match and only divide once, at the end.
//
// Deliberately excluded: any leg-scoped stat (X01's dartsPerLeg/bestLeg, "first nine" darts).
// Those are only meaningful within a single match/leg — concatenating visits from separate
// matches would silently merge unrelated legs. They stay per-match-only (PostMatchStats/
// LiveStatsDrawer, via the existing matchStats), never aggregated here.
import type { PlayerId, Throw } from '@/lib/types';
import { scoringVisitStats } from '@/lib/games/x01/visitStats';
import { marksForThrow } from '@/lib/games/cricket/engine';

interface X01Entry {
  throws: Throw[];
  scoreBefore: number;
  scoreAfter: number;
  busted: boolean;
  wasCheckout: boolean;
}

export interface X01AggregateStats {
  avg3Dart: number;
  checkoutRate: number;
  visits100: number;
  visits140: number;
  visits180: number;
  busts: number;
  bestVisit: number;
  highestCheckout: number | null;
  doublesRate: number;
  treblesRate: number;
}

export const EMPTY_X01_AGGREGATE: X01AggregateStats = {
  avg3Dart: 0, checkoutRate: 0, visits100: 0, visits140: 0, visits180: 0, busts: 0,
  bestVisit: 0, highestCheckout: null, doublesRate: 0, treblesRate: 0,
};

export function aggregateX01Stats(entries: X01Entry[]): X01AggregateStats {
  if (entries.length === 0) return EMPTY_X01_AGGREGATE;

  let totalPoints = 0;
  let totalDarts = 0;
  let checkoutHits = 0;
  let checkoutAttempts = 0;
  let doublesHit = 0;
  let doublesAttempts = 0;
  let treblesHit = 0;
  let trebleAttempts = 0;
  let highestCheckout = 0;

  for (const entry of entries) {
    for (const dart of entry.throws) {
      totalPoints += dart.points;
      totalDarts++;
      if (dart.ring === 'T') { treblesHit++; trebleAttempts++; }
      else if (dart.ring === 'D' || dart.ring === 'IB') { doublesHit++; doublesAttempts++; }
    }
    // A visit counts as a checkout attempt if it started within reach of a finish in one
    // 3-dart visit under any checkout mode (max 170) — same simplification as
    // lib/games/x01/matchStats.ts's isCheckoutAttempt.
    if (entry.scoreBefore <= 170) {
      checkoutAttempts++;
      if (entry.wasCheckout) checkoutHits++;
    }
    if (entry.wasCheckout) highestCheckout = Math.max(highestCheckout, entry.scoreBefore);
  }

  const { bestVisit, visits100, visits140, visits180, busts } = scoringVisitStats(entries);

  return {
    avg3Dart: totalDarts > 0 ? Math.round((totalPoints / totalDarts) * 3 * 10) / 10 : 0,
    checkoutRate: checkoutAttempts > 0 ? Math.round((checkoutHits / checkoutAttempts) * 1000) / 10 : 0,
    visits100, visits140, visits180, busts, bestVisit,
    highestCheckout: highestCheckout || null,
    doublesRate: doublesAttempts > 0 ? Math.round((doublesHit / doublesAttempts) * 1000) / 10 : 0,
    treblesRate: trebleAttempts > 0 ? Math.round((treblesHit / trebleAttempts) * 1000) / 10 : 0,
  };
}

interface CricketEntry {
  throws: Throw[];
  scoreBefore: number;
  scoreAfter: number;
}

export interface CricketAggregateStats {
  mpr: number;
  totalMarks: number;
  pointsScored: number;
}

export const EMPTY_CRICKET_AGGREGATE: CricketAggregateStats = { mpr: 0, totalMarks: 0, pointsScored: 0 };

export function aggregateCricketStats(entries: CricketEntry[]): CricketAggregateStats {
  if (entries.length === 0) return EMPTY_CRICKET_AGGREGATE;

  let totalDarts = 0;
  let totalMarks = 0;
  let pointsScored = 0;

  for (const entry of entries) {
    pointsScored += entry.scoreAfter - entry.scoreBefore;
    for (const dart of entry.throws) {
      totalDarts++;
      const target = marksForThrow(dart.sector, dart.ring);
      if (target) totalMarks += target.marks;
    }
  }

  return {
    mpr: totalDarts > 0 ? Math.round((totalMarks / totalDarts) * 3 * 100) / 100 : 0,
    totalMarks,
    pointsScored,
  };
}

interface CopycatEntry {
  playerId: PlayerId;
  throws: Throw[];
  targetBefore: number | null;
  total: number;
  wasPointWin: boolean;
  pointsWonBefore: Record<string, number>;
}

/** One completed match's worth of copycat visits, plus the settings needed to judge whether a
 *  point win was also match point — kept per-match (not flattened) because `firstTo` can differ
 *  between matches. */
interface CopycatMatch {
  entries: CopycatEntry[];
  firstTo: number;
}

export interface CopycatAggregateStats {
  avgVisit: number;
  points: number;
  matchRate: number;
  doubleFinishes: number;
}

export const EMPTY_COPYCAT_AGGREGATE: CopycatAggregateStats = { avgVisit: 0, points: 0, matchRate: 0, doubleFinishes: 0 };

export function aggregateCopycatStats(matches: CopycatMatch[]): CopycatAggregateStats {
  let totalPoints = 0;
  let totalVisits = 0;
  let pointsWon = 0;
  let attemptsAgainstTarget = 0;
  let matchesHit = 0;
  let doubleFinishes = 0;

  for (const match of matches) {
    for (const entry of match.entries) {
      totalVisits++;
      for (const dart of entry.throws) totalPoints += dart.points;

      if (entry.targetBefore !== null) {
        attemptsAgainstTarget++;
        if (entry.total === entry.targetBefore) matchesHit++;
      }

      if (entry.wasPointWin) {
        pointsWon++;
        const wasMatchPointWin = entry.pointsWonBefore[entry.playerId] === match.firstTo - 1;
        const lastDart = entry.throws[entry.throws.length - 1];
        const wasDoubleFinish = lastDart.ring === 'D' || lastDart.ring === 'IB';
        if (wasMatchPointWin && wasDoubleFinish) doubleFinishes++;
      }
    }
  }

  if (totalVisits === 0) return EMPTY_COPYCAT_AGGREGATE;

  return {
    avgVisit: Math.round((totalPoints / totalVisits) * 100) / 100,
    points: pointsWon,
    matchRate: attemptsAgainstTarget > 0 ? Math.round((matchesHit / attemptsAgainstTarget) * 1000) / 10 : 0,
    doubleFinishes,
  };
}
