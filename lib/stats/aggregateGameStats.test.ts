import { describe, it, expect } from 'vitest';
import { aggregateX01Stats, aggregateCricketStats, aggregateCopycatStats } from './aggregateGameStats';
import { createPlayerId } from '@/lib/types';

const you = createPlayerId('player1');
const t = (sector: number, ring: 'S' | 'D' | 'T' | 'OB' | 'IB' | 'M', order: 0 | 1 | 2 = 0) => ({ sector: sector as any, ring, points: 0, order });

describe('aggregateX01Stats', () => {
  it('returns zeroed stats for no entries', () => {
    expect(aggregateX01Stats([])).toEqual({
      avg3Dart: 0, firstNineAvg: 0, checkoutRate: 0, visits100: 0, visits140: 0, visits180: 0, busts: 0, bustsPerMatch: 0,
      bestVisit: 0, highestCheckout: null, doublesRate: 0, treblesRate: 0, commonDoubleOut: null,
    });
  });

  it('computes a 3-dart average weighted by total darts across multiple matches, not averaged per match', () => {
    // Match A: one visit of 3 darts at 20 each (60 total). Match B: one visit of 3 darts at 10 each (30 total).
    // Weighted avg3Dart = (60+30)/6*3 = 45, NOT the average of each match's own 60 and 30 (which would be 45 too
    // here by coincidence of equal dart counts — use uneven dart counts below to prove real weighting).
    const entries = [
      { playerId: you, throws: [t(20, 'S'), t(20, 'S'), t(20, 'S')].map(x => ({ ...x, points: 20 })), scoreBefore: 501, scoreAfter: 441, busted: false, wasCheckout: false },
      { playerId: you, throws: [{ ...t(10, 'S'), points: 10 }], scoreBefore: 441, scoreAfter: 431, busted: false, wasCheckout: false },
    ];
    // totalPoints = 60 + 10 = 70, totalDarts = 4 -> avg3Dart = 70/4*3 = 52.5
    expect(aggregateX01Stats(entries).avg3Dart).toBe(52.5);
  });

  it('counts checkout attempts and hits within the 170 simplification, and tracks the highest checkout', () => {
    const entries = [
      { playerId: you, throws: [{ ...t(20, 'D'), points: 40 }], scoreBefore: 40, scoreAfter: 0, busted: false, wasCheckout: true },
      { playerId: you, throws: [{ ...t(20, 'S'), points: 20 }], scoreBefore: 100, scoreAfter: 80, busted: false, wasCheckout: false },
      { playerId: you, throws: [{ ...t(20, 'S'), points: 20 }], scoreBefore: 300, scoreAfter: 280, busted: false, wasCheckout: false },
    ];
    const stats = aggregateX01Stats(entries);
    expect(stats.checkoutRate).toBe(50); // 1 hit / 2 attempts (score <= 170); the 300 visit is out of range
    expect(stats.highestCheckout).toBe(40);
  });

  it('sums scoring bands (100s/140s/180s) and busts across matches via scoringVisitStats', () => {
    const entries = [
      { playerId: you, throws: [], scoreBefore: 180, scoreAfter: 0, busted: false, wasCheckout: false },
      { playerId: you, throws: [], scoreBefore: 100, scoreAfter: 0, busted: false, wasCheckout: false },
      { playerId: you, throws: [], scoreBefore: 50, scoreAfter: 60, busted: true, wasCheckout: false },
    ];
    const stats = aggregateX01Stats(entries, 2);
    expect(stats.visits180).toBe(1);
    expect(stats.visits100).toBe(1);
    expect(stats.busts).toBe(1);
    expect(stats.bestVisit).toBe(180);
    expect(stats.bustsPerMatch).toBe(0.5); // 1 bust / 2 matches
  });

  it('takes the first nine darts of each leg separately, weighted by darts, not per-match averages', () => {
    const dart = (points: number, order: 0 | 1 | 2) => ({ ...t(20, 'S', order), points });
    // Leg A (match 1): 3 visits of 3 darts — 60 per visit, so all 9 opening darts score 20 each.
    // Leg B (match 2): a single 3-dart visit of 5s, then the leg ends — only 3 opening darts.
    const visit = (legKey: string, points: number) => ({
      playerId: you, throws: [dart(points, 0), dart(points, 1), dart(points, 2)],
      scoreBefore: 501, scoreAfter: 501 - points * 3, busted: false, wasCheckout: false, legKey,
    });
    const entries = [
      visit('m1:1', 20), visit('m1:1', 20), visit('m1:1', 20),
      visit('m1:1', 60), // 10th-12th darts of leg A: excluded from the first nine
      visit('m2:1', 5),
    ];
    // First nine: leg A contributes 9 darts × 20 = 180, leg B contributes 3 darts × 5 = 15.
    // (180 + 15) / 12 darts × 3 = 48.75 -> 48.8. A naive per-match average would be (60+15)/2 = 37.5.
    expect(aggregateX01Stats(entries, 2).firstNineAvg).toBe(48.8);
  });

  it('counts a double/treble as an attempt whether it hits or misses, so the rate is not always 100%', () => {
    const entries = [
      // Scoring visit (well outside checkout range): one treble hit, two misses at the treble.
      { playerId: you, throws: [{ ...t(20, 'T'), points: 60 }, { ...t(20, 'S'), points: 20 }, { ...t(20, 'M'), points: 0 }], scoreBefore: 501, scoreAfter: 421, busted: false, wasCheckout: false, checkOut: 'double' as const },
      // Checkout-range visit (scoreBefore <= 50): one double hit, one double miss.
      { playerId: you, throws: [{ ...t(20, 'S'), points: 20 }, { ...t(10, 'D'), points: 20 }], scoreBefore: 40, scoreAfter: 0, busted: false, wasCheckout: true, checkOut: 'double' as const },
    ];
    const stats = aggregateX01Stats(entries, 1);
    // Trebles: 3 darts thrown while scoreBefore(501) > 50 -> 3 attempts, 1 hit -> 33.3%
    expect(stats.treblesRate).toBeCloseTo(33.3, 1);
    // Doubles: 2 darts thrown while remaining <= 50 (40, then 20 after the single) -> 2 attempts, 1 hit -> 50%
    expect(stats.doublesRate).toBe(50);
    expect(stats.commonDoubleOut).toBe('D10');
  });

  it('groups entries by their own checkout rule, and skips double-attempt tracking under straight out', () => {
    const entries = [
      { playerId: you, throws: [{ ...t(20, 'S'), points: 20 }], scoreBefore: 20, scoreAfter: 0, busted: false, wasCheckout: true, checkOut: 'straight' as const },
    ];
    const stats = aggregateX01Stats(entries, 1);
    expect(stats.doublesRate).toBe(0);
    expect(stats.treblesRate).toBe(0); // ring 'S' is neither hit
  });
});

