// lib/games/cricket/engine.test.ts
import { describe, it, expect } from 'vitest';
import { init, applyThrow, undo, isComplete, winner, marksForThrow } from './engine';
import { createPlayerId } from '@/lib/types';
import { CricketDefaultSettings } from './schema';

const player1 = createPlayerId('p1');
const player2 = createPlayerId('p2');
const dart = (sector: number, ring: 'S' | 'D' | 'T' | 'OB' | 'IB' | 'M', order: 0 | 1 | 2 = 0) => ({
  sector: sector as any,
  ring,
  points: 0, // always ignored by applyThrow — never a meaningful input
  order,
});

describe('marksForThrow', () => {
  it('maps single/double/treble on a cricket number to 1/2/3 marks', () => {
    expect(marksForThrow(20, 'S')).toEqual({ number: 20, marks: 1 });
    expect(marksForThrow(20, 'D')).toEqual({ number: 20, marks: 2 });
    expect(marksForThrow(20, 'T')).toEqual({ number: 20, marks: 3 });
  });

  it('maps outer/inner bull to 1/2 marks on bull', () => {
    expect(marksForThrow(25, 'OB')).toEqual({ number: 'bull', marks: 1 });
    expect(marksForThrow(25, 'IB')).toEqual({ number: 'bull', marks: 2 });
  });

  it('returns null for non-cricket sectors and misses', () => {
    expect(marksForThrow(14, 'S')).toBe(null);
    expect(marksForThrow(1, 'T')).toBe(null);
    expect(marksForThrow(0, 'M')).toBe(null);
  });
});

describe('applyThrow: marks and closing', () => {
  it('a single hit on an open number applies 1 mark and scores nothing', () => {
    const state = init([player1, player2], CricketDefaultSettings);
    const after = applyThrow(state, dart(20, 'S'), CricketDefaultSettings);
    expect(after.marks[player1][20]).toBe(1);
    expect(after.points[player1]).toBe(0);
  });

  it('three single hits close a number with no overflow — no points scored', () => {
    let state = init([player1, player2], CricketDefaultSettings);
    state = applyThrow(state, dart(20, 'S', 0), CricketDefaultSettings);
    state = applyThrow(state, dart(20, 'S', 1), CricketDefaultSettings);
    state = applyThrow(state, dart(20, 'S', 2), CricketDefaultSettings);
    expect(state.marks[player1][20]).toBe(3);
    expect(state.points[player1]).toBe(0);
  });

  it('a treble on an open number closes it with 0 overflow — no points scored', () => {
    const state = init([player1, player2], CricketDefaultSettings);
    const after = applyThrow(state, dart(20, 'T'), CricketDefaultSettings);
    expect(after.marks[player1][20]).toBe(3);
    expect(after.points[player1]).toBe(0);
  });

  it('a treble on a number already at 2 marks closes it and scores the overflow', () => {
    let state = init([player1, player2], CricketDefaultSettings);
    state = applyThrow(state, dart(19, 'D'), CricketDefaultSettings); // 2 marks, still open
    // Closing needs only 1 more mark; the treble contributes 3, so 2 of them overflow.
    state = applyThrow(state, dart(19, 'T'), CricketDefaultSettings);
    expect(state.marks[player1][19]).toBe(3);
    expect(state.points[player1]).toBe(38); // 2 overflow marks * face value 19
  });

  it('hitting a number you have already closed scores full overflow while an opponent still has it open', () => {
    let state = init([player1, player2], CricketDefaultSettings);
    // player1's full visit: closes 18, then two harmless misses (a visit is always 3 darts)
    state = applyThrow(state, dart(18, 'T', 0), CricketDefaultSettings);
    state = applyThrow(state, dart(1, 'M', 1), CricketDefaultSettings);
    state = applyThrow(state, dart(1, 'M', 2), CricketDefaultSettings); // visit ends, turn passes to player2
    // player2's full visit: does nothing relevant
    state = applyThrow(state, dart(1, 'M', 0), CricketDefaultSettings);
    state = applyThrow(state, dart(1, 'M', 1), CricketDefaultSettings);
    state = applyThrow(state, dart(1, 'M', 2), CricketDefaultSettings); // visit ends, turn passes back to player1
    // player1 hits 18 again: already closed, player2 hasn't touched it, so both marks are pure overflow
    state = applyThrow(state, dart(18, 'D', 0), CricketDefaultSettings);
    expect(state.points[player1]).toBe(18 * 2);
  });

  it('scores nothing once every player has closed the number (it is dead)', () => {
    let state = init([player1, player2], CricketDefaultSettings);
    // player1's full visit: closes 17
    state = applyThrow(state, dart(17, 'T', 0), CricketDefaultSettings);
    state = applyThrow(state, dart(1, 'M', 1), CricketDefaultSettings);
    state = applyThrow(state, dart(1, 'M', 2), CricketDefaultSettings); // visit ends, turn passes to player2
    // player2's full visit: closes 17 too, exactly (no overflow either way)
    state = applyThrow(state, dart(17, 'T', 0), CricketDefaultSettings);
    state = applyThrow(state, dart(1, 'M', 1), CricketDefaultSettings);
    state = applyThrow(state, dart(1, 'M', 2), CricketDefaultSettings); // visit ends, turn passes back to player1
    // player1 hits 17 again: both players have now closed it — it's dead, scores nothing
    state = applyThrow(state, dart(17, 'D', 0), CricketDefaultSettings);
    expect(state.points[player1]).toBe(0);
  });

  it('outer bull scores overflow at face value 25, inner bull at 25 per mark', () => {
    let state = init([player1, player2], CricketDefaultSettings);
    // player1's visit 1: closes bull exactly via three outer bulls (0 overflow, 0 points)
    state = applyThrow(state, dart(25, 'OB', 0), CricketDefaultSettings);
    state = applyThrow(state, dart(25, 'OB', 1), CricketDefaultSettings);
    state = applyThrow(state, dart(25, 'OB', 2), CricketDefaultSettings);
    // player2's visit 1: passes
    state = applyThrow(state, dart(1, 'M', 0), CricketDefaultSettings);
    state = applyThrow(state, dart(1, 'M', 1), CricketDefaultSettings);
    state = applyThrow(state, dart(1, 'M', 2), CricketDefaultSettings);
    // player1's visit 2: bull is already closed and player2 hasn't touched it, so both darts are
    // pure overflow — an outer bull (1 mark) scores 25, an inner bull (2 marks) scores 50
    state = applyThrow(state, dart(25, 'OB', 0), CricketDefaultSettings);
    state = applyThrow(state, dart(25, 'IB', 1), CricketDefaultSettings);
    expect(state.marks[player1].bull).toBe(3);
    expect(state.points[player1]).toBe(75); // 25 + 50
  });

  it('a throw on a non-cricket sector or a miss applies no marks and scores nothing', () => {
    const state = init([player1, player2], CricketDefaultSettings);
    const after = applyThrow(state, dart(5, 'T'), CricketDefaultSettings);
    expect(after.points[player1]).toBe(0);
    expect(after.currentVisit).toHaveLength(1); // still a legal, recorded dart
  });

  it('ignores a forged points value — the real score is derived from sector+ring+state', () => {
    let state = init([player1, player2], CricketDefaultSettings);
    state = applyThrow(state, dart(16, 'T'), CricketDefaultSettings); // real score: 0 (closes, no overflow)
    const forged = { sector: 16 as const, ring: 'D' as const, points: 999, order: 1 as const };
    state = applyThrow(state, forged, CricketDefaultSettings); // 2 more marks, all overflow: 16*2
    expect(state.points[player1]).toBe(32);
  });
});

