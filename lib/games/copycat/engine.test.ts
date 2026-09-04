// lib/games/copycat/engine.test.ts
import { describe, it, expect } from 'vitest';
import { init, applyThrow, undo, isComplete, winner } from './engine';
import { createPlayerId } from '@/lib/types';
import { CopycatDefaultSettings } from './schema';

describe('Copycat Engine', () => {
  const player1 = createPlayerId('p1');
  const player2 = createPlayerId('p2');
  const player3 = createPlayerId('p3');

  function throwVisit(sector: number, ring: 'S' | 'D' | 'T' | 'M' | 'OB' | 'IB', times = 1) {
    return Array.from({ length: times }, (_, i) => ({
      sector: sector as any,
      ring,
      points: 0,
      order: i as any,
    }));
  }

  describe('init', () => {
    it('starts every player at 0 points, no target, player 1 first by default', () => {
      const state = init([player1, player2], CopycatDefaultSettings);
      expect(state.pointsWon[player1]).toBe(0);
      expect(state.pointsWon[player2]).toBe(0);
      expect(state.target).toBe(null);
      expect(state.currentPlayerIndex).toBe(0);
      expect(state.currentPointNumber).toBe(1);
    });

    it("'player1', 'bulloff', and 'alternate' all default to index 0 — matching X01's own depth", () => {
      for (const firstThrow of ['player1', 'bulloff', 'alternate'] as const) {
        const state = init([player1, player2], { ...CopycatDefaultSettings, firstThrow });
        expect(state.currentPlayerIndex).toBe(0);
      }
    });
  });

  describe('the first visit of a new point', () => {
    it('sets the target unconditionally, whatever the total', () => {
      let state = init([player1, player2], CopycatDefaultSettings);
      // T20 x3 = 180
      for (const t of throwVisit(20, 'T', 3)) state = applyThrow(state, t, CopycatDefaultSettings);
      expect(state.target).toBe(180);
      expect(state.pointsWon[player1]).toBe(0); // no point — nothing to match yet
      expect(state.players[state.currentPlayerIndex]).toBe(player2); // turn advances normally
    });
  });

  describe('a non-matching visit', () => {
    it('becomes the new target; turn advances normally', () => {
      let state = init([player1, player2], CopycatDefaultSettings);
      for (const t of throwVisit(20, 'T', 3)) state = applyThrow(state, t, CopycatDefaultSettings); // target = 180
      for (const t of throwVisit(5, 'S', 3)) state = applyThrow(state, t, CopycatDefaultSettings); // player2 throws 15, no match
      expect(state.target).toBe(15);
      expect(state.pointsWon[player1]).toBe(0);
      expect(state.pointsWon[player2]).toBe(0);
      expect(state.players[state.currentPlayerIndex]).toBe(player1);
    });
  });

  describe('a matching visit, not on match-point', () => {
    it('scores the point immediately; the winner leads next (does not advance)', () => {
      const settings = { ...CopycatDefaultSettings, firstTo: 5 as const };
      let state = init([player1, player2], settings);
      for (const t of throwVisit(20, 'S', 3)) state = applyThrow(state, t, settings); // target = 60
      for (const t of throwVisit(20, 'S', 3)) state = applyThrow(state, t, settings); // player2 matches 60

      expect(state.pointsWon[player2]).toBe(1);
      expect(isComplete(state)).toBe(false);
      expect(state.target).toBe(null); // reset for the winner's unconditional lead
      expect(state.players[state.currentPlayerIndex]).toBe(player2); // winner leads next, doesn't advance
      expect(state.currentPointNumber).toBe(2);
    });
  });

  describe('match-point', () => {
    it('a matching visit that finishes on a double wins the point and the match', () => {
      const settings = { ...CopycatDefaultSettings, firstTo: 3 as const };
      let state = init([player1, player2], settings);
      state = { ...state, pointsWon: { ...state.pointsWon, [player1]: 2 } }; // player1 on match-point

      for (const t of throwVisit(10, 'S', 3)) state = applyThrow(state, t, settings); // target = 30
      // player2 throws something that doesn't matter for this scenario — advance to player1's turn
      for (const t of throwVisit(1, 'S', 3)) state = applyThrow(state, t, settings); // target = 3, no match, back to player1...
      // Simpler: reset target directly to exercise player1's match-point attempt in isolation.
      state = { ...state, target: 40, currentPlayerIndex: 0 };
      // player1 throws D20, D20, D... need total 40 with a double last dart: D20 (40) in one dart,
      // then two "safe" non-scoring darts aren't possible (every dart adds to the total) — so
      // finish with the double as dart 3 and low-value darts before it: S1, S1, D19 = 1+1+38 = 40.
      state = applyThrow(state, { sector: 1 as any, ring: 'S', points: 0, order: 0 as any }, settings);
      state = applyThrow(state, { sector: 1 as any, ring: 'S', points: 0, order: 1 as any }, settings);
      state = applyThrow(state, { sector: 19 as any, ring: 'D', points: 0, order: 2 as any }, settings);

      expect(state.pointsWon[player1]).toBe(3);
      expect(isComplete(state)).toBe(true);
      expect(winner(state)).toBe(player1);
    });

    it('a matching visit on match-point WITHOUT a qualifying finish does not win — chase continues', () => {
      const settings = { ...CopycatDefaultSettings, firstTo: 3 as const };
      let state = init([player1, player2], settings);
      state = { ...state, pointsWon: { ...state.pointsWon, [player1]: 2 }, target: 40, currentPlayerIndex: 0 };

      // player1 matches 40 but the last dart is a single, not a double: S20, S19, S1 = 20+19+1 = 40
      state = applyThrow(state, { sector: 20 as any, ring: 'S', points: 0, order: 0 as any }, settings);
      state = applyThrow(state, { sector: 19 as any, ring: 'S', points: 0, order: 1 as any }, settings);
      state = applyThrow(state, { sector: 1 as any, ring: 'S', points: 0, order: 2 as any }, settings);

      expect(state.pointsWon[player1]).toBe(2); // unchanged — did not count
      expect(isComplete(state)).toBe(false);
      expect(state.target).toBe(40); // the (non-qualifying) match total becomes the new target
      expect(state.players[state.currentPlayerIndex]).toBe(player2); // turn advances normally, not a "win"
    });
  });

  describe('undo', () => {
    it('reverts a chase-continuation visit to its exact pre-visit state', () => {
      let state = init([player1, player2], CopycatDefaultSettings);
      for (const t of throwVisit(20, 'T', 3)) state = applyThrow(state, t, CopycatDefaultSettings); // target = 180

      const undone = undo(state);
      expect(undone.target).toBe(null);
      expect(undone.players[undone.currentPlayerIndex]).toBe(player1);
      expect(undone.visitHistory.length).toBe(0);
    });

    it('reverts a point-winning visit, including match completion', () => {
      const settings = { ...CopycatDefaultSettings, firstTo: 1 as const };
      let state = init([player1, player2], settings);
      for (const t of throwVisit(20, 'S', 3)) state = applyThrow(state, t, settings); // target = 60
      // player2 matches with double finish (S10, S10, D20 = 10+10+40 = 60)
      state = applyThrow(state, { sector: 10 as any, ring: 'S', points: 0, order: 0 as any }, settings);
      state = applyThrow(state, { sector: 10 as any, ring: 'S', points: 0, order: 1 as any }, settings);
      state = applyThrow(state, { sector: 20 as any, ring: 'D', points: 0, order: 2 as any }, settings);

      expect(isComplete(state)).toBe(true);

      const undone = undo(state);
      expect(isComplete(undone)).toBe(false);
      expect(undone.pointsWon[player2]).toBe(0);
      expect(undone.target).toBe(60);
      expect(undone.players[undone.currentPlayerIndex]).toBe(player2); // back to player2's matching attempt
    });
  });

  describe('3-player rotation', () => {
    it('after a point is won by a non-first player, they genuinely lead next (not just +1)', () => {
      const settings = { ...CopycatDefaultSettings, firstTo: 5 as const };
      let state = init([player1, player2, player3], settings);
      // player1 leads: target = 60
      for (const t of throwVisit(20, 'S', 3)) state = applyThrow(state, t, settings);
      // player2 doesn't match: target = 15
      for (const t of throwVisit(5, 'S', 3)) state = applyThrow(state, t, settings);
      // player3 matches 15
      for (const t of throwVisit(5, 'S', 3)) state = applyThrow(state, t, settings);

      expect(state.pointsWon[player3]).toBe(1);
      expect(state.players[state.currentPlayerIndex]).toBe(player3); // player3 (index 2) leads next
      expect(state.target).toBe(null);

      // player3's unconditional lead: target = 9
      for (const t of throwVisit(3, 'S', 3)) state = applyThrow(state, t, settings);
      // responder cycle continues in normal order from player3: player1 is next (wraps around)
      expect(state.players[state.currentPlayerIndex]).toBe(player1);
    });
  });
});
