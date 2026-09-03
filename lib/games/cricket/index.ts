// lib/games/cricket/index.ts
import { GameModule, PlayerId, Throw } from '@/lib/types';
import { CricketState, init as initEngine, applyThrow, undo, isComplete, winner } from './engine';
import { CricketSettings, CricketSettingsSchema, CricketDefaultSettings } from './schema';
import { computeStats, statTiles } from './stats';
import { matchStats } from './matchStats';
import { ScoreboardSlot } from './components';
import { Target } from 'lucide-react';

const players = (state: CricketState): PlayerId[] => state.players;

const currentPlayer = (state: CricketState): PlayerId => state.players[state.currentPlayerIndex];

const visitProgress = (state: CricketState): { darts: number; max: number; throws: Throw[] } => ({
  darts: state.currentVisit.length,
  max: 3,
  throws: state.currentVisit,
});

const matchInfo = (state: CricketState, settings: CricketSettings): { label: string; value: string }[] => [
  { label: 'Leg', value: String(state.currentLegNumber) },
];

const visitHistory = (
  state: CricketState,
  playerId: PlayerId
): { throws: Throw[]; scoreBefore: number; scoreAfter: number; busted: boolean }[] =>
  state.visitHistory
    .filter((entry) => entry.playerId === playerId && entry.legNumberBefore === state.currentLegNumber)
    .map((entry) => ({
      throws: entry.throws,
      scoreBefore: entry.scoreBefore,
      scoreAfter: entry.scoreAfter,
      busted: entry.busted,
    }))
    .reverse();

const heatmap = (state: CricketState, playerId: PlayerId): Record<string, number> => {
  const counts: Record<string, number> = {};
  state.visitHistory
    .filter((entry) => entry.playerId === playerId)
    .forEach((entry) => {
      entry.throws.forEach((t) => {
        const key = `${t.ring}${t.sector}`;
        counts[key] = (counts[key] ?? 0) + 1;
      });
    });
  return counts;
};

const lastCompletedVisit = (
  state: CricketState,
  playerId: PlayerId
): { throws: Throw[]; scoreBefore: number; scoreAfter: number; busted: boolean; isCheckout: boolean } | null => {
  const entries = state.visitHistory.filter((entry) => entry.playerId === playerId);
  if (entries.length === 0) return null;
  const latest = entries[entries.length - 1];
  return {
    throws: latest.throws,
    scoreBefore: latest.scoreBefore,
    scoreAfter: latest.scoreAfter,
    busted: latest.busted,
    isCheckout: latest.wasLegWin,
  };
};

const CricketModule: GameModule<CricketState, CricketSettings> = {
  id: 'cricket',
  name: 'Cricket',
  description: 'Close all numbers, score the most points',
  icon: Target,
  playerRange: [2, 4],
  status: 'stable',

  settingsSchema: CricketSettingsSchema,
  defaultSettings: CricketDefaultSettings,

  init: initEngine,
  applyThrow,
  undo,
  isComplete,
  winner,

  players,
  currentPlayer,
  visitProgress,
  matchInfo,
  visitHistory,
  heatmap,
  lastCompletedVisit,
  matchStats,

  ScoreboardSlot,
  primaryMetric: (state: CricketState, playerId: PlayerId) => ({
    label: 'Points',
    value: state.points[playerId].toString(),
  }),

  computeStats,
  statTiles,
};

export default CricketModule;
