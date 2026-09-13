// store/match.ts
import { create } from 'zustand';
import { GameModule, PlayerId, Throw, Visit } from '@/lib/types';
import { saveLocalMatch, loadLocalMatch } from '@/lib/localMatchStorage';

type MatchMode = 'local' | 'remote';
type MatchStatus = 'lobby' | 'live' | 'complete' | 'abandoned';

interface MatchStore {
  matchId: string | null;
  mode: MatchMode;
  status: MatchStatus;
  gameModule: GameModule<any, any> | null;
  gameState: any;
  settings: any;
  players: unknown[];
  you: string | null;
  /** The identity id of the match's host — a fixed field set at creation, independent of any
   *  player's position in `players` (which the host can rearrange via the reorder endpoint). */
  hostId: string | null;
  roomCode: string | null;
  visitLog: Visit[];
  currentPlayer: PlayerId | null;
  throwError: string | null;

  setMatch: (opts: {
    matchId: string;
    gameModule: GameModule<any, any>;
    gameState: any;
    settings: any;
    mode?: MatchMode;
    status?: MatchStatus;
    players?: unknown[];
    you?: string | null;
    hostId?: string | null;
    roomCode?: string | null;
  }) => void;
  setGameState: (gameState: any, status?: MatchStatus) => void;
  setPlayers: (players: unknown[]) => void;
  /** Applied when a lobby refresh brings back settings the host has changed. */
  setSettings: (settings: any) => void;
  applyThrow: (throw_: Throw) => Promise<void>;
  undo: () => Promise<void>;
  addVisit: (visit: Visit) => void;
  clearThrowError: () => void;
  reset: () => void;
}

export const useMatchStore = create<MatchStore>((set, get) => ({
  matchId: null,
  mode: 'local',
  status: 'live',
  gameModule: null,
  gameState: null,
  settings: null,
  players: [],
  you: null,
  hostId: null,
  roomCode: null,
  visitLog: [],
  currentPlayer: null,
  throwError: null,

  setMatch: ({
    matchId,
    gameModule,
    gameState,
    settings,
    mode = 'local',
    status = 'live',
    players = [],
    you = null,
    hostId = null,
    roomCode = null,
  }) => {
    set({ matchId, gameModule, gameState, settings, mode, status, players, you, hostId, roomCode });
    if (mode === 'local') {
      const previous = loadLocalMatch(matchId);
      saveLocalMatch(matchId, {
        players,
        gameId: gameModule.id,
        settings,
        gameState,
        pendingCompletion: previous?.pendingCompletion ?? null,
      });
    }
  },

  setGameState: (gameState, status) => set((state) => ({ gameState, status: status ?? state.status })),

  setPlayers: (players) => set({ players }),

  setSettings: (settings) => set({ settings }),

  applyThrow: async (throw_) => {
    const state = get();
    if (!state.gameModule || !state.gameState || !state.matchId) return;

    if (state.mode === 'local') {
      const newGameState = state.gameModule.applyThrow(state.gameState, throw_, state.settings);
      set({ gameState: newGameState });
      saveLocalMatch(state.matchId, {
        players: state.players,
        gameId: state.gameModule.id,
        settings: state.settings,
        gameState: newGameState,
      });
      return;
    }

    // Remote scores come from the saved snapshot, including after failed realtime delivery.
    set({ throwError: null });
    try {
    const res = await fetch(`/api/matches/${state.matchId}/throws`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ throw: throw_ }),
    });
    if (!res.ok) {
      const body = await res.json().catch(() => ({}));
      set({ throwError: body.error ?? "Could not send that throw. Try again." });
    } else {
      window.dispatchEvent(new CustomEvent('oche-match-refresh', { detail: state.matchId }));
    }
    } catch {
      set({ throwError: 'Connection lost. Check the saved score after reconnecting before retrying.' });
    }
  },

  undo: async () => {
    const state = get();
    if (!state.gameModule || !state.gameState || !state.matchId) return;

    if (state.mode === 'local') {
      const newGameState = state.gameModule.undo(state.gameState);
      set({ gameState: newGameState });
      saveLocalMatch(state.matchId, {
        players: state.players,
        gameId: state.gameModule.id,
        settings: state.settings,
        gameState: newGameState,
      });
      return;
    }

    try {
    const res = await fetch(`/api/matches/${state.matchId}/undo`, { method: 'POST' });
    if (res.ok) window.dispatchEvent(new CustomEvent('oche-match-refresh', { detail: state.matchId }));
    else set({ throwError: 'Could not undo. Please try again.' });
    } catch {
      set({ throwError: 'Connection lost. Reconnect to check the saved score.' });
    }
  },

  addVisit: (visit) =>
    set((state) => ({
      visitLog: [...state.visitLog, visit],
    })),

  clearThrowError: () => set({ throwError: null }),

  reset: () =>
    set({
      matchId: null,
      mode: 'local',
      status: 'live',
      gameModule: null,
      gameState: null,
      settings: null,
      players: [],
      you: null,
      hostId: null,
      roomCode: null,
      visitLog: [],
      currentPlayer: null,
      throwError: null,
    }),
}));
