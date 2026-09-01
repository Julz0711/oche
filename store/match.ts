// store/match.ts
import { create } from 'zustand';
import { GameModule, PlayerId, Visit } from '@/lib/types';

interface MatchStore {
  matchId: string | null;
  gameModule: GameModule<any, any> | null;
  gameState: any; // X01State | CricketState | ...
  settings: any; // the settings object used to init gameState; required by applyThrow
  visitLog: Visit[];
  currentPlayer: PlayerId | null;

  // Actions
  setMatch: (matchId: string, gameModule: GameModule<any, any>, initialState: any, settings: any) => void;
  applyThrow: (throw_: any) => void;
  undo: () => void;
  addVisit: (visit: Visit) => void;
  reset: () => void;
}

export const useMatchStore = create<MatchStore>((set) => ({
  matchId: null,
  gameModule: null,
  gameState: null,
  settings: null,
  visitLog: [],
  currentPlayer: null,

  setMatch: (matchId, gameModule, initialState, settings) =>
    set({
      matchId,
      gameModule,
      gameState: initialState,
      settings,
    }),

  applyThrow: (throw_) =>
    set((state) => {
      if (!state.gameModule || !state.gameState) return state;
      const newGameState = state.gameModule.applyThrow(state.gameState, throw_, state.settings);
      return { gameState: newGameState };
    }),

  undo: () =>
    set((state) => {
      if (!state.gameModule || !state.gameState) return state;
      const newGameState = state.gameModule.undo(state.gameState);
      return { gameState: newGameState };
    }),

  addVisit: (visit) =>
    set((state) => ({
      visitLog: [...state.visitLog, visit],
    })),

  reset: () =>
    set({
      matchId: null,
      gameModule: null,
      gameState: null,
      settings: null,
      visitLog: [],
      currentPlayer: null,
    }),
}));
