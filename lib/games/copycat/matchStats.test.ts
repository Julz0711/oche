// lib/games/copycat/matchStats.test.ts
import { describe, it, expect } from 'vitest';
import { init, applyThrow } from './engine';
import { matchStats } from './matchStats';
import { createPlayerId } from '@/lib/types';
import { CopycatDefaultSettings } from './schema';

describe('Copycat matchStats', () => {
  const player1 = createPlayerId('p1');
  const player2 = createPlayerId('p2');

  it('returns EMPTY stats for a player with no visits yet', () => {
    const state = init([player1, player2], CopycatDefaultSettings);
    const stats = matchStats(state, player1, CopycatDefaultSettings);
    expect(stats.points).toBe(0);
    expect(stats.avgVisit).toBe(0);
    expect(stats.matchRate).toBe(null);
    expect(stats.doubleFinishes).toBe(null);
  });

  it('computes avgVisit and matchRate from real visits', () => {
    const settings = { ...CopycatDefaultSettings, firstTo: 5 as const };
    let state = init([player1, player2], settings);
    const throwSector = (sector: number, ring: 'S' | 'D' | 'T') => ({
      sector: sector as any,
      ring,
      points: 0,
      order: 0 as any,
    });

    // player1: T20 x3 = 180 (unconditional, sets target)
    state = applyThrow(state, throwSector(20, 'T'), settings);
    state = applyThrow(state, throwSector(20, 'T'), settings);
    state = applyThrow(state, throwSector(20, 'T'), settings);
    // player2: S20 x3 = 60 (no match against 180)
    state = applyThrow(state, throwSector(20, 'S'), settings);
    state = applyThrow(state, throwSector(20, 'S'), settings);
    state = applyThrow(state, throwSector(20, 'S'), settings);
    // player1: S20 x3 = 60 (matches player2's 60!)
    state = applyThrow(state, throwSector(20, 'S'), settings);
    state = applyThrow(state, throwSector(20, 'S'), settings);
    state = applyThrow(state, throwSector(20, 'S'), settings);

    const p1stats = matchStats(state, player1, settings);
    expect(p1stats.points).toBe(1); // the matching visit
    expect(p1stats.avgVisit).toBe(120); // (180 + 60) / 2
    expect(p1stats.matchRate).toBe(100); // 1 attempt against a real target (the second visit), 1 match
    // (player1's first visit had no target — not counted as an "attempt")
  });
});
