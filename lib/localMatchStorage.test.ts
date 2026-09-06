// lib/localMatchStorage.test.ts
import { describe, it, expect, beforeEach } from 'vitest';
import {
  saveLocalMatch,
  loadLocalMatch,
  clearLocalMatch,
  markPendingCompletion,
  listPendingCompletions,
  StoredLocalMatch,
} from './localMatchStorage';

/** A minimal in-memory Storage stand-in for Node's test environment (this project's vitest
 *  config uses environment: 'node', and jsdom is not installed) — implements exactly the
 *  Storage methods localMatchStorage.ts calls, nothing more. */
class FakeStorage {
  private store = new Map<string, string>();

  getItem(key: string): string | null {
    return this.store.has(key) ? this.store.get(key)! : null;
  }
  setItem(key: string, value: string): void {
    this.store.set(key, value);
  }
  removeItem(key: string): void {
    this.store.delete(key);
  }
  get length(): number {
    return this.store.size;
  }
  key(index: number): string | null {
    return Array.from(this.store.keys())[index] ?? null;
  }
}

beforeEach(() => {
  (globalThis as unknown as { localStorage: FakeStorage }).localStorage = new FakeStorage();
});

describe('saveLocalMatch / loadLocalMatch / clearLocalMatch', () => {
  it('round-trips a snapshot', () => {
    const snapshot: StoredLocalMatch = { gameId: 'x01', settings: { startingScore: 501 }, gameState: { foo: 1 } };
    saveLocalMatch('m1', snapshot);
    expect(loadLocalMatch('m1')).toEqual(snapshot);
  });

  it('returns null for a match id with no stored snapshot', () => {
    expect(loadLocalMatch('missing')).toBe(null);
  });

  it('clears a stored snapshot', () => {
    saveLocalMatch('m1', { gameId: 'x01', settings: {}, gameState: {} });
    clearLocalMatch('m1');
    expect(loadLocalMatch('m1')).toBe(null);
  });

  it('degrades gracefully when localStorage throws', () => {
    (globalThis as unknown as { localStorage: Storage }).localStorage = {
      getItem: () => {
        throw new Error('quota exceeded');
      },
      setItem: () => {
        throw new Error('quota exceeded');
      },
      removeItem: () => {
        throw new Error('quota exceeded');
      },
      length: 0,
      key: () => null,
      clear: () => {},
    };
    expect(() => saveLocalMatch('m1', { gameId: 'x01', settings: {}, gameState: {} })).not.toThrow();
    expect(loadLocalMatch('m1')).toBe(null);
  });
});

describe('markPendingCompletion / listPendingCompletions', () => {
  it('marks a pending completion on an existing snapshot', () => {
    saveLocalMatch('m1', { gameId: 'x01', settings: {}, gameState: {} });
    markPendingCompletion('m1', 'player1');
    expect(loadLocalMatch('m1')?.pendingCompletion).toEqual({ winnerId: 'player1' });
  });

  it('is a no-op if no snapshot exists for that match id', () => {
    markPendingCompletion('missing', 'player1');
    expect(loadLocalMatch('missing')).toBe(null);
  });

  it('lists only matches with a pending completion, alongside unrelated non-pending ones', () => {
    saveLocalMatch('m1', { gameId: 'x01', settings: {}, gameState: {} });
    saveLocalMatch('m2', { gameId: 'cricket', settings: {}, gameState: {} });
    markPendingCompletion('m2', null);
    const pending = listPendingCompletions();
    expect(pending).toHaveLength(1);
    expect(pending[0].matchId).toBe('m2');
    expect(pending[0].snapshot.pendingCompletion).toEqual({ winnerId: null });
  });
});
