// lib/games/cricket/engine.ts
import { Throw, PlayerId } from '@/lib/types';
import { CricketSettings } from './schema';

export type CricketNumber = 20 | 19 | 18 | 17 | 16 | 15 | 'bull';
export const CRICKET_NUMBERS: CricketNumber[] = [20, 19, 18, 17, 16, 15, 'bull'];
export type Marks = 0 | 1 | 2 | 3;

/** Maps a dart's sector+ring to the cricket number it hits and how many marks it's worth.
 *  Returns null for darts that don't affect cricket state at all (sectors 1-14, or a miss). */
export function marksForThrow(
  sector: number,
  ring: Throw['ring']
): { number: CricketNumber; marks: 1 | 2 | 3 } | null {
  if (ring === 'OB') return { number: 'bull', marks: 1 };
  if (ring === 'IB') return { number: 'bull', marks: 2 };
  if (ring === 'M') return null;
  if (sector < 15 || sector > 20) return null;
  const n = sector as CricketNumber;
  if (ring === 'S') return { number: n, marks: 1 };
  if (ring === 'D') return { number: n, marks: 2 };
  if (ring === 'T') return { number: n, marks: 3 };
  return null;
}

function faceValue(n: CricketNumber): number {
  return n === 'bull' ? 25 : n;
}

function emptyMarks(): Record<CricketNumber, Marks> {
  const m = {} as Record<CricketNumber, Marks>;
  CRICKET_NUMBERS.forEach((n) => (m[n] = 0));
  return m;
}

interface CricketVisitHistoryEntry {
  playerId: PlayerId;
  throws: Throw[];
  scoreBefore: number;
  scoreAfter: number;
  busted: boolean; // always false — Cricket has no bust concept, but the field is part of the
  // shared VisitHistoryEntry shape every GameModule's accessors expose.
  wasLegWin: boolean;
  wasMatchWin: boolean;
  marksBefore: Record<PlayerId, Record<CricketNumber, Marks>>;
  pointsBefore: Record<PlayerId, number>;
  legsWonBefore: Record<PlayerId, number>;
  legNumberBefore: number;
  matchCompleteBefore: boolean;
  winnerIdBefore: PlayerId | null;
}

/** Snapshot of the state fields that change during a visit, taken at the moment the CURRENT
 *  visit began (before any of its darts were applied). Unlike X01 — where a player's score
 *  only changes once, at visit end, so `state.playerScores` conveniently still holds the
 *  "before" value for the whole visit — Cricket updates `marks`/`points` live, dart-by-dart
 *  (tests assert on `state.marks` after a single dart, mid-visit). That means the state
 *  passed into `endVisit` no longer holds the pre-visit values once the visit is 2 or 3 darts
 *  deep, so this snapshot has to be captured at visit start and threaded through explicitly. */
interface VisitStartSnapshot {
  marks: Record<PlayerId, Record<CricketNumber, Marks>>;
  points: Record<PlayerId, number>;
  legsWon: Record<PlayerId, number>;
  currentLegNumber: number;
  matchComplete: boolean;
  winnerId: PlayerId | null;
}

export interface CricketState {
  players: PlayerId[];
  currentPlayerIndex: number;
  currentVisit: Throw[];
  marks: Record<PlayerId, Record<CricketNumber, Marks>>;
  points: Record<PlayerId, number>;
  legsWon: Record<PlayerId, number>;
  currentLegNumber: number;
  matchComplete: boolean;
  winnerId: PlayerId | null;
  visitHistory: CricketVisitHistoryEntry[];
  /** Internal only — see `VisitStartSnapshot`. Not part of the documented consumer-facing
   *  shape, but harmless for consumers that only destructure the documented fields. */
  visitStart: VisitStartSnapshot;
}

export function init(players: PlayerId[], settings: CricketSettings): CricketState {
  const marks: Record<PlayerId, Record<CricketNumber, Marks>> = {};
  const points: Record<PlayerId, number> = {};
  const legsWon: Record<PlayerId, number> = {};
  players.forEach((p) => {
    marks[p] = emptyMarks();
    points[p] = 0;
    legsWon[p] = 0;
  });
  return {
    players,
    currentPlayerIndex: 0,
    currentVisit: [],
    marks,
    points,
    legsWon,
    currentLegNumber: 1,
    matchComplete: false,
    winnerId: null,
    visitHistory: [],
    visitStart: { marks, points, legsWon, currentLegNumber: 1, matchComplete: false, winnerId: null },
  };
}

