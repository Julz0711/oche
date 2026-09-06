// lib/games/x01/index.ts
import { GameModule, PlayerId, Throw } from '@/lib/types';
import { X01State, init as initEngine, applyThrow, undo, isComplete, winner } from './engine';
import { X01Settings, X01SettingsSchema, X01DefaultSettings } from './schema';
import { computeStats, statTiles } from './stats';
import { matchStats } from './matchStats';
import { ScoreboardSlot } from './components';
import { Dices } from 'lucide-react';

const players = (state: X01State): PlayerId[] => state.players;

const currentPlayer = (state: X01State): PlayerId => state.players[state.currentPlayerIndex];

const visitProgress = (state: X01State): { darts: number; max: number; throws: Throw[] } => ({
  darts: state.currentVisit.length,
  max: 3,
  throws: state.currentVisit,
});

const matchInfo = (
  state: X01State,
  settings: X01Settings
): { label: string; value: string; emphasis?: 'hero' | 'normal' }[] =>
  // "Leg 3"/"Set 2" alone read ambiguously as "3 legs/2 sets won" rather than "in play" — legs
  // and sets actually won are the raceProgress/Pips display below; this is just what's live.
  settings.sets > 0
    ? [
        { label: 'Set', value: `${state.currentSetNumber} in play` },
        { label: 'Leg', value: `${state.currentLegNumber} in play` },
      ]
    : [{ label: 'Leg', value: `${state.currentLegNumber} in play` }];

const raceProgress = (
  state: X01State,
  settings: X01Settings
): { playerId: PlayerId; legs: number; legsTarget: number; sets: number; setsTarget: number }[] =>
  state.players.map((playerId) => ({
    playerId,
    legs: state.legsWon[playerId],
    legsTarget: settings.firstTo,
    sets: state.setsWon[playerId],
    setsTarget: settings.sets,
  }));

const visitHistory = (
  state: X01State,
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

const heatmap = (state: X01State, playerId: PlayerId): Record<string, number> => {
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
  state: X01State,
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
    isCheckout: latest.wasCheckout,
  };
};

const X01Module: GameModule<X01State, X01Settings> = {
  id: 'x01',
  name: 'X01',
  description: 'Classic 301, 501, 701 darts',
  icon: Dices,
  playerRange: [2, 8],
  status: 'stable',

  settingsSchema: X01SettingsSchema,
  defaultSettings: X01DefaultSettings,

  init: initEngine,
  applyThrow,
  undo,
  isComplete,
  winner,

  players,
  currentPlayer,
  visitProgress,
  matchInfo,
  raceProgress,
  visitHistory,
  heatmap,
  lastCompletedVisit,
  matchStats,

  ScoreboardSlot,
  primaryMetric: (state: X01State, playerId: PlayerId) => ({
    label: 'Remaining',
    value: state.playerScores[playerId].toString(),
  }),

  computeStats,
  statTiles,
};

export default X01Module;
