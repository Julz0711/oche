// src/lib/games/x01/engine.ts
import { Throw, PlayerId } from '@/lib/types';
import { X01Settings } from './schema';

export interface X01State {
  playerScores: Record<PlayerId, number>;
  currentPlayerIndex: number;
  players: PlayerId[];
  currentVisit: Throw[];
  legsWon: Record<PlayerId, number>;
  currentLegNumber: number;
  matchComplete: boolean;
  winnerId: PlayerId | null;
  visitHistory: Array<{
    playerId: PlayerId;
    throws: Throw[];
    scoreBefore: number;
    scoreAfter: number;
    busted: boolean;
  }>;
}

export function init(players: PlayerId[], settings: X01Settings): X01State {
  const playerScores: Record<PlayerId, number> = {};
  const legsWon: Record<PlayerId, number> = {};

  players.forEach((p) => {
    playerScores[p] = settings.startingScore;
    legsWon[p] = 0;
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
  };
}

export function applyThrow(state: X01State, throw_: Throw, settings: X01Settings): X01State {
  const newState = { ...state };
  const currentPlayer = newState.players[newState.currentPlayerIndex];

  // Add dart to current visit
  newState.currentVisit = [...newState.currentVisit, throw_];

  // Calculate visit total
  const visitTotal = newState.currentVisit.reduce((sum, t) => sum + t.points, 0);
  const newScore = newState.playerScores[currentPlayer] - visitTotal;

  // Check for bust mid-visit
  let isBust = false;
  if (newScore < 0) {
    isBust = true;
  } else if (newScore === 1 && settings.checkOut === 'double') {
    isBust = true;
  }

  if (isBust) {
    // Visit is busted — revert to original state (no state change)
    return state;
  }

  // Finish visit after 3 darts
  if (newState.currentVisit.length === 3) {
    const scoreBefore = state.playerScores[currentPlayer];

    // Check for checkout
    let isCheckout = false;
    if (newScore === 0) {
      const lastDart = newState.currentVisit[2];
      if (settings.checkOut === 'double' && lastDart.ring === 'D') {
        isCheckout = true;
      } else if (settings.checkOut === 'straight') {
        isCheckout = true;
      } else if (settings.checkOut === 'master' && (lastDart.ring === 'D' || lastDart.ring === 'T')) {
        isCheckout = true;
      }
    }

    newState.visitHistory.push({
      playerId: currentPlayer,
      throws: newState.currentVisit,
      scoreBefore,
      scoreAfter: isCheckout ? 0 : newScore,
      busted: false,
    });

    newState.playerScores[currentPlayer] = isCheckout ? 0 : newScore;

    if (isCheckout) {
      // Leg won
      newState.legsWon[currentPlayer]++;

      // Check for match win
      if (newState.legsWon[currentPlayer] >= settings.firstTo) {
        newState.matchComplete = true;
        newState.winnerId = currentPlayer;
      } else {
        // Start new leg
        newState.currentLegNumber++;
        newState.currentVisit = [];
        newState.players.forEach((p) => {
          newState.playerScores[p] = settings.startingScore;
        });
        // Advance player
        newState.currentPlayerIndex = (newState.currentPlayerIndex + 1) % newState.players.length;
      }
    } else {
      // Visit complete, not a checkout — advance turn
      newState.currentVisit = [];
      newState.currentPlayerIndex = (newState.currentPlayerIndex + 1) % newState.players.length;
    }
  }

  return newState;
}

export function undo(state: X01State): X01State {
  if (state.visitHistory.length === 0) return state;

  const newState = { ...state };
  const lastVisit = newState.visitHistory[newState.visitHistory.length - 1];

  // Restore player score and remove from history
  newState.playerScores[lastVisit.playerId] = lastVisit.scoreBefore;
  newState.visitHistory = newState.visitHistory.slice(0, -1);
  newState.currentVisit = [];
  newState.currentPlayerIndex = newState.players.indexOf(lastVisit.playerId);

  return newState;
}

export function isComplete(state: X01State): boolean {
  return state.matchComplete;
}

export function winner(state: X01State): PlayerId | null {
  return state.winnerId;
}

function isValidCheckout(throws: Throw[], settings: X01Settings): boolean {
  if (throws.length === 0) return false;
  const lastDart = throws[throws.length - 1];
  if (settings.checkOut === 'double') return lastDart.ring === 'D';
  if (settings.checkOut === 'straight') return true;
  if (settings.checkOut === 'master') return lastDart.ring === 'D' || lastDart.ring === 'T';
  return false;
}
