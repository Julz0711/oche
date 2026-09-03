// lib/games/cricket/matchStats.test.ts
import { describe, it, expect } from 'vitest';
import { matchStats } from './matchStats';
import { init, applyThrow } from './engine';
import { createPlayerId } from '@/lib/types';
import { CricketDefaultSettings } from './schema';

const player1 = createPlayerId('p1');
const player2 = createPlayerId('p2');
const dart = (sector: number, ring: 'S' | 'D' | 'T' | 'OB' | 'IB' | 'M', order: 0 | 1 | 2 = 0) => ({
  sector: sector as any,
  ring,
  points: 0,
  order,
});

describe('matchStats', () => {
  it('returns empty stats for a player with no visits yet', () => {
    const state = init([player1, player2], CricketDefaultSettings);
    const stats = matchStats(state, player1, CricketDefaultSettings);
    expect(stats.mpr).toBe(0);
    expect(stats.totalMarks).toBe(0);
    expect(stats.pointsScored).toBe(0);
    expect(stats.numbersClosed).toBe(0);
  });

  it('computes MPR and total marks across a completed visit', () => {
    let state = init([player1, player2], CricketDefaultSettings);
    state = applyThrow(state, dart(20, 'T', 0), CricketDefaultSettings); // 3 marks, closes 20
    state = applyThrow(state, dart(1, 'M', 1), CricketDefaultSettings); // 0 marks
    state = applyThrow(state, dart(19, 'S', 2), CricketDefaultSettings); // 1 mark, completes the visit

    const stats = matchStats(state, player1, CricketDefaultSettings);
    expect(stats.totalMarks).toBe(4); // 3 + 0 + 1
    expect(stats.mpr).toBe(4); // (4 marks / 3 darts) * 3
  });

  it('reports cumulative points scored across visits, and live numbersClosed', () => {
    let state = init([player1, player2], CricketDefaultSettings);
    state = applyThrow(state, dart(18, 'T', 0), CricketDefaultSettings); // closes 18, no overflow
    state = applyThrow(state, dart(1, 'M', 1), CricketDefaultSettings);
    state = applyThrow(state, dart(18, 'S', 2), CricketDefaultSettings); // already closed, all overflow: 18*1
    state = applyThrow(state, dart(1, 'M', 0), CricketDefaultSettings); // player2's turn
    state = applyThrow(state, dart(1, 'M', 1), CricketDefaultSettings);
    state = applyThrow(state, dart(1, 'M', 2), CricketDefaultSettings);

    const stats = matchStats(state, player1, CricketDefaultSettings);
    expect(stats.pointsScored).toBe(18);
    expect(stats.numbersClosed).toBe(1);
  });
});