describe('aggregateCricketStats', () => {
  it('returns zeroed stats for no entries', () => {
    expect(aggregateCricketStats([])).toEqual({ mpr: 0, totalMarks: 0, pointsScored: 0 });
  });

  it('computes marks-per-round weighted by total darts across matches', () => {
    const entries = [
      { playerId: you, throws: [{ ...t(20, 'T'), points: 0 }], scoreBefore: 0, scoreAfter: 60 }, // 3 marks
      { playerId: you, throws: [{ ...t(19, 'S'), points: 0 }], scoreBefore: 60, scoreAfter: 79 }, // 1 mark
    ];
    // totalMarks = 4, totalDarts = 2 -> mpr = 4/2*3 = 6
    expect(aggregateCricketStats(entries).mpr).toBe(6);
    expect(aggregateCricketStats(entries).totalMarks).toBe(4);
    expect(aggregateCricketStats(entries).pointsScored).toBe(60 + 19);
  });

  it('ignores non-scoring numbers and misses', () => {
    const entries = [{ playerId: you, throws: [{ ...t(1, 'S'), points: 0 }, { ...t(0, 'M'), points: 0 }], scoreBefore: 0, scoreAfter: 0 }];
    expect(aggregateCricketStats(entries).totalMarks).toBe(0);
  });
});

describe('aggregateCopycatStats', () => {
  it('returns zeroed stats for no entries', () => {
    expect(aggregateCopycatStats([])).toEqual({ avgVisit: 0, points: 0, matchRate: 0, doubleFinishes: 0 });
  });

  it('computes average visit total weighted across matches, points won, and match rate against a target', () => {
    const matches = [
      {
        firstTo: 3,
        entries: [
          { playerId: you, throws: [{ ...t(20, 'S'), points: 20 }], scoreBefore: 0, scoreAfter: 0, targetBefore: null, total: 20, wasPointWin: false, pointsWonBefore: { [you]: 0 } },
          { playerId: you, throws: [{ ...t(20, 'S'), points: 20 }], scoreBefore: 0, scoreAfter: 0, targetBefore: 20, total: 20, wasPointWin: true, pointsWonBefore: { [you]: 0 } },
        ],
      },
    ];
    const stats = aggregateCopycatStats(matches);
    expect(stats.avgVisit).toBe(20); // (20+20)/2
    expect(stats.points).toBe(1);
    expect(stats.matchRate).toBe(100); // 1 match out of 1 attempt against a real target
  });

  it('counts a double finish only when the winning visit was also match point, using that match\'s own firstTo', () => {
    const matches = [
      {
        firstTo: 1, // this visit wins the match outright -> pointsWonBefore(0) === firstTo-1(0) -> match point
        entries: [
          { playerId: you, throws: [{ ...t(20, 'D'), points: 40 }], scoreBefore: 0, scoreAfter: 0, targetBefore: 40, total: 40, wasPointWin: true, pointsWonBefore: { [you]: 0 } },
        ],
      },
      {
        firstTo: 5, // not match point (needs 5, only has 0) -> no double finish even though it's a double
        entries: [
          { playerId: you, throws: [{ ...t(20, 'D'), points: 40 }], scoreBefore: 0, scoreAfter: 0, targetBefore: 40, total: 40, wasPointWin: true, pointsWonBefore: { [you]: 0 } },
        ],
      },
    ];
    expect(aggregateCopycatStats(matches).doubleFinishes).toBe(1);
  });
});
