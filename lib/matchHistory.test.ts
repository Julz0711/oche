// lib/matchHistory.test.ts
import { describe, it, expect } from 'vitest';
import { resolveYourPlayerId, summarize } from './matchHistory';
import { createPlayerId } from './types';

describe('resolveYourPlayerId', () => {
  it('local matches always resolve to player1', () => {
    const match = { mode: 'local' as const, players: [{ name: 'Guest 1', isGuest: false }] };
    expect(resolveYourPlayerId(match, 'u1')).toBe(createPlayerId('player1'));
  });

  it('remote matches resolve to the seated player whose userId matches the session', () => {
    const match = {
      mode: 'remote' as const,
      players: [
        { userId: 'u1', name: 'Alex', isGuest: false },
        { userId: 'u2', name: 'Sam', isGuest: false },
      ],
    };
    expect(resolveYourPlayerId(match, 'u2')).toBe(createPlayerId('u2'));
  });

  it('remote matches with no matching seated player resolve to null', () => {
    const match = {
      mode: 'remote' as const,
      players: [{ userId: 'u1', name: 'Alex', isGuest: false }],
    };
    expect(resolveYourPlayerId(match, 'u9')).toBe(null);
  });
});

describe('summarize', () => {
  it('handles an empty list', () => {
    expect(summarize([])).toEqual({
      played: 0,
      wins: 0,
      winRate: 0,
      currentStreak: { type: null, count: 0 },
    });
  });

  it('handles all wins', () => {
    const results = [{ won: true }, { won: true }, { won: true }];
    expect(summarize(results)).toEqual({
      played: 3,
      wins: 3,
      winRate: 1,
      currentStreak: { type: 'win', count: 3 },
    });
  });

  it('handles all losses', () => {
    const results = [{ won: false }, { won: false }];
    expect(summarize(results)).toEqual({
      played: 2,
      wins: 0,
      winRate: 0,
      currentStreak: { type: 'loss', count: 2 },
    });
  });

  it('computes a mixed streak (newest-first), stopping at the first break', () => {
    // newest-first: win, win, loss, win — current streak is 2 wins, then it breaks at the loss
    const results = [{ won: true }, { won: true }, { won: false }, { won: true }];
    expect(summarize(results)).toEqual({
      played: 4,
      wins: 3,
      winRate: 0.75,
      currentStreak: { type: 'win', count: 2 },
    });
  });
});
