// lib/games/copycat/engine.ts
import { Throw, PlayerId } from '@/lib/types';
import { CopycatSettings } from './schema';

/** Derives a dart's real point value from its sector+ring — never trust an incoming Throw's
 *  `points` field; always recompute it here (same discipline every engine in this project
 *  follows, established during M4's interface-discipline fix). */
function computeDartPoints(sector: Throw['sector'], ring: Throw['ring']): number {
  if (ring === 'M') return 0;
  if (ring === 'OB') return 25;
  if (ring === 'IB') return 50;
  return sector * (ring === 'D' ? 2 : ring === 'T' ? 3 : 1);
}

/** A double or the inner bull — the same "valid finish" concept X01 uses for checkOut:
 *  'double'. Reimplemented as its own one-liner here since X01's isDoubleRing is a private,
 *  non-exported helper, and game modules don't import each other's internals. */
function isDoubleFinish(ring: Throw['ring']): boolean {
  return ring === 'D' || ring === 'IB';
}

interface CopycatVisitHistoryEntry {
  playerId: PlayerId;
  throws: Throw[];
  /** This visit's summed point total. */
  total: number;
  /** What this visit was trying to match. null means it was an unconditional (new-point)
   *  throw with no target to match. */
  targetBefore: number | null;
  /** Did this visit actually score a point (a real match, and — if on match-point — a
   *  qualifying double/inner-bull finish). */
  wasPointWin: boolean;
  /** Which "point" (chase round) this visit belongs to — mirrors X01/Cricket's legNumberBefore,
   *  used by the generic visitHistory accessor to scope the on-screen history to the current
   *  chase round instead of the whole match. */
  pointNumberBefore: number;
  /** Full pre-visit state snapshot, for undo — restored verbatim, never reverse-computed. */
  targetBeforeState: number | null;
  pointsWonBefore: Record<PlayerId, number>;
  currentPlayerIndexBefore: number;
  currentPointNumberBefore: number;
  matchCompleteBefore: boolean;
  winnerIdBefore: PlayerId | null;
}

export interface CopycatState {
  players: PlayerId[];
  currentPlayerIndex: number;
  currentVisit: Throw[];
  /** The total the current visit must match. null only for the very first visit of a new
   *  point — that visit sets a fresh target unconditionally, whatever it is. */
  target: number | null;
  pointsWon: Record<PlayerId, number>;
  /** Starts at 1, increments every time a point is won. */
  currentPointNumber: number;
  matchComplete: boolean;
  winnerId: PlayerId | null;
  visitHistory: CopycatVisitHistoryEntry[];
}

export function init(players: PlayerId[], settings: CopycatSettings): CopycatState {
  const pointsWon: Record<PlayerId, number> = {};
  players.forEach((p) => {
    pointsWon[p] = 0;
  });

  let startPlayerIndex = 0;
  if (settings.firstThrow === 'random') {
    startPlayerIndex = Math.floor(Math.random() * players.length);
  }

  return {
    players,
    currentPlayerIndex: startPlayerIndex,
    currentVisit: [],
    target: null,
    pointsWon,
    currentPointNumber: 1,
    matchComplete: false,
    winnerId: null,
    visitHistory: [],
  };
}

/**
 * Applies one dart to the state and returns a brand-new state object. `state` is never
 * mutated — every nested structure that changes is rebuilt fresh.
 */
export function applyThrow(state: CopycatState, throw_: Throw, settings: CopycatSettings): CopycatState {
  const trustedThrow: Throw = { ...throw_, points: computeDartPoints(throw_.sector, throw_.ring) };
  const newVisit = [...state.currentVisit, trustedThrow];

  if (newVisit.length < 3) {
    return { ...state, currentVisit: newVisit };
  }

  return endVisit(state, newVisit, settings);
}

/** A visit here always resolves at exactly 3 darts — unlike X01, there's no "bust" concept
 *  that could end a visit early (every dart only adds to the total, nothing can go negative),
 *  so there's no early-resolution path to handle. */
