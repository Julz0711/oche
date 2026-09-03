// lib/games/cricket/index.test.ts
import { describe, it, expect } from 'vitest';
import CricketModule from './index';
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

describe('CricketModule.lastCompletedVisit', () => {
  it('returns null when the player has no completed visits yet', () => {
    const state = CricketModule.init([player1, player2], CricketDefaultSettings);
    expect(CricketModule.lastCompletedVisit(state, player1)).toBe(null);
  });

  it('returns a normal in-leg visit', () => {
    let state = CricketModule.init([player1, player2], CricketDefaultSettings);
    state = CricketModule.applyThrow(state, dart(20, 'S', 0), CricketDefaultSettings);
    state = CricketModule.applyThrow(state, dart(20, 'S', 1), CricketDefaultSettings);
    state = CricketModule.applyThrow(state, dart(20, 'S', 2), CricketDefaultSettings);

    const visit = CricketModule.lastCompletedVisit(state, player1);
    expect(visit).not.toBe(null);
    expect(visit!.throws).toHaveLength(3);
    expect(visit!.isCheckout).toBe(false);
  });

  it('still returns a visit that won a leg, even though visitHistory no longer does', () => {
    let state = CricketModule.init([player1, player2], CricketDefaultSettings);
    // player1's visit 1: closes 20, 19, 18
    state = CricketModule.applyThrow(state, dart(20, 'T', 0), CricketDefaultSettings);
    state = CricketModule.applyThrow(state, dart(19, 'T', 1), CricketDefaultSettings);
    state = CricketModule.applyThrow(state, dart(18, 'T', 2), CricketDefaultSettings);
    // player2's visit 1: passes
    state = CricketModule.applyThrow(state, dart(1, 'M', 0), CricketDefaultSettings);
    state = CricketModule.applyThrow(state, dart(1, 'M', 1), CricketDefaultSettings);
    state = CricketModule.applyThrow(state, dart(1, 'M', 2), CricketDefaultSettings);
    // player1's visit 2: closes 17, 16, 15
    state = CricketModule.applyThrow(state, dart(17, 'T', 0), CricketDefaultSettings);
    state = CricketModule.applyThrow(state, dart(16, 'T', 1), CricketDefaultSettings);
    state = CricketModule.applyThrow(state, dart(15, 'T', 2), CricketDefaultSettings);
    // player2's visit 2: passes
    state = CricketModule.applyThrow(state, dart(1, 'M', 0), CricketDefaultSettings);
    state = CricketModule.applyThrow(state, dart(1, 'M', 1), CricketDefaultSettings);
    state = CricketModule.applyThrow(state, dart(1, 'M', 2), CricketDefaultSettings);
    // player1's visit 3: closes bull tied 0-0 with player2 — enough to win the leg
    state = CricketModule.applyThrow(state, dart(25, 'OB', 0), CricketDefaultSettings);
    state = CricketModule.applyThrow(state, dart(25, 'OB', 1), CricketDefaultSettings);
    state = CricketModule.applyThrow(state, dart(25, 'OB', 2), CricketDefaultSettings); // wins the leg

    expect(state.currentLegNumber).toBe(2); // leg advanced as part of this same throw
    expect(CricketModule.visitHistory(state, player1)).toHaveLength(0); // filtered out — the bug lastCompletedVisit exists to fix

    const visit = CricketModule.lastCompletedVisit(state, player1);
    expect(visit).not.toBe(null);
    expect(visit!.isCheckout).toBe(true);
  });
});
