// lib/games/copycat/index.ts
import { GameModule, PlayerId, Throw } from '@/lib/types';
import { CopycatState, init as initEngine, applyThrow, undo, isComplete, winner } from './engine';
import { CopycatSettings, CopycatSettingsSchema, CopycatDefaultSettings } from './schema';
import { computeStats, statTiles } from './stats';
import { matchStats } from './matchStats';
import { ScoreboardSlot } from './components';
import { Repeat } from 'lucide-react';

const players = (state: CopycatState): PlayerId[] => state.players;

const currentPlayer = (state: CopycatState): PlayerId => state.players[state.currentPlayerIndex];

const visitProgress = (state: CopycatState): { darts: number; max: number; throws: Throw[] } => ({
  darts: state.currentVisit.length,
  max: 3,
  throws: state.currentVisit,
});

const matchInfo = (
  state: CopycatState,
  settings: CopycatSettings
): { label: string; value: string; emphasis?: 'hero' | 'normal' }[] => {
  const total = state.currentVisit.reduce((sum, dart) => sum + dart.points, 0);
  const remaining = state.target === null ? null : state.target - total;
  return [
    { label: 'Target', value: state.target !== null ? String(state.target) : 'Set a target', emphasis: state.target !== null ? 'hero' : 'normal' },
    { label: remaining !== null && remaining < 0 ? 'Over by' : remaining === null ? 'Visit' : 'Left', value: String(remaining === null ? total : Math.abs(remaining)), emphasis: 'hero' },
  ];
};

const raceProgress = (
  state: CopycatState,
  settings: CopycatSettings
): { playerId: PlayerId; legs: number; legsTarget: number; sets: number; setsTarget: number }[] =>
  state.players.map((playerId) => ({
    playerId,
    legs: state.pointsWon[playerId],
    legsTarget: settings.firstTo,
    sets: 0,
    setsTarget: 0,
  }));

const visitHistory = (
  state: CopycatState,
  playerId: PlayerId
): { throws: Throw[]; scoreBefore: number; scoreAfter: number; busted: boolean }[] =>
  state.visitHistory
    .filter((entry) => entry.playerId === playerId && entry.pointNumberBefore === state.currentPointNumber)
    .map((entry) => ({
      throws: entry.throws,
      scoreBefore: 0,
      scoreAfter: entry.total,
      busted: false,
    }))
    .reverse();

const heatmap = (state: CopycatState, playerId: PlayerId): Record<string, number> => {
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
  state: CopycatState,
  playerId: PlayerId
): { throws: Throw[]; scoreBefore: number; scoreAfter: number; busted: boolean; isCheckout: boolean } | null => {
  const entries = state.visitHistory.filter((entry) => entry.playerId === playerId);
  if (entries.length === 0) return null;
  const latest = entries[entries.length - 1];
  return {
    throws: latest.throws,
    scoreBefore: 0,
    scoreAfter: latest.total,
    busted: false,
    isCheckout: latest.wasPointWin,
  };
};

const CopycatModule: GameModule<CopycatState, CopycatSettings> = {
  id: 'copycat',
  name: 'Copycat',
  description: 'Match the total to score — win the point and lead next',
  icon: Repeat,
  playerRange: [2, 8],
  status: 'stable',

  settingsSchema: CopycatSettingsSchema,
  defaultSettings: CopycatDefaultSettings,

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
  raceProgressInScoreboard: true,
  visitHistory,
  heatmap,
  lastCompletedVisit,
  matchStats,

  ScoreboardSlot,
  primaryMetric: (state: CopycatState, playerId: PlayerId) => ({
    label: 'Points',
    value: state.pointsWon[playerId].toString(),
  }),

  computeStats,
  statTiles,
};

export default CopycatModule;
