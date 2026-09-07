// lib/matchThrows.test.ts
import { describe, it, expect } from 'vitest';
import { canSubmitThrow, completedDartCount, newlyCompletedVisit } from './matchThrows';
import X01Module from './games/x01/index';
import { createPlayerId } from './types';
import { X01DefaultSettings } from './games/x01/schema';

describe('canSubmitThrow', () => {
  const player1 = createPlayerId('p1');
  const player2 = createPlayerId('p2');
  const state = X01Module.init([player1, player2], X01DefaultSettings);

  it('allows the player whose turn it is', () => {
    expect(canSubmitThrow(X01Module, state, 'p1')).toEqual({ ok: true });
  });

  it('rejects anyone else', () => {
    expect(canSubmitThrow(X01Module, state, 'p2')).toEqual({ ok: false, status: 403, error: 'Not your turn' });
  });
});

describe('newlyCompletedVisit', () => {
  const player1 = createPlayerId('p1');
  const player2 = createPlayerId('p2');

  it('returns null while a visit is still in progress', () => {
    let state = X01Module.init([player1, player2], X01DefaultSettings);
    const dart = { sector: 20 as const, ring: 'T' as const, points: 60, order: 0 as const };
    state = X01Module.applyThrow(state, dart, X01DefaultSettings);
    expect(newlyCompletedVisit(X01Module, state, player1)).toBe(null);
  });

  it('returns the visit once the 3rd dart commits it', () => {
    let state = X01Module.init([player1, player2], X01DefaultSettings);
    const dart = { sector: 20 as const, ring: 'T' as const, points: 60, order: 0 as const };
    state = X01Module.applyThrow(state, dart, X01DefaultSettings);
    state = X01Module.applyThrow(state, dart, X01DefaultSettings);
    state = X01Module.applyThrow(state, dart, X01DefaultSettings);

    const visit = newlyCompletedVisit(X01Module, state, player1);
    expect(visit).not.toBe(null);
    expect(visit!.playerId).toBe('p1');
    expect(visit!.throws).toHaveLength(3);
    expect(visit!.scoreAfter).toBe(501 - 180);
  });

  it('returns a leg-ending checkout visit (the case lastCompletedVisit exists for)', () => {
    let state = X01Module.init([player1, player2], X01DefaultSettings);
    state.playerScores[player1] = 40;
    const finishDart = { sector: 20 as const, ring: 'D' as const, points: 40, order: 0 as const };
    state = X01Module.applyThrow(state, finishDart, X01DefaultSettings);

    const visit = newlyCompletedVisit(X01Module, state, player1);
    expect(visit).not.toBe(null);
    expect(visit!.isCheckout).toBe(true);
  });
});

describe('completedDartCount', () => {
  const player1 = createPlayerId('p1');
  const player2 = createPlayerId('p2');
  const dart = { sector: 20 as const, ring: 'T' as const, points: 60, order: 0 as const };
  const miss = { sector: 20 as const, ring: 'M' as const, points: 0, order: 0 as const };

  it('is zero before anyone has completed a visit', () => {
    const state = X01Module.init([player1, player2], X01DefaultSettings);
    expect(completedDartCount(X01Module, state, player1)).toBe(0);
  });

  it('ignores darts of the visit still in progress', () => {
    let state = X01Module.init([player1, player2], X01DefaultSettings);
    state = X01Module.applyThrow(state, dart, X01DefaultSettings);
    state = X01Module.applyThrow(state, dart, X01DefaultSettings);
    expect(completedDartCount(X01Module, state, player1)).toBe(0);
  });

  it('counts misses too, so a scoreless visit still moves it', () => {
    let state = X01Module.init([player1, player2], X01DefaultSettings);
    for (let i = 0; i < 3; i++) state = X01Module.applyThrow(state, miss, X01DefaultSettings);
    expect(completedDartCount(X01Module, state, player1)).toBe(3);
  });

  it('rises only for the player who completed the visit', () => {
    let state = X01Module.init([player1, player2], X01DefaultSettings);
    for (let i = 0; i < 3; i++) state = X01Module.applyThrow(state, dart, X01DefaultSettings);
    expect(completedDartCount(X01Module, state, player1)).toBe(3);
    expect(completedDartCount(X01Module, state, player2)).toBe(0);

    // player2's darts must not move player1's count, which is what makes the number usable as a
    // "my own seat just finished a visit" signal on a state the client did not produce.
    state = X01Module.applyThrow(state, dart, X01DefaultSettings);
    expect(completedDartCount(X01Module, state, player1)).toBe(3);
  });

  it('walks back down on undo', () => {
    let state = X01Module.init([player1, player2], X01DefaultSettings);
    for (let i = 0; i < 3; i++) state = X01Module.applyThrow(state, dart, X01DefaultSettings);
    expect(completedDartCount(X01Module, state, player1)).toBe(3);
    state = X01Module.undo(state);
    expect(completedDartCount(X01Module, state, player1)).toBeLessThan(3);
  });
});
