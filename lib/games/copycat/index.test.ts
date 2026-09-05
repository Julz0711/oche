// lib/games/copycat/index.test.ts
import { describe, it, expect } from 'vitest';
import CopycatModule from './index';
import { createPlayerId } from '@/lib/types';
import { CopycatDefaultSettings } from './schema';

describe('CopycatModule.lastCompletedVisit', () => {
  const player1 = createPlayerId('p1');
  const player2 = createPlayerId('p2');

  it('returns null when the player has no completed visits yet', () => {
    const state = CopycatModule.init([player1, player2], CopycatDefaultSettings);
    expect(CopycatModule.lastCompletedVisit(state, player1)).toBe(null);
  });

  it('still returns a visit that won a point, even though visitHistory no longer does', () => {
    const settings = { ...CopycatDefaultSettings, firstTo: 5 as const };
    let state = CopycatModule.init([player1, player2], settings);
    const throwSector = (sector: number, ring: 'S' | 'D' | 'T') => ({
      sector: sector as any,
      ring,
      points: 0,
      order: 0 as any,
    });

    // player1: S20 x3 = 60 (unconditional, sets target)
    state = CopycatModule.applyThrow(state, throwSector(20, 'S'), settings);
    state = CopycatModule.applyThrow(state, throwSector(20, 'S'), settings);
    state = CopycatModule.applyThrow(state, throwSector(20, 'S'), settings);
    // player2: S20 x3 = 60 (matches, wins the point)
    state = CopycatModule.applyThrow(state, throwSector(20, 'S'), settings);
    state = CopycatModule.applyThrow(state, throwSector(20, 'S'), settings);
    state = CopycatModule.applyThrow(state, throwSector(20, 'S'), settings);

    expect(state.currentPointNumber).toBe(2); // advanced as part of this same throw
    expect(CopycatModule.visitHistory(state, player2)).toHaveLength(0); // filtered out — the bug this accessor fixes

    const visit = CopycatModule.lastCompletedVisit(state, player2);
    expect(visit).not.toBe(null);
    expect(visit!.scoreAfter).toBe(60);
    expect(visit!.isCheckout).toBe(true);
  });
});
