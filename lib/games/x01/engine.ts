// src/lib/games/x01/engine.ts
import { Throw, PlayerId } from '@/lib/types';
import { X01Settings } from './schema';

function isDoubleRing(ring: Throw['ring']): boolean {
  return ring === 'D' || ring === 'IB';
}

interface VisitHistoryEntry {
  playerId: PlayerId;
  throws: Throw[];
  scoreBefore: number;
  scoreAfter: number;
  busted: boolean;
  /** Whether this visit finished the leg (checkout landed). */
  wasCheckout: boolean;
  /** Whether this visit finished the match (checkout that reached firstTo legs). */
  wasMatchWin: boolean;
  /** Full state snapshots taken immediately before this visit was applied, so `undo` can restore them exactly. */
  playerScoresBefore: Record<PlayerId, number>;
  legsWonBefore: Record<PlayerId, number>;
  legNumberBefore: number;
  matchCompleteBefore: boolean;
  winnerIdBefore: PlayerId | null;
  isOnDoubleBefore: Record<PlayerId, boolean>;
}

export interface X01State {
  playerScores: Record<PlayerId, number>;
  currentPlayerIndex: number;
  players: PlayerId[];
  currentVisit: Throw[];
  legsWon: Record<PlayerId, number>;
  currentLegNumber: number;
  matchComplete: boolean;
  winnerId: PlayerId | null;
  visitHistory: VisitHistoryEntry[];
  /** Whether each player has "opened" their innings (landed a double) in the current leg. Only meaningful when settings.checkIn === 'double'. */
  isOnDouble: Record<PlayerId, boolean>;
}

export function init(players: PlayerId[], settings: X01Settings): X01State {
  const playerScores: Record<PlayerId, number> = {};
  const legsWon: Record<PlayerId, number> = {};
  const isOnDouble: Record<PlayerId, boolean> = {};

  players.forEach((p) => {
    playerScores[p] = settings.startingScore;
    legsWon[p] = 0;
    isOnDouble[p] = false;
  });

  let startPlayerIndex = 0;
  if (settings.firstThrow === 'random') {
    startPlayerIndex = Math.floor(Math.random() * players.length);
  }

  return {
    playerScores,
    currentPlayerIndex: startPlayerIndex,
    players,
    currentVisit: [],
    legsWon,
    currentLegNumber: 1,
    matchComplete: false,
    winnerId: null,
    visitHistory: [],
    isOnDouble,
  };
}

/**
 * Applies one dart to the state and returns a brand-new state object. `state` (and everything
 * nested inside it) is never mutated — every nested structure that changes is rebuilt fresh.
 */
export function applyThrow(state: X01State, throw_: Throw, settings: X01Settings): X01State {
  const currentPlayer = state.players[state.currentPlayerIndex];
  const newVisit = [...state.currentVisit, throw_];

  // Walk the visit's darts so far to figure out how many points actually count.
  // Under double-in, darts thrown before the player lands a double score 0; the
  // double that opens the innings scores its own points, and everything after counts normally.
  const startedOn = settings.checkIn === 'straight' ? true : state.isOnDouble[currentPlayer];
  let isOnAfterVisit = startedOn;
  let visitTotal = 0;
  for (const dart of newVisit) {
    if (isOnAfterVisit) {
      visitTotal += dart.points;
    } else if (isDoubleRing(dart.ring)) {
      isOnAfterVisit = true;
      visitTotal += dart.points;
    }
    // else: dart doesn't count yet (not on a double), contributes 0
  }

  const scoreBeforeVisit = state.playerScores[currentPlayer];
  const newScore = scoreBeforeVisit - visitTotal;

  const isFinishAttempt = newScore === 0;
  const validFinish = isFinishAttempt && isValidCheckout(throw_, settings);

  const isBust =
    newScore < 0 ||
    (newScore === 1 && settings.checkOut !== 'straight') ||
    (isFinishAttempt && !validFinish);

  if (isBust) {
    return endVisit(state, {
      currentPlayer,
      newVisit,
      scoreBeforeVisit,
      scoreAfter: scoreBeforeVisit, // score reverts to what it was before this visit
      busted: true,
      isCheckout: false,
      settings,
      isOnDoubleAfter: isOnAfterVisit,
    });
  }

  if (validFinish) {
    return endVisit(state, {
      currentPlayer,
      newVisit,
      scoreBeforeVisit,
      scoreAfter: 0,
      busted: false,
      isCheckout: true,
      settings,
      isOnDoubleAfter: isOnAfterVisit,
    });
  }

  if (newVisit.length === 3) {
    return endVisit(state, {
      currentPlayer,
      newVisit,
      scoreBeforeVisit,
      scoreAfter: newScore,
      busted: false,
      isCheckout: false,
      settings,
      isOnDoubleAfter: isOnAfterVisit,
    });
  }

  // Visit continues — just append the dart, nothing else changes yet.
  return {
    ...state,
    currentVisit: newVisit,
  };
}

