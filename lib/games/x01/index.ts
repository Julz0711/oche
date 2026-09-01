// lib/games/x01/index.ts
import { GameModule, PlayerId, Throw } from '@/lib/types';
import { X01State, init as initEngine, applyThrow, undo, isComplete, winner } from './engine';
import { X01Settings, X01SettingsSchema, X01DefaultSettings } from './schema';
import { computeStats, statTiles } from './stats';
import { ScoreboardSlot } from './components';
import { Dices } from 'lucide-react';

const players = (state: X01State): PlayerId[] => state.players;

const currentPlayer = (state: X01State): PlayerId => state.players[state.currentPlayerIndex];

const visitProgress = (state: X01State): { darts: number; max: number } => ({
  darts: state.currentVisit.length,
  max: 3,
});

const matchInfo = (state: X01State, settings: X01Settings): { label: string; value: string }[] => [
  { label: 'Leg', value: String(state.currentLegNumber) },
];

const visitHistory = (
  state: X01State,
  playerId: PlayerId
): { throws: Throw[]; scoreAfter: number; busted: boolean }[] =>
  state.visitHistory
    .filter((entry) => entry.playerId === playerId && entry.legNumberBefore === state.currentLegNumber)
    .map((entry) => ({ throws: entry.throws, scoreAfter: entry.scoreAfter, busted: entry.busted }))
    .reverse();

const X01Module: GameModule<X01State, X01Settings> = {
  id: 'x01',
  name: 'X01',
  description: 'Classic 301, 501, 701 darts',
  icon: Dices,
  playerRange: [2, 4],
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
  visitHistory,

  ScoreboardSlot,
  primaryMetric: (state: X01State, playerId: PlayerId) => ({
    label: 'Remaining',
    value: state.playerScores[playerId].toString(),
  }),

  computeStats,
  statTiles,
};

export default X01Module;
