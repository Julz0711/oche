// lib/games/x01/index.test.ts
import { describe, it, expect } from 'vitest';
import X01Module from './index';
import { createPlayerId } from '@/lib/types';
import { X01DefaultSettings } from './schema';

describe('X01Module.lastCompletedVisit', () => {
  const player1 = createPlayerId('p1');
  const player2 = createPlayerId('p2');

  it('returns null when the player has no completed visits yet', () => {
    const state = X01Module.init([player1, player2], X01DefaultSettings);
    expect(X01Module.lastCompletedVisit(state, player1)).toBe(null);
  });

  it('returns a normal in-leg visit', () => {
    let state = X01Module.init([player1, player2], X01DefaultSettings);
    const dart = { sector: 20 as const, ring: 'T' as const, points: 60, order: 0 as const };
    state = X01Module.applyThrow(state, dart, X01DefaultSettings);
    state = X01Module.applyThrow(state, dart, X01DefaultSettings);
    state = X01Module.applyThrow(state, dart, X01DefaultSettings); // 3rd dart commits the visit

    const visit = X01Module.lastCompletedVisit(state, player1);
    expect(visit).not.toBe(null);
    expect(visit!.throws).toHaveLength(3);
    expect(visit!.scoreBefore).toBe(501);
    expect(visit!.scoreAfter).toBe(501 - 180);
    expect(visit!.busted).toBe(false);
    expect(visit!.isCheckout).toBe(false);
  });

  it('still returns a visit that ended a leg, even though visitHistory no longer does', () => {
    let state = X01Module.init([player1, player2], X01DefaultSettings); // firstTo: 3, so leg 1 ending doesn't end the match
    state.playerScores[player1] = 40;
    const finishDart = { sector: 20 as const, ring: 'D' as const, points: 40, order: 0 as const };
    state = X01Module.applyThrow(state, finishDart, X01DefaultSettings);

    expect(state.currentLegNumber).toBe(2); // leg advanced as part of this same throw
    expect(X01Module.visitHistory(state, player1)).toHaveLength(0); // filtered out — this is the bug this accessor fixes

    const visit = X01Module.lastCompletedVisit(state, player1);
    expect(visit).not.toBe(null);
    expect(visit!.scoreBefore).toBe(40);
    expect(visit!.scoreAfter).toBe(0);
    expect(visit!.isCheckout).toBe(true);
  });
});
