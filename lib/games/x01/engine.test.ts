// lib/games/x01/engine.test.ts
import { describe, it, expect } from 'vitest';
import type { Throw } from '@/lib/types';
import { init, applyThrow, undo, isComplete, winner } from './engine';
import { createPlayerId } from '@/lib/types';
import { X01DefaultSettings } from './schema';

describe('X01 Engine', () => {
  const player1 = createPlayerId('p1');
  const player2 = createPlayerId('p2');

  describe('init', () => {
    it('initializes match with correct starting scores', () => {
      const state = init([player1, player2], X01DefaultSettings);
      expect(state.playerScores[player1]).toBe(501);
      expect(state.playerScores[player2]).toBe(501);
      expect(state.currentPlayerIndex).toBe(0);
      expect(state.legsWon[player1]).toBe(0);
    });
  });

  describe('applyThrow: happy path', () => {
    it('adds dart to current visit without updating score mid-visit', () => {
      let state = init([player1, player2], X01DefaultSettings);
      const throw1 = { sector: 20 as const, ring: 'T' as const, points: 60, order: 0 as const };
      state = applyThrow(state, throw1, X01DefaultSettings);
      expect(state.currentVisit).toHaveLength(1);
      expect(state.playerScores[player1]).toBe(501);
    });

    it('completes visit after 3 darts and advances turn', () => {
      let state = init([player1, player2], X01DefaultSettings);
      const throw1 = { sector: 20 as const, ring: 'T' as const, points: 60, order: 0 as const };
      const throw2 = { sector: 20 as const, ring: 'T' as const, points: 60, order: 1 as const };
      const throw3 = { sector: 20 as const, ring: 'S' as const, points: 20, order: 2 as const };

      state = applyThrow(state, throw1, X01DefaultSettings);
      state = applyThrow(state, throw2, X01DefaultSettings);
      state = applyThrow(state, throw3, X01DefaultSettings);

      expect(state.currentVisit).toHaveLength(0);
      expect(state.playerScores[player1]).toBe(361); // 501 - 140
      expect(state.currentPlayerIndex).toBe(1);
    });

    it('ignores a forged points value and derives the real score from sector+ring', () => {
      const state = init([player1, player2], X01DefaultSettings);
      const forged = { sector: 20 as const, ring: 'S' as const, points: 999, order: 0 as const };
      const dart2 = { sector: 1 as const, ring: 'S' as const, points: 1, order: 1 as const };
      const dart3 = { sector: 1 as const, ring: 'S' as const, points: 1, order: 2 as const };
      let after = applyThrow(state, forged, X01DefaultSettings);
      after = applyThrow(after, dart2, X01DefaultSettings);
      after = applyThrow(after, dart3, X01DefaultSettings);
      expect(after.playerScores[player1]).toBe(501 - 20 - 1 - 1); // real single-20 value, not the forged 999
      expect(after.visitHistory[0].throws[0].points).toBe(20); // the stored throw also carries the trusted value
    });
  });

  describe('applyThrow: bust detection', () => {
    it('busts immediately when a single dart takes the score below zero, leaving score unchanged and passing the turn', () => {
      const state = init([player1, player2], X01DefaultSettings);
      state.playerScores[player1] = 10;

      const throw1 = { sector: 20 as const, ring: 'T' as const, points: 60, order: 0 as const }; // 60 > 10 remaining

      const afterBust = applyThrow(state, throw1, X01DefaultSettings);

      expect(afterBust.playerScores[player1]).toBe(10);
      expect(afterBust.currentVisit).toHaveLength(0);
      expect(afterBust.currentPlayerIndex).toBe(1);
      expect(afterBust.visitHistory[afterBust.visitHistory.length - 1].busted).toBe(true);
    });

    it('busts on a mid-visit dart, discarding the whole visit (score reverts to visit start)', () => {
      const state = init([player1, player2], X01DefaultSettings);
      state.playerScores[player1] = 40;

      const throw1 = { sector: 20 as const, ring: 'S' as const, points: 20, order: 0 as const }; // 40 -> 20
      const throw2 = { sector: 20 as const, ring: 'T' as const, points: 60, order: 1 as const }; // 20 -> -40, bust

      const afterFirstDart = applyThrow(state, throw1, X01DefaultSettings);
      expect(afterFirstDart.playerScores[player1]).toBe(40); // not committed mid-visit
      expect(afterFirstDart.currentVisit).toHaveLength(1);

      const afterBust = applyThrow(afterFirstDart, throw2, X01DefaultSettings);
      expect(afterBust.playerScores[player1]).toBe(40); // reverted to score at start of visit
      expect(afterBust.currentPlayerIndex).toBe(1);
      expect(afterBust.currentVisit).toHaveLength(0);
    });

    it('rejects score of exactly 1 with double-out rule', () => {
      const state = init([player1, player2], { ...X01DefaultSettings, checkOut: 'double' });
      state.playerScores[player1] = 2;

      const throw1 = { sector: 1 as const, ring: 'S' as const, points: 1, order: 0 as const }; // 2 -> 1, illegal under double-out

      const afterBust = applyThrow(state, throw1, X01DefaultSettings);

      expect(afterBust.playerScores[player1]).toBe(2);
      expect(afterBust.currentPlayerIndex).toBe(1);
    });

    it('busts when landing on exactly 0 with an invalid finishing dart under double-out', () => {
      const state = init([player1, player2], { ...X01DefaultSettings, checkOut: 'double' });
      state.playerScores[player1] = 20;

      const throw1 = { sector: 20 as const, ring: 'S' as const, points: 20, order: 0 as const }; // lands on 0 via a single, not a double

      const afterBust = applyThrow(state, throw1, X01DefaultSettings);

      expect(afterBust.playerScores[player1]).toBe(20); // must bust, not silently zero
      expect(afterBust.legsWon[player1]).toBe(0);
      expect(afterBust.currentPlayerIndex).toBe(1);
    });
  });

  describe('applyThrow: checkout detection', () => {
    it('recognizes checkout with double-out across 3 darts (finish on a double)', () => {
      let state = init([player1, player2], { ...X01DefaultSettings, checkOut: 'double' });
      state.playerScores[player1] = 100;

      const throw1 = { sector: 20 as const, ring: 'T' as const, points: 60, order: 0 as const };
      const throw2 = { sector: 20 as const, ring: 'S' as const, points: 20, order: 1 as const };
      const throw3 = { sector: 10 as const, ring: 'D' as const, points: 20, order: 2 as const }; // remaining 20, double finish

      state = applyThrow(state, throw1, X01DefaultSettings);
      state = applyThrow(state, throw2, X01DefaultSettings);
      state = applyThrow(state, throw3, X01DefaultSettings);

      expect(state.playerScores[player1]).toBe(501); // new leg started, scores reset
      expect(state.legsWon[player1]).toBe(1);
      expect(state.currentLegNumber).toBe(2);
      expect(state.currentPlayerIndex).toBe(1);
    });

    it('recognizes a checkout on the first dart of a visit (leg ends mid-visit, remaining darts not thrown)', () => {
      const state = init([player1, player2], { ...X01DefaultSettings, checkOut: 'double' });
      state.playerScores[player1] = 40;

      const throw1 = { sector: 20 as const, ring: 'D' as const, points: 40, order: 0 as const }; // D20 finishes immediately

      const after = applyThrow(state, throw1, X01DefaultSettings);

      expect(after.legsWon[player1]).toBe(1);
      expect(after.currentVisit).toHaveLength(0); // remaining darts never thrown
      expect(after.currentPlayerIndex).toBe(1);
    });

    it('allows straight checkout (any dart to 0)', () => {
      const settings = { ...X01DefaultSettings, checkOut: 'straight' as const };
      let state = init([player1, player2], settings);
      state.playerScores[player1] = 20;

      const throw1 = { sector: 1 as const, ring: 'S' as const, points: 1, order: 0 as const };
      const throw2 = { sector: 1 as const, ring: 'S' as const, points: 1, order: 1 as const };
      const throw3 = { sector: 18 as const, ring: 'S' as const, points: 18, order: 2 as const };

      state = applyThrow(state, throw1, settings);
      state = applyThrow(state, throw2, settings);
      state = applyThrow(state, throw3, settings);

      expect(state.playerScores[player1]).toBe(501); // new leg started
      expect(state.legsWon[player1]).toBe(1);
      expect(state.currentPlayerIndex).toBe(1);
    });

    it('recognizes master checkout on a triple', () => {
      const settings = { ...X01DefaultSettings, checkOut: 'master' as const };
      const state = init([player1, player2], settings);
      state.playerScores[player1] = 60;

      const finishDart = { sector: 20 as const, ring: 'T' as const, points: 60, order: 0 as const }; // T20 finishes under master

      const after = applyThrow(state, finishDart, settings);

      expect(after.legsWon[player1]).toBe(1);
    });

    it('busts under master checkout when the finishing dart is neither a double nor a triple', () => {
      const settings = { ...X01DefaultSettings, checkOut: 'master' as const };
      const state = init([player1, player2], settings);
      state.playerScores[player1] = 20;

      const finishDart = { sector: 20 as const, ring: 'S' as const, points: 20, order: 0 as const }; // single, invalid under master

      const after = applyThrow(state, finishDart, settings);

      expect(after.playerScores[player1]).toBe(20); // must bust, not zero
      expect(after.legsWon[player1]).toBe(0);
    });

    it('recognizes double-bullseye (ring "IB") as a valid double-out finish', () => {
      const settings = { ...X01DefaultSettings, checkOut: 'double' as const };
      const state = init([player1, player2], settings);
      state.playerScores[player1] = 50;

      const finishDart = { sector: 25 as const, ring: 'IB' as const, points: 50, order: 0 as const };

      const after = applyThrow(state, finishDart, settings);

      expect(after.legsWon[player1]).toBe(1);
    });

    it('busts under master checkout when exactly 1 remains (unfinishable via double or triple)', () => {
      const settings = { ...X01DefaultSettings, checkOut: 'master' as const };
      const state = init([player1, player2], settings);
      state.playerScores[player1] = 4;

      const dart = { sector: 3 as const, ring: 'S' as const, points: 3, order: 0 as const }; // 4 -> 1, unfinishable under master

      const after = applyThrow(state, dart, settings);

      expect(after.playerScores[player1]).toBe(4); // must bust, not leave the player on 1
    });
  });

  describe('double-in (checkIn: "double")', () => {
    it('does not count points until a double is landed', () => {
      const settings = { ...X01DefaultSettings, checkIn: 'double' as const };
      let state = init([player1, player2], settings);

      const throw1 = { sector: 20 as const, ring: 'S' as const, points: 20, order: 0 as const }; // not a double, scores 0
      const throw2 = { sector: 20 as const, ring: 'D' as const, points: 40, order: 1 as const }; // opens with a double, scores 40
      const throw3 = { sector: 5 as const, ring: 'S' as const, points: 5, order: 2 as const }; // counts normally now

      state = applyThrow(state, throw1, settings);
      state = applyThrow(state, throw2, settings);
      state = applyThrow(state, throw3, settings);

      expect(state.playerScores[player1]).toBe(501 - 40 - 5); // throw1 didn't count
    });
  });

  describe('undo', () => {
    it('reverts a normal visit to the previous state', () => {
      let state = init([player1, player2], X01DefaultSettings);
      const throw1 = { sector: 20 as const, ring: 'T' as const, points: 60, order: 0 as const };
      const throw2 = { sector: 20 as const, ring: 'T' as const, points: 60, order: 1 as const };
      const throw3 = { sector: 20 as const, ring: 'T' as const, points: 60, order: 2 as const };

      state = applyThrow(state, throw1, X01DefaultSettings);
      state = applyThrow(state, throw2, X01DefaultSettings);
      const stateBeforeUndo = applyThrow(state, throw3, X01DefaultSettings);

      const stateAfterUndo = undo(stateBeforeUndo);

      expect(stateAfterUndo.playerScores[player1]).toBe(501);
      expect(stateAfterUndo.currentPlayerIndex).toBe(0);
      expect(stateAfterUndo.currentVisit).toHaveLength(0);
    });

    it('reverts a leg-winning checkout, restoring legsWon, both players scores, and leg number', () => {
      const state = init([player1, player2], { ...X01DefaultSettings, checkOut: 'double', firstTo: 3 });
      state.playerScores[player1] = 40;
      state.playerScores[player2] = 300; // arbitrary mid-leg score for player2

      const finishDart = { sector: 20 as const, ring: 'D' as const, points: 40, order: 0 as const };
      const stateAfterCheckout = applyThrow(state, finishDart, X01DefaultSettings);

      expect(stateAfterCheckout.legsWon[player1]).toBe(1);
      expect(stateAfterCheckout.currentLegNumber).toBe(2);
      expect(stateAfterCheckout.playerScores[player2]).toBe(501); // reset for new leg

      const stateAfterUndo = undo(stateAfterCheckout);

      expect(stateAfterUndo.legsWon[player1]).toBe(0);
      expect(stateAfterUndo.currentLegNumber).toBe(1);
      expect(stateAfterUndo.playerScores[player1]).toBe(40);
      expect(stateAfterUndo.playerScores[player2]).toBe(300); // restored, not left at 501
      expect(stateAfterUndo.currentPlayerIndex).toBe(0);
    });

    it('reverts a match-winning checkout, clearing matchComplete and winnerId', () => {
      const settings = { ...X01DefaultSettings, checkOut: 'double' as const, firstTo: 1 };
      const state = init([player1, player2], settings);
      state.playerScores[player1] = 40;

      const finishDart = { sector: 20 as const, ring: 'D' as const, points: 40, order: 0 as const };
      const stateAfterWin = applyThrow(state, finishDart, settings);

      expect(isComplete(stateAfterWin)).toBe(true);
      expect(winner(stateAfterWin)).toBe(player1);

      const stateAfterUndo = undo(stateAfterWin);

      expect(isComplete(stateAfterUndo)).toBe(false);
      expect(winner(stateAfterUndo)).toBe(null);
      expect(stateAfterUndo.legsWon[player1]).toBe(0);
      expect(stateAfterUndo.playerScores[player1]).toBe(40);
    });
  });

  describe('match completion', () => {
    it('completes match after first player reaches firstTo legs', () => {
      const settings = { ...X01DefaultSettings, firstTo: 1 };
      let state = init([player1, player2], settings);
      state.playerScores[player1] = 170;

      const throw1 = { sector: 20 as const, ring: 'T' as const, points: 60, order: 0 as const };
      const throw2 = { sector: 20 as const, ring: 'T' as const, points: 60, order: 1 as const };
      const throw3 = { sector: 25 as const, ring: 'IB' as const, points: 50, order: 2 as const }; // 170-60-60-50=0, double out

      state = applyThrow(state, throw1, settings);
      state = applyThrow(state, throw2, settings);
      state = applyThrow(state, throw3, settings);

      expect(isComplete(state)).toBe(true);
      expect(winner(state)).toBe(player1);
    });
  });

  describe('invariants (property-based spirit)', () => {
    it('score never goes below 0 across a long random sequence', () => {
      let state = init([player1, player2], X01DefaultSettings);
      const rings = ['S', 'D', 'T'] as const;
      const random = () => ({
        sector: (Math.floor(Math.random() * 20) + 1) as any,
        ring: rings[Math.floor(Math.random() * rings.length)],
        points: Math.floor(Math.random() * 20),
        order: Math.floor(Math.random() * 3) as any,
      });

      for (let i = 0; i < 200; i++) {
        if (isComplete(state)) break;
        const throw_ = random();
        state = applyThrow(state, throw_, X01DefaultSettings);
        expect(state.playerScores[player1]).toBeGreaterThanOrEqual(0);
        expect(state.playerScores[player2]).toBeGreaterThanOrEqual(0);
      }
    });
  });

  describe('fixture legs', () => {
    // Each fixture replays a full leg for player1: zero or more non-finishing 3-dart
    // visits of a fixed low-value single dart, each followed by a harmless 3-dart
    // "miss" visit for player2 (so the turn passes back to player1 — applyThrow
    // always scores whoever is currently up, and a non-checkout visit always
    // advances currentPlayerIndex), then one final dart that lands exactly on 0
    // via a ring legal for the fixture's checkOut mode.
    //
    // Arithmetic for every fixture: startingScore - (visits.length * 3 * dartValue)
    // must equal finishDart.points exactly. Verified by hand-computation (see
    // task-M1-3-fix1-report.md for the generation method) and by the fact that
    // this whole block only passes if every one of the 20 assertions holds.
    const miss: Throw = { sector: 1, ring: 'M', points: 0, order: 0 };

    function threeOf(dart: Omit<Throw, 'order'>): Omit<Throw, 'order'>[] {
      return [dart, dart, dart];
    }

    function replayLeg(
      checkOut: 'double' | 'straight' | 'master',
      startingScore: number,
      visits: Omit<Throw, 'order'>[][],
      finishDart: Omit<Throw, 'order'>
    ) {
      const settings = { ...X01DefaultSettings, checkOut };
      let state = init([player1, player2], settings);
      state.playerScores[player1] = startingScore;

      visits.forEach((visitDarts) => {
        visitDarts.forEach((d, idx) => {
          state = applyThrow(state, { ...d, order: idx as 0 | 1 | 2 }, settings);
        });
        // Pass the turn back to player1: player2 throws a harmless scoreless visit.
        threeOf(miss).forEach((d, idx) => {
          state = applyThrow(state, { ...d, order: idx as 0 | 1 | 2 }, settings);
        });
      });

      state = applyThrow(state, { ...finishDart, order: 0 }, settings);
      return state;
    }

    const fixtures: Array<{
      name: string;
      checkOut: 'double' | 'straight' | 'master';
      startingScore: number;
      visits: Omit<Throw, 'order'>[][];
      finishDart: Omit<Throw, 'order'>;
    }> = [
      { name: '40 double-out, 1 filler visit of S4 then D14 finish', checkOut: 'double', startingScore: 40,
        visits: [threeOf({ sector: 4, ring: 'S', points: 4 })],
        finishDart: { sector: 14, ring: 'D', points: 28 } },
      { name: '60 straight-out, 1 filler visit of S5 then T15 finish', checkOut: 'straight', startingScore: 60,
        visits: [threeOf({ sector: 5, ring: 'S', points: 5 })],
        finishDart: { sector: 15, ring: 'T', points: 45 } },
      { name: '80 master-out, 1 filler visit of S10 then double-bull finish', checkOut: 'master', startingScore: 80,
        visits: [threeOf({ sector: 10, ring: 'S', points: 10 })],
        finishDart: { sector: 25, ring: 'IB', points: 50 } },
      { name: '100 double-out, 2 filler visits of S10 then D20 finish', checkOut: 'double', startingScore: 100,
        visits: [threeOf({ sector: 10, ring: 'S', points: 10 }), threeOf({ sector: 10, ring: 'S', points: 10 })],
        finishDart: { sector: 20, ring: 'D', points: 40 } },
      { name: '121 straight-out, 3 filler visits of S9 then D20 finish', checkOut: 'straight', startingScore: 121,
        visits: [
          threeOf({ sector: 9, ring: 'S', points: 9 }),
          threeOf({ sector: 9, ring: 'S', points: 9 }),
          threeOf({ sector: 9, ring: 'S', points: 9 }),
        ],
        finishDart: { sector: 20, ring: 'D', points: 40 } },
      { name: '170 master-out, 4 filler visits of S10 then double-bull finish', checkOut: 'master', startingScore: 170,
        visits: [
          threeOf({ sector: 10, ring: 'S', points: 10 }),
          threeOf({ sector: 10, ring: 'S', points: 10 }),
          threeOf({ sector: 10, ring: 'S', points: 10 }),
          threeOf({ sector: 10, ring: 'S', points: 10 }),
        ],
        finishDart: { sector: 25, ring: 'IB', points: 50 } },
      { name: '40 double-out, 2 filler visits of S4 then D8 finish', checkOut: 'double', startingScore: 40,
        visits: [threeOf({ sector: 4, ring: 'S', points: 4 }), threeOf({ sector: 4, ring: 'S', points: 4 })],
        finishDart: { sector: 8, ring: 'D', points: 16 } },
      { name: '60 straight-out, 2 filler visits of S4 then T12 finish', checkOut: 'straight', startingScore: 60,
        visits: [threeOf({ sector: 4, ring: 'S', points: 4 }), threeOf({ sector: 4, ring: 'S', points: 4 })],
        finishDart: { sector: 12, ring: 'T', points: 36 } },
      { name: '80 master-out, 2 filler visits of S8 then D16 finish', checkOut: 'master', startingScore: 80,
        visits: [threeOf({ sector: 8, ring: 'S', points: 8 }), threeOf({ sector: 8, ring: 'S', points: 8 })],
        finishDart: { sector: 16, ring: 'D', points: 32 } },
      { name: '100 double-out, 2 filler visits of S10 then D20 finish (b)', checkOut: 'double', startingScore: 100,
        visits: [threeOf({ sector: 10, ring: 'S', points: 10 }), threeOf({ sector: 10, ring: 'S', points: 10 })],
        finishDart: { sector: 20, ring: 'D', points: 40 } },
      { name: '121 straight-out, 3 filler visits of S9 then D20 finish (b)', checkOut: 'straight', startingScore: 121,
        visits: [
          threeOf({ sector: 9, ring: 'S', points: 9 }),
          threeOf({ sector: 9, ring: 'S', points: 9 }),
          threeOf({ sector: 9, ring: 'S', points: 9 }),
        ],
        finishDart: { sector: 20, ring: 'D', points: 40 } },
      { name: '170 master-out, 4 filler visits of S10 then double-bull finish (b)', checkOut: 'master', startingScore: 170,
        visits: [
          threeOf({ sector: 10, ring: 'S', points: 10 }),
          threeOf({ sector: 10, ring: 'S', points: 10 }),
          threeOf({ sector: 10, ring: 'S', points: 10 }),
          threeOf({ sector: 10, ring: 'S', points: 10 }),
        ],
        finishDart: { sector: 25, ring: 'IB', points: 50 } },
      { name: '40 double-out, 3 filler visits of S2 then D11 finish', checkOut: 'double', startingScore: 40,
        visits: [
          threeOf({ sector: 2, ring: 'S', points: 2 }),
          threeOf({ sector: 2, ring: 'S', points: 2 }),
          threeOf({ sector: 2, ring: 'S', points: 2 }),
        ],
        finishDart: { sector: 11, ring: 'D', points: 22 } },
      { name: '60 straight-out, 3 filler visits of S3 then T11 finish', checkOut: 'straight', startingScore: 60,
        visits: [
          threeOf({ sector: 3, ring: 'S', points: 3 }),
          threeOf({ sector: 3, ring: 'S', points: 3 }),
          threeOf({ sector: 3, ring: 'S', points: 3 }),
        ],
        finishDart: { sector: 11, ring: 'T', points: 33 } },
      { name: '80 master-out, 3 filler visits of S8 then D4 finish', checkOut: 'master', startingScore: 80,
        visits: [
          threeOf({ sector: 8, ring: 'S', points: 8 }),
          threeOf({ sector: 8, ring: 'S', points: 8 }),
          threeOf({ sector: 8, ring: 'S', points: 8 }),
        ],
        finishDart: { sector: 4, ring: 'D', points: 8 } },
      { name: '100 double-out, 3 filler visits of S8 then D14 finish', checkOut: 'double', startingScore: 100,
        visits: [
          threeOf({ sector: 8, ring: 'S', points: 8 }),
          threeOf({ sector: 8, ring: 'S', points: 8 }),
          threeOf({ sector: 8, ring: 'S', points: 8 }),
        ],
        finishDart: { sector: 14, ring: 'D', points: 28 } },
      { name: '121 straight-out, 3 filler visits of S9 then D20 finish (c)', checkOut: 'straight', startingScore: 121,
        visits: [
          threeOf({ sector: 9, ring: 'S', points: 9 }),
          threeOf({ sector: 9, ring: 'S', points: 9 }),
          threeOf({ sector: 9, ring: 'S', points: 9 }),
        ],
        finishDart: { sector: 20, ring: 'D', points: 40 } },
      { name: '170 master-out, 4 filler visits of S10 then double-bull finish (c)', checkOut: 'master', startingScore: 170,
        visits: [
          threeOf({ sector: 10, ring: 'S', points: 10 }),
          threeOf({ sector: 10, ring: 'S', points: 10 }),
          threeOf({ sector: 10, ring: 'S', points: 10 }),
          threeOf({ sector: 10, ring: 'S', points: 10 }),
        ],
        finishDart: { sector: 25, ring: 'IB', points: 50 } },
      { name: '40 double-out, 4 filler visits of S2 then D8 finish', checkOut: 'double', startingScore: 40,
        visits: [
          threeOf({ sector: 2, ring: 'S', points: 2 }),
          threeOf({ sector: 2, ring: 'S', points: 2 }),
          threeOf({ sector: 2, ring: 'S', points: 2 }),
          threeOf({ sector: 2, ring: 'S', points: 2 }),
        ],
        finishDart: { sector: 8, ring: 'D', points: 16 } },
      { name: '60 straight-out, 4 filler visits of S2 then T12 finish', checkOut: 'straight', startingScore: 60,
        visits: [
          threeOf({ sector: 2, ring: 'S', points: 2 }),
          threeOf({ sector: 2, ring: 'S', points: 2 }),
          threeOf({ sector: 2, ring: 'S', points: 2 }),
          threeOf({ sector: 2, ring: 'S', points: 2 }),
        ],
        finishDart: { sector: 12, ring: 'T', points: 36 } },
    ];

    it.each(fixtures)('replays leg: $name', ({ checkOut, startingScore, visits, finishDart }) => {
      const state = replayLeg(checkOut, startingScore, visits, finishDart);
      expect(state.legsWon[player1]).toBe(1);
      expect(state.playerScores[player1]).toBe(X01DefaultSettings.startingScore);
    });
  });

  describe('sets', () => {
    // Checks out from 170 in one 3-dart visit (T20, T20, IB) — the same fixture used by the
    // existing "match completion" test above.
    function checkoutFrom170(state: ReturnType<typeof init>, settings: typeof X01DefaultSettings) {
      state = { ...state, playerScores: { ...state.playerScores, [state.players[state.currentPlayerIndex]]: 170 } };
      const throw1 = { sector: 20 as const, ring: 'T' as const, points: 60, order: 0 as const };
      const throw2 = { sector: 20 as const, ring: 'T' as const, points: 60, order: 1 as const };
      const throw3 = { sector: 25 as const, ring: 'IB' as const, points: 50, order: 2 as const };
      state = applyThrow(state, throw1, settings);
      state = applyThrow(state, throw2, settings);
      state = applyThrow(state, throw3, settings);
      return state;
    }

    it('settings.sets = 0 (default) never populates setsWon — legs alone decide the match', () => {
      const settings = { ...X01DefaultSettings, firstTo: 1, sets: 0 };
      let state = init([player1, player2], settings);
      state = checkoutFrom170(state, settings);

      expect(isComplete(state)).toBe(true);
      expect(winner(state)).toBe(player1);
      expect(state.setsWon[player1]).toBe(0);
      expect(state.currentSetNumber).toBe(1);
    });

    it('winning a set (without reaching settings.sets) resets legs, keeps the match open, and advances the set number', () => {
      const settings = { ...X01DefaultSettings, firstTo: 1, sets: 2 };
      let state = init([player1, player2], settings);
      state = checkoutFrom170(state, settings);

      expect(isComplete(state)).toBe(false);
      expect(winner(state)).toBe(null);
      expect(state.setsWon[player1]).toBe(1);
      expect(state.setsWon[player2]).toBe(0);
      expect(state.currentSetNumber).toBe(2);
      expect(state.legsWon[player1]).toBe(0);
      expect(state.legsWon[player2]).toBe(0);
      expect(state.currentLegNumber).toBe(1);
      expect(state.playerScores[player1]).toBe(X01DefaultSettings.startingScore);
      // Turn passes on, same as an ordinary new leg.
      expect(state.players[state.currentPlayerIndex]).toBe(player2);
    });

    it('reaching settings.sets completes the match', () => {
      const settings = { ...X01DefaultSettings, firstTo: 1, sets: 2 };
      let state = init([player1, player2], settings);
      state = checkoutFrom170(state, settings); // player1 wins set 1, turn passes to player2

      // Force it back to player1's turn so player1 can win set 2 as well — a plain test-setup
      // mutation on the returned state, same convention the "match completion" test above uses.
      state = { ...state, currentPlayerIndex: state.players.indexOf(player1) };
      state = checkoutFrom170(state, settings); // player1 wins set 2 -> reaches settings.sets

      expect(isComplete(state)).toBe(true);
      expect(winner(state)).toBe(player1);
      expect(state.setsWon[player1]).toBe(2);
    });

    it('undo reverts a set-winning checkout, restoring legs, sets, and set number', () => {
      const settings = { ...X01DefaultSettings, firstTo: 1, sets: 2 };
      let state = init([player1, player2], settings);
      state = checkoutFrom170(state, settings);

      const undone = undo(state);

      expect(undone.setsWon[player1]).toBe(0);
      expect(undone.currentSetNumber).toBe(1);
      expect(undone.legsWon[player1]).toBe(0);
      expect(undone.currentLegNumber).toBe(1);
      expect(undone.matchComplete).toBe(false);
      expect(undone.players[undone.currentPlayerIndex]).toBe(player1);
    });
  });
});
