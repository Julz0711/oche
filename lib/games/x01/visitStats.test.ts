import { describe, expect, it } from 'vitest';
import { scoringVisitStats, doublesAndTreblesStats } from './visitStats';
import X01 from './index';
import { createPlayerId } from '@/lib/types';

describe('scoring visit statistics', () => {
  it('uses exclusive bands and excludes busted scores', () => {
    const visits = [99, 100, 139, 140, 179, 180].map(score => ({ scoreBefore: 501, scoreAfter: 501 - score }));
    expect(scoringVisitStats([...visits, { scoreBefore: 180, scoreAfter: 0, busted: true }])).toEqual({
      bestVisit: 180, visits100: 2, visits140: 2, visits180: 1, busts: 1,
    });
  });

  it('does not invent a score when a persisted visit lacks score boundaries', () => {
    expect(scoringVisitStats([{}, { scoreBefore: 100 }, { scoreAfter: 0 }])).toEqual({
      bestVisit: 0, visits100: 0, visits140: 0, visits180: 0, busts: 0,
    });
  });

  it('counts only credited points under double-in and restores the counts on undo', () => {
    const p1 = createPlayerId('p1'), p2 = createPlayerId('p2');
    const settings = { ...X01.defaultSettings, checkIn: 'double' as const };
    let state = X01.init([p1, p2], settings);
    state = X01.applyThrow(state, { sector: 20, ring: 'T', points: 60, order: 0 }, settings);
    state = X01.applyThrow(state, { sector: 20, ring: 'D', points: 40, order: 1 }, settings);
    state = X01.applyThrow(state, { sector: 20, ring: 'T', points: 60, order: 2 }, settings);
    expect(X01.matchStats(state, p1, settings).bestVisit).toBe(100);
    expect(X01.matchStats(state, p1, settings).visits100).toBe(1);
    expect(X01.matchStats(X01.undo(state), p1, settings).bestVisit).toBe(0);
  });
});

describe('doublesAndTreblesStats', () => {
  const dart = (ring: 'S' | 'D' | 'T' | 'IB' | 'M', points: number, order: 0 | 1 | 2) => ({ ring, points, order });

  it('counts a miss as an attempt, so the rate is not stuck at 100%', () => {
    // Scoring visit (scoreBefore 501, well above checkout range): treble hit, then two misses at treble.
    const visits = [{ scoreBefore: 501, throws: [dart('T', 60, 0), dart('S', 20, 1), dart('M', 0, 2)] }];
    const result = doublesAndTreblesStats(visits, 'double');
    expect(result).toEqual({ doublesHit: 0, doublesAttempts: 0, treblesHit: 1, treblesAttempts: 3 });
  });

  it('classifies darts as double attempts once the remaining score drops into checkout range', () => {
    // scoreBefore 60: first dart (S20, remaining 60) is a treble attempt; after it remaining is
    // 40, so the second dart (D20) is a double attempt and hits.
    const visits = [{ scoreBefore: 60, throws: [dart('S', 20, 0), dart('D', 40, 1)] }];
    const result = doublesAndTreblesStats(visits, 'double');
    expect(result).toEqual({ doublesHit: 1, doublesAttempts: 1, treblesHit: 0, treblesAttempts: 1 });
  });

  it('never counts double attempts under straight out', () => {
    const visits = [{ scoreBefore: 40, throws: [dart('D', 40, 0)] }];
    const result = doublesAndTreblesStats(visits, 'straight');
    expect(result.doublesAttempts).toBe(0);
    expect(result.treblesAttempts).toBe(1);
  });
});
