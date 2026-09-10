import { describe, expect, it } from 'vitest';
import { LocalPlayerNamesSchema, localSeats } from './localPlayers';
import { getGameModule, type GameId } from './games/registry';
import { createPlayerId, type Throw } from './types';
import { loadLocalMatch } from './localMatchStorage';
import { useMatchStore } from '@/store/match';
import { vi } from 'vitest';

it('validates 2 to 8 names, trims names and rejects empty or oversized values', () => {
  for (const length of [2, 3, 8]) expect(LocalPlayerNamesSchema.safeParse(Array(length).fill(' Player ')).success).toBe(true);
  for (const value of [[], ['One'], Array(9).fill('Player'), ['One', '   '], ['One', 'a'.repeat(33)]]) {
    expect(LocalPlayerNamesSchema.safeParse(value).success).toBe(false);
  }
  expect(LocalPlayerNamesSchema.parse([' One ', 'Two'])).toEqual(['One', 'Two']);
});

it('attributes only the first local seat to the account holder', () => {
  const seats = localSeats(Array(8).fill('Player'), 'Owner', 'account');
  expect(seats[0]).toEqual({ name: 'Owner', userId: 'account', isGuest: false });
  expect(seats.slice(1).every(seat => seat.isGuest && !seat.userId)).toBe(true);
});

describe.each<GameId>(['x01', 'cricket', 'copycat'])('%s local multiplayer', gameId => {
  it('rotates through eight players, undoes across a turn, and preserves roster/state on reload', async () => {
    const storage = new Map<string, string>();
    vi.stubGlobal('localStorage', { getItem: (key: string) => storage.get(key) ?? null, setItem: (key: string, value: string) => storage.set(key, value) });
    try {
      const game = await getGameModule(gameId);
      const ids = Array.from({ length: 8 }, (_, i) => createPlayerId(`player${i + 1}`));
      const players = localSeats(ids.map((_, i) => `Name ${i + 1}`));
      const store = useMatchStore;
      // Distinct, non-multiple sector values per seat: copycat ends a visit early (and keeps the
      // same player on throw) the moment a running total exactly matches the prior visit's total,
      // so a plain 1..8 sequence coincidentally self-matches (e.g. two darts of 3 equal the
      // preceding visit's total of 6). This sequence keeps every partial/final total for seat i
      // clear of seat i-1's final total (3 * sector), so turns rotate through all eight seats.
      const sectors: Throw['sector'][] = [1, 2, 5, 7, 11, 14, 17, 19];
      store.getState().setMatch({ matchId: 'test-local', gameModule: game, gameState: game.init(ids, game.defaultSettings), settings: game.defaultSettings, players });
      for (const id of ids) {
        expect(game.currentPlayer(store.getState().gameState)).toBe(id);
        const sector = sectors[ids.indexOf(id)];
        for (let dart = 0; dart < 3; dart++) await store.getState().applyThrow({ ring: 'S', sector, points: sector, order: dart as Throw['order'] });
      }
      expect(game.currentPlayer(store.getState().gameState)).toBe(ids[0]);
      await store.getState().undo();
      expect(game.currentPlayer(store.getState().gameState)).toBe(ids[7]);
      const saved = loadLocalMatch('test-local')!;
      expect(saved.players).toEqual(players);
      expect(saved.gameState).toEqual(store.getState().gameState);
      store.getState().reset();
      store.getState().setMatch({ matchId: 'test-local', gameModule: game, gameState: saved.gameState, settings: saved.settings, players: saved.players });
      expect(game.players(store.getState().gameState)).toEqual(ids);
      expect(store.getState().players).toEqual(players);
    } finally { useMatchStore.getState().reset(); vi.unstubAllGlobals(); }
  });
});