/** Shared tail-end for a resolved visit: bust, mid-visit checkout, or a normal 3-dart finish. */
function endVisit(
  state: X01State,
  args: {
    currentPlayer: PlayerId;
    newVisit: Throw[];
    scoreBeforeVisit: number;
    scoreAfter: number;
    busted: boolean;
    isCheckout: boolean;
    settings: X01Settings;
    isOnDoubleAfter: boolean;
  }
): X01State {
  const { currentPlayer, newVisit, scoreBeforeVisit, scoreAfter, busted, isCheckout, settings, isOnDoubleAfter } =
    args;

  let playerScoresAfter: Record<PlayerId, number> = { ...state.playerScores, [currentPlayer]: scoreAfter };
  let legsWonAfter = state.legsWon;
  let currentLegNumberAfter = state.currentLegNumber;
  let matchCompleteAfter = state.matchComplete;
  let winnerIdAfter = state.winnerId;
  let isOnDoubleAfterVisit: Record<PlayerId, boolean> =
    settings.checkIn === 'double' ? { ...state.isOnDouble, [currentPlayer]: isOnDoubleAfter } : state.isOnDouble;
  let wasMatchWin = false;
  let nextPlayerIndex = state.currentPlayerIndex;

  if (isCheckout) {
    legsWonAfter = { ...state.legsWon, [currentPlayer]: state.legsWon[currentPlayer] + 1 };

    if (legsWonAfter[currentPlayer] >= settings.firstTo) {
      matchCompleteAfter = true;
      winnerIdAfter = currentPlayer;
      wasMatchWin = true;
      // Match is over — leave scores/turn as-is, no new leg to set up.
    } else {
      currentLegNumberAfter = state.currentLegNumber + 1;
      const resetScores: Record<PlayerId, number> = {};
      const resetIsOnDouble: Record<PlayerId, boolean> = {};
      state.players.forEach((p) => {
        resetScores[p] = settings.startingScore;
        resetIsOnDouble[p] = false;
      });
      playerScoresAfter = resetScores;
      isOnDoubleAfterVisit = resetIsOnDouble;
      nextPlayerIndex = (state.currentPlayerIndex + 1) % state.players.length;
    }
  } else {
    nextPlayerIndex = (state.currentPlayerIndex + 1) % state.players.length;
  }

  const historyEntry: VisitHistoryEntry = {
    playerId: currentPlayer,
    throws: newVisit,
    scoreBefore: scoreBeforeVisit,
    scoreAfter,
    busted,
    wasCheckout: isCheckout,
    wasMatchWin,
    playerScoresBefore: state.playerScores,
    legsWonBefore: state.legsWon,
    legNumberBefore: state.currentLegNumber,
    matchCompleteBefore: state.matchComplete,
    winnerIdBefore: state.winnerId,
    isOnDoubleBefore: state.isOnDouble,
  };

  return {
    ...state,
    playerScores: playerScoresAfter,
    legsWon: legsWonAfter,
    currentLegNumber: currentLegNumberAfter,
    matchComplete: matchCompleteAfter,
    winnerId: winnerIdAfter,
    isOnDouble: isOnDoubleAfterVisit,
    currentVisit: [],
    currentPlayerIndex: matchCompleteAfter ? state.currentPlayerIndex : nextPlayerIndex,
    visitHistory: [...state.visitHistory, historyEntry],
  };
}

export function undo(state: X01State): X01State {
  if (state.visitHistory.length === 0) return state;

  const lastVisit = state.visitHistory[state.visitHistory.length - 1];
  const newHistory = state.visitHistory.slice(0, -1);

  return {
    ...state,
    playerScores: lastVisit.playerScoresBefore,
    legsWon: lastVisit.legsWonBefore,
    currentLegNumber: lastVisit.legNumberBefore,
    matchComplete: lastVisit.matchCompleteBefore,
    winnerId: lastVisit.winnerIdBefore,
    isOnDouble: lastVisit.isOnDoubleBefore,
    currentVisit: [],
    currentPlayerIndex: state.players.indexOf(lastVisit.playerId),
    visitHistory: newHistory,
  };
}

export function isComplete(state: X01State): boolean {
  return state.matchComplete;
}

export function winner(state: X01State): PlayerId | null {
  return state.winnerId;
}

function isValidCheckout(dart: Throw, settings: X01Settings): boolean {
  if (settings.checkOut === 'double') return isDoubleRing(dart.ring);
  if (settings.checkOut === 'straight') return true;
  if (settings.checkOut === 'master') return isDoubleRing(dart.ring) || dart.ring === 'T';
  return false;
}
