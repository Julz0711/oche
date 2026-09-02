// lib/games/x01/matchStats.test.ts
import { describe, it, expect } from 'vitest';
import { matchStats } from './matchStats';
import { init, applyThrow } from './engine';
import { createPlayerId } from '@/lib/types';
import { X01DefaultSettings } from './schema';

describe('matchStats', () => {
  const player1 = createPlayerId('p1');
  const player2 = createPlayerId('p2');

  it('returns empty stats for a player with no visits yet', () => {
    const state = init([player1, player2], X01DefaultSettings);
    const stats = matchStats(state, player1, X01DefaultSettings);
    expect(stats.avg3Dart).toBe(0);
    expect(stats.checkoutRate).toBe(0);
    expect(stats.bestLeg).toBe(null);
    expect(stats.highestCheckout).toBe(null);
  });

  it('counts a bust within checkout range as an attempt, but not a hit', () => {
    const settings = { ...X01DefaultSettings, checkOut: 'double' as const };
    const state = init([player1, player2], settings);
    state.playerScores[player1] = 50; // within the 170 checkout-attempt threshold
    const overshoot = { sector: 20 as const, ring: 'T' as const, points: 60, order: 0 as const }; // 50 - 60 < 0, busts
    const afterBust = applyThrow(state, overshoot, settings);

    const stats = matchStats(afterBust, player1, settings);
    expect(stats.checkoutRate).toBe(0); // 1 attempt (scoreBefore=50 <= 170), 0 hits -> 0%
  });

  it('does not count a normal visit with scoreBefore above the checkout threshold as an attempt', () => {
    const settings = { ...X01DefaultSettings, checkOut: 'double' as const };
    let state = init([player1, player2], settings);
    state.playerScores[player1] = 500; // scoreBefore well above the 170 threshold
    const throw1 = { sector: 20 as const, ring: 'T' as const, points: 60, order: 0 as const };
    const throw2 = { sector: 20 as const, ring: 'T' as const, points: 60, order: 1 as const };
    const throw3 = { sector: 20 as const, ring: 'T' as const, points: 60, order: 2 as const };
    state = applyThrow(state, throw1, settings);
    state = applyThrow(state, throw2, settings);
    state = applyThrow(state, throw3, settings); // 500 - 180 = 320, a normal non-bust, non-checkout visit

    const stats = matchStats(state, player1, settings);
    expect(stats.checkoutRate).toBe(0); // 0 attempts recorded (0/0 -> 0), not "every visit counts"
  });

  it('counts a successful checkout as both an attempt and a hit', () => {
    const settings = { ...X01DefaultSettings, checkOut: 'double' as const };
    const state = init([player1, player2], settings);
    state.playerScores[player1] = 40;
    const finishDart = { sector: 20 as const, ring: 'D' as const, points: 40, order: 0 as const };
    const afterCheckout = applyThrow(state, finishDart, settings);

    const stats = matchStats(afterCheckout, player1, settings);
    expect(stats.checkoutRate).toBe(100); // 1 attempt (scoreBefore=40 <= 170), 1 hit -> 100%
    expect(stats.highestCheckout).toBe(40);
  });
});