export function applyThrow(state: CricketState, throw_: Throw, settings: CricketSettings): CricketState {
  if (state.matchComplete) return state;
  const currentPlayer = state.players[state.currentPlayerIndex];
  const target = marksForThrow(throw_.sector, throw_.ring);

  // Capture (or carry forward) the pre-visit snapshot. On the visit's first dart, `state`
  // itself still holds the correct "before" values; on dart 2 or 3 of the same visit, the
  // snapshot from dart 1 has to be carried forward instead, since `state.marks`/`state.points`
  // have already moved on.
  const visitStart: VisitStartSnapshot =
    state.currentVisit.length === 0
      ? {
          marks: state.marks,
          points: state.points,
          legsWon: state.legsWon,
          currentLegNumber: state.currentLegNumber,
          matchComplete: state.matchComplete,
          winnerId: state.winnerId,
        }
      : state.visitStart;

  // A dart's points are always derived here from sector+ring+state — never trusted from
  // throw_.points, which this function never reads.
  let dartPoints = 0;
  let marksAfterDart = state.marks;
  let pointsAfterDart = state.points;

  if (target) {
    const { number, marks: dartMarks } = target;
    const currentMarks = state.marks[currentPlayer][number];
    const applied = Math.min(dartMarks, 3 - currentMarks) as Marks;
    const overflow = dartMarks - applied;
    const newMarks = (currentMarks + applied) as Marks;

    const isClosedByThrower = newMarks === 3;
    const allOpponentsClosed = state.players
      .filter((p) => p !== currentPlayer)
      .every((p) => state.marks[p][number] === 3);
    dartPoints = settings.scoring !== 'no-points' && isClosedByThrower && !allOpponentsClosed ? overflow * faceValue(number) : 0;

    marksAfterDart = { ...state.marks, [currentPlayer]: { ...state.marks[currentPlayer], [number]: newMarks } };
    pointsAfterDart = { ...state.points, [currentPlayer]: state.points[currentPlayer] + dartPoints };
  }

  const trustedThrow: Throw = { ...throw_, points: dartPoints };
  const newVisit = [...state.currentVisit, trustedThrow];

  const hasClosedAll = CRICKET_NUMBERS.every((n) => marksAfterDart[currentPlayer][n] === 3);
  const hasPointsLead = state.players
    .filter((p) => p !== currentPlayer)
    .every((p) => pointsAfterDart[currentPlayer] >= pointsAfterDart[p]);
  const isLegWin = hasClosedAll && (settings.scoring === 'no-points' || hasPointsLead);

  if (isLegWin || newVisit.length === 3) {
    return endVisit(state, {
      currentPlayer,
      newVisit,
      scoreBefore: visitStart.points[currentPlayer],
      scoreAfter: pointsAfterDart[currentPlayer],
      marksAfterDart,
      pointsAfterDart,
      isLegWin,
      settings,
      visitStart,
    });
  }

  return { ...state, currentVisit: newVisit, marks: marksAfterDart, points: pointsAfterDart, visitStart };
}