function endVisit(state: CopycatState, newVisit: Throw[], settings: CopycatSettings): CopycatState {
  const currentPlayer = state.players[state.currentPlayerIndex];
  const total = newVisit.reduce((sum, t) => sum + t.points, 0);
  const targetBefore = state.target;
  const lastDart = newVisit[newVisit.length - 1];

  const isMatch = targetBefore !== null && total === targetBefore;

  let wasPointWin = false;
  let pointsWonAfter = state.pointsWon;
  let matchCompleteAfter = state.matchComplete;
  let winnerIdAfter = state.winnerId;
  let currentPointNumberAfter = state.currentPointNumber;
  let targetAfter: number | null;
  let nextPlayerIndex: number;

  if (isMatch) {
    const isMatchPoint = state.pointsWon[currentPlayer] === settings.firstTo - 1;
    const qualifies = !isMatchPoint || isDoubleFinish(lastDart.ring);

    if (qualifies) {
      wasPointWin = true;
      pointsWonAfter = { ...state.pointsWon, [currentPlayer]: state.pointsWon[currentPlayer] + 1 };

      if (pointsWonAfter[currentPlayer] >= settings.firstTo) {
        matchCompleteAfter = true;
        winnerIdAfter = currentPlayer;
      } else {
        currentPointNumberAfter = state.currentPointNumber + 1;
      }
      // The point winner leads the next point unconditionally — they don't advance, they
      // throw again next (an unconditional, target-setting visit).
      targetAfter = null;
      nextPlayerIndex = state.currentPlayerIndex;
    } else {
      // Matched, but on match-point without a qualifying finish — doesn't count as a win at
      // all. Treated exactly like a non-match: this total becomes the new target.
      targetAfter = total;
      nextPlayerIndex = (state.currentPlayerIndex + 1) % state.players.length;
    }
  } else {
    // No target yet, or didn't match — this total becomes (or replaces) the target.
    targetAfter = total;
    nextPlayerIndex = (state.currentPlayerIndex + 1) % state.players.length;
  }

  const historyEntry: CopycatVisitHistoryEntry = {
    playerId: currentPlayer,
    throws: newVisit,
    total,
    targetBefore,
    wasPointWin,
    pointNumberBefore: state.currentPointNumber,
    targetBeforeState: state.target,
    pointsWonBefore: state.pointsWon,
    currentPlayerIndexBefore: state.currentPlayerIndex,
    currentPointNumberBefore: state.currentPointNumber,
    matchCompleteBefore: state.matchComplete,
    winnerIdBefore: state.winnerId,
  };

  return {
    ...state,
    currentVisit: [],
    target: targetAfter,
    pointsWon: pointsWonAfter,
    currentPointNumber: currentPointNumberAfter,
    matchComplete: matchCompleteAfter,
    winnerId: winnerIdAfter,
    currentPlayerIndex: matchCompleteAfter ? state.currentPlayerIndex : nextPlayerIndex,
    visitHistory: [...state.visitHistory, historyEntry],
  };
}

export function undo(state: CopycatState): CopycatState {
  if (state.visitHistory.length === 0) return state;

  const last = state.visitHistory[state.visitHistory.length - 1];
  const newHistory = state.visitHistory.slice(0, -1);

  return {
    ...state,
    target: last.targetBeforeState,
    pointsWon: last.pointsWonBefore,
    currentPlayerIndex: last.currentPlayerIndexBefore,
    currentPointNumber: last.currentPointNumberBefore,
    matchComplete: last.matchCompleteBefore,
    winnerId: last.winnerIdBefore,
    currentVisit: [],
    visitHistory: newHistory,
  };
}

export function isComplete(state: CopycatState): boolean {
  return state.matchComplete;
}

export function winner(state: CopycatState): PlayerId | null {
  return state.winnerId;
}
