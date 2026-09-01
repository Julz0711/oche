// lib/games/x01/engine.test.ts
import { describe, it, expect } from 'vitest';
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
    });

    it('recognizes a checkout on the first dart of a visit (leg ends mid-visit, remaining darts not thrown)', () => {
      const state = init([player1, player2], { ...X01DefaultSettings, checkOut: 'double' });
      state.playerScores[player1] = 40;

      const throw1 = { sector: 20 as const, ring: 'D' as const, points: 40, order: 0 as const }; // D20 finishes immediately

      const after = applyThrow(state, throw1, X01DefaultSettings);

      expect(after.legsWon[player1]).toBe(1);
      expect(after.currentVisit).toHaveLength(0); // remaining darts never thrown
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
    });

    // Known gap (tracked in the SDD ledger, not fixed in this task): isValidCheckout only
    // recognizes ring 'D' as a double, so a double-bullseye finish (ring 'IB') is currently
    // NOT recognized as a valid double-out. This is a pending fix, not something to work
    // around here.
    it.todo('recognizes double-bullseye (ring "IB") as a valid double-out finish — known gap, see ledger');
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
      const throw3 = { sector: 25 as const, ring: 'D' as const, points: 50, order: 2 as const }; // 170-60-60-50=0, double out

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
});