describe('leg and match completion', () => {
  it('closing all 7 numbers without a points lead does not end the leg', () => {
    let state = init([player1, player2], CricketDefaultSettings);
    // player1's visit 1: closes 20, 19, 18 with exact trebles (no overflow, no points)
    state = applyThrow(state, dart(20, 'T', 0), CricketDefaultSettings);
    state = applyThrow(state, dart(19, 'T', 1), CricketDefaultSettings);
    state = applyThrow(state, dart(18, 'T', 2), CricketDefaultSettings);
    // player2's visit 1: closes 17, then immediately overflows it for 34 points (player1 hasn't
    // touched 17 yet, so it's still open)
    state = applyThrow(state, dart(17, 'T', 0), CricketDefaultSettings);
    state = applyThrow(state, dart(17, 'D', 1), CricketDefaultSettings);
    state = applyThrow(state, dart(1, 'M', 2), CricketDefaultSettings);
    expect(state.points[player2]).toBe(34); // 2 overflow marks * face value 17
    // player1's visit 2: closes 17 (already dead since player2 closed it — 0 points), then 16, 15
    state = applyThrow(state, dart(17, 'T', 0), CricketDefaultSettings);
    state = applyThrow(state, dart(16, 'T', 1), CricketDefaultSettings);
    state = applyThrow(state, dart(15, 'T', 2), CricketDefaultSettings);
    // player2's visit 2: passes
    state = applyThrow(state, dart(1, 'M', 0), CricketDefaultSettings);
    state = applyThrow(state, dart(1, 'M', 1), CricketDefaultSettings);
    state = applyThrow(state, dart(1, 'M', 2), CricketDefaultSettings);
    // player1's visit 3: closes bull with 1 overflow (25 points) — closes all 7, but 25 < player2's
    // 34, so the leg does not end
    state = applyThrow(state, dart(25, 'OB', 0), CricketDefaultSettings);
    state = applyThrow(state, dart(25, 'OB', 1), CricketDefaultSettings);
    state = applyThrow(state, dart(25, 'IB', 2), CricketDefaultSettings);
    expect(state.points[player1]).toBe(25);
    expect(isComplete(state)).toBe(false);
  });

  it('closing all 7 numbers with a points lead ends the leg and increments legsWon', () => {
    let state = init([player1, player2], CricketDefaultSettings);
    state = applyThrow(state, dart(20, 'T', 0), CricketDefaultSettings);
    state = applyThrow(state, dart(19, 'T', 1), CricketDefaultSettings);
    state = applyThrow(state, dart(18, 'T', 2), CricketDefaultSettings);
    state = applyThrow(state, dart(1, 'M', 0), CricketDefaultSettings);
    state = applyThrow(state, dart(1, 'M', 1), CricketDefaultSettings);
    state = applyThrow(state, dart(1, 'M', 2), CricketDefaultSettings);
    state = applyThrow(state, dart(17, 'T', 0), CricketDefaultSettings);
    state = applyThrow(state, dart(16, 'T', 1), CricketDefaultSettings);
    state = applyThrow(state, dart(15, 'T', 2), CricketDefaultSettings);
    state = applyThrow(state, dart(1, 'M', 0), CricketDefaultSettings);
    state = applyThrow(state, dart(1, 'M', 1), CricketDefaultSettings);
    state = applyThrow(state, dart(1, 'M', 2), CricketDefaultSettings);
    // player1 closes bull with exact outer-bull hits — no overflow anywhere, stays tied 0-0 with
    // player2, which is enough to win (the rule is "points >= every opponent", not "strictly more")
    state = applyThrow(state, dart(25, 'OB', 0), CricketDefaultSettings);
    state = applyThrow(state, dart(25, 'OB', 1), CricketDefaultSettings);
    state = applyThrow(state, dart(25, 'OB', 2), CricketDefaultSettings);
    expect(state.legsWon[player1]).toBe(1);
    expect(state.currentLegNumber).toBe(2);
    expect(state.points[player1]).toBe(0); // reset for the new leg
    expect(isComplete(state)).toBe(false); // firstTo is 3
  });

  it('winning the firstTo-th leg completes the match', () => {
    const settings = { firstTo: 1 };
    let state = init([player1, player2], settings);
    state = applyThrow(state, dart(20, 'T', 0), settings);
    state = applyThrow(state, dart(19, 'T', 1), settings);
    state = applyThrow(state, dart(18, 'T', 2), settings);
    state = applyThrow(state, dart(1, 'M', 0), settings);
    state = applyThrow(state, dart(1, 'M', 1), settings);
    state = applyThrow(state, dart(1, 'M', 2), settings);
    state = applyThrow(state, dart(17, 'T', 0), settings);
    state = applyThrow(state, dart(16, 'T', 1), settings);
    state = applyThrow(state, dart(15, 'T', 2), settings);
    state = applyThrow(state, dart(1, 'M', 0), settings);
    state = applyThrow(state, dart(1, 'M', 1), settings);
    state = applyThrow(state, dart(1, 'M', 2), settings);
    state = applyThrow(state, dart(25, 'OB', 0), settings);
    state = applyThrow(state, dart(25, 'OB', 1), settings);
    state = applyThrow(state, dart(25, 'OB', 2), settings); // closes bull tied 0-0, and firstTo is 1
    expect(isComplete(state)).toBe(true);
    expect(winner(state)).toBe(player1);
  });
});

describe('undo', () => {
  it('restores marks, points, and turn to the pre-visit snapshot', () => {
    let state = init([player1, player2], CricketDefaultSettings);
    const beforeVisit = state;
    state = applyThrow(state, dart(20, 'T', 0), CricketDefaultSettings);
    state = applyThrow(state, dart(1, 'M', 1), CricketDefaultSettings);
    state = applyThrow(state, dart(1, 'M', 2), CricketDefaultSettings); // completes player1's 3-dart visit
    const undone = undo(state);
    expect(undone.marks[player1][20]).toBe(beforeVisit.marks[player1][20]);
    expect(undone.currentPlayerIndex).toBe(0);
  });

  it('is a no-op on a fresh match with no visits yet', () => {
    const state = init([player1, player2], CricketDefaultSettings);
    expect(undo(state)).toEqual(state);
  });
});