function endVisit(
  state: CricketState,
  args: {
    currentPlayer: PlayerId;
    newVisit: Throw[];
    scoreBefore: number;
    scoreAfter: number;
    marksAfterDart: Record<PlayerId, Record<CricketNumber, Marks>>;
    pointsAfterDart: Record<PlayerId, number>;
    isLegWin: boolean;
    settings: CricketSettings;
    visitStart: VisitStartSnapshot;
  }
): CricketState {
  const {
    currentPlayer,
    newVisit,
    scoreBefore,
    scoreAfter,
    marksAfterDart,
    pointsAfterDart,
    isLegWin,
    settings,
    visitStart,
  } = args;

  let legsWonAfter = state.legsWon;
  let currentLegNumberAfter = state.currentLegNumber;
  let matchCompleteAfter = state.matchComplete;
  let winnerIdAfter = state.winnerId;
  let marksNext = marksAfterDart;
  let pointsNext = pointsAfterDart;
  let wasMatchWin = false;
  let nextPlayerIndex = (state.currentPlayerIndex + 1) % state.players.length;

  if (isLegWin) {
    legsWonAfter = { ...state.legsWon, [currentPlayer]: state.legsWon[currentPlayer] + 1 };
    if (legsWonAfter[currentPlayer] >= settings.firstTo) {
      matchCompleteAfter = true;
      winnerIdAfter = currentPlayer;
      wasMatchWin = true;
      nextPlayerIndex = state.currentPlayerIndex; // match over, no next turn
    } else {
      currentLegNumberAfter = state.currentLegNumber + 1;
      const resetMarks: Record<PlayerId, Record<CricketNumber, Marks>> = {};
      const resetPoints: Record<PlayerId, number> = {};
      state.players.forEach((p) => {
        resetMarks[p] = emptyMarks();
        resetPoints[p] = 0;
      });
      marksNext = resetMarks;
      pointsNext = resetPoints;
    }
  }

  const historyEntry: CricketVisitHistoryEntry = {
    playerId: currentPlayer,
    throws: newVisit,
    scoreBefore,
    scoreAfter,
    busted: false,
    wasLegWin: isLegWin,
    wasMatchWin,
    marksBefore: visitStart.marks,
    pointsBefore: visitStart.points,
    legsWonBefore: visitStart.legsWon,
    legNumberBefore: visitStart.currentLegNumber,
    matchCompleteBefore: visitStart.matchComplete,
    winnerIdBefore: visitStart.winnerId,
  };

  return {
    ...state,
    marks: marksNext,
    points: pointsNext,
    legsWon: legsWonAfter,
    currentLegNumber: currentLegNumberAfter,
    matchComplete: matchCompleteAfter,
    winnerId: winnerIdAfter,
    currentVisit: [],
    currentPlayerIndex: matchCompleteAfter ? state.currentPlayerIndex : nextPlayerIndex,
    visitHistory: [...state.visitHistory, historyEntry],
    // The next visit hasn't started yet, so its snapshot is simply "however things stand now".
    // (applyThrow recomputes this from scratch anyway once currentVisit is empty; keeping it in
    // sync here just avoids a stale value sitting on the returned state in the meantime.)
    visitStart: {
      marks: marksNext,
      points: pointsNext,
      legsWon: legsWonAfter,
      currentLegNumber: currentLegNumberAfter,
      matchComplete: matchCompleteAfter,
      winnerId: winnerIdAfter,
    },
  };
}

export function undo(state: CricketState): CricketState {
  // If there are darts in the current visit, just remove the last one.
  if (state.currentVisit.length > 0) {
    const currentVisit = state.currentVisit.slice(0, -1);
    const playerId = state.players[state.currentPlayerIndex];
    const marks: CricketState['marks'] = { ...state.visitStart.marks, [playerId]: { ...state.visitStart.marks[playerId] } };
    const points = { ...state.visitStart.points };
    for (const dart of currentVisit) {
      const hit = marksForThrow(dart.sector, dart.ring);
      if (hit) marks[playerId][hit.number] = Math.min(3, marks[playerId][hit.number] + hit.marks) as Marks;
      points[playerId] += dart.points;
    }
    return {
      ...state,
      currentVisit,
      marks,
      points,
    };
  }

  // Otherwise, revert the entire last visit from history.
  if (state.visitHistory.length === 0) return state;
  const last = state.visitHistory[state.visitHistory.length - 1];
  const newHistory = state.visitHistory.slice(0, -1);
  const restoredVisitStart: VisitStartSnapshot = {
    marks: last.marksBefore,
    points: last.pointsBefore,
    legsWon: last.legsWonBefore,
    currentLegNumber: last.legNumberBefore,
    matchComplete: last.matchCompleteBefore,
    winnerId: last.winnerIdBefore,
  };
  return {
    ...state,
    marks: last.marksBefore,
    points: last.pointsBefore,
    legsWon: last.legsWonBefore,
    currentLegNumber: last.legNumberBefore,
    matchComplete: last.matchCompleteBefore,
    winnerId: last.winnerIdBefore,
    currentVisit: [],
    currentPlayerIndex: state.players.indexOf(last.playerId),
    visitHistory: newHistory,
    visitStart: restoredVisitStart,
  };
}

export function isComplete(state: CricketState): boolean {
  return state.matchComplete;
}

export function winner(state: CricketState): PlayerId | null {
  return state.winnerId;
}
