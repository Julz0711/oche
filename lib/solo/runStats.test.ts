import { describe, it, expect } from 'vitest';
import { aggregateRuns, runHeatmap, EMPTY_SOLO_STATS, type RunView } from './runStats';
import type { Hit, Run, RoundResult } from '@/lib/games/roguelike/types';

const hit = (ring: Hit['ring'], sector: number): Hit => ({ ring, sector });

/** A round result carrying one visit of the given darts. `board` is the physical points the
 *  visit was worth; `score` is what it counted for after charms, as the engine reports them. */
function round(hits: Hit[], { board = 0, score = 0, won = false, coins = 0 } = {}): RoundResult {
  return {
    index: 0,
    target: 100,
    standardTarget: 100,
    score,
    darts: hits.length,
    won,
    coins,
    visits: [{ hits, board, base: board, bonus: 0, mult: 1, amplifier: 1, score, effects: [] }],
  };
}

function view(results: RoundResult[], extra: Partial<RunView> & { phase?: Run['phase'] } = {}): RunView {
  const { phase = 'lost', homes, houses, ...rest } = extra;
  return {
    run: { phase, results, darts: [], charms: [], consumables: [], shop: { purchases: 0, consumablePurchases: 0 } } as unknown as Run,
    homes: homes ?? results.map(() => 20),
    houses: houses ?? results.map(() => 19),
    ...rest,
  };
}

describe('runHeatmap', () => {
  it('keys hits the way every other board in the app does, misses included', () => {
    const run = { results: [round([hit('T', 20), hit('T', 20), hit('D', 16), hit('IB', 25), hit('M', 0)])], round: { visits: [] } } as unknown as Run;
    expect(runHeatmap(run)).toEqual({ T20: 2, D16: 1, IB25: 1, M0: 1 });
  });

  // A run still in progress has darts in the live round that haven't been folded into `results`
  // yet; leaving them out would show an empty board mid-run.
  it('includes the round still being played', () => {
    const run = {
      results: [{ ...round([hit('S', 5)]), index: 0 }],
      round: { index: 1, visits: [{ hits: [hit('T', 19)] }] },
    } as unknown as Run;
    expect(runHeatmap(run)).toEqual({ S5: 1, T19: 1 });
  });

  // The engine only swaps `run.round` out on the next round's "next" action, so a resolved round
  // sits in BOTH `results` and `round` through the shop and at the end of a run — which is
  // exactly when the summary screen draws this board.
  it('does not count a resolved round twice while it is still the live round', () => {
    const visits = [{ hits: [hit('T', 20), hit('T', 20)] }];
    const run = {
      phase: 'won',
      results: [{ ...round([hit('T', 20), hit('T', 20)]), index: 3 }],
      round: { index: 3, visits },
    } as unknown as Run;
    expect(runHeatmap(run)).toEqual({ T20: 2 });
  });
});

describe('aggregateRuns', () => {
  it('has nothing to report before any runs are saved', () => {
    expect(aggregateRuns([])).toEqual(EMPTY_SOLO_STATS);
  });

  it('counts runs, wins and rounds cleared across every saved run', () => {
    const stats = aggregateRuns([
      view([round([hit('S', 1)], { won: true }), round([hit('S', 1)], { won: true })], { phase: 'won' }),
      view([round([hit('S', 1)], { won: true }), round([hit('S', 1)])], { phase: 'lost' }),
    ]);
    expect(stats.runs).toBe(2);
    expect(stats.wins).toBe(1);
    expect(stats.winRate).toBe(50);
    expect(stats.roundsCleared).toBe(3);
    expect(stats.furthestRound).toBe(2);
  });

  // Weighted by darts across every run, not the mean of each run's own average, so one three-dart
  // run can't swing the number as far as a long one.
  it('averages board points over all darts, not over runs', () => {
    const stats = aggregateRuns([
      view([round([hit('T', 20), hit('T', 20), hit('T', 20)], { board: 180 })]),
      view([round([hit('S', 3)], { board: 3 })]),
    ]);
    expect(stats.darts).toBe(4);
    expect(stats.boardAverage).toBe(137.3); // (180 + 3) / 4 * 3
  });

  it('reports the best single visit and the best whole run', () => {
    const stats = aggregateRuns([
      view([round([hit('S', 1)], { score: 40 }), round([hit('S', 1)], { score: 50 })]),
      view([round([hit('S', 1)], { score: 70 })]),
    ]);
    expect(stats.bestVisit).toBe(70);
    expect(stats.bestRun).toBe(90); // 40 + 50 beats the single 70-point run
  });

  it('rates accuracy against darts thrown, counting misses', () => {
    const stats = aggregateRuns([
      view([round([hit('T', 20), hit('D', 10), hit('S', 5), hit('M', 0)])]),
    ]);
    expect(stats.hitRate).toBe(75); // 3 of 4 landed
    expect(stats.trebleRate).toBe(25);
    expect(stats.doubleRate).toBe(25);
  });

  // The house number changes every round and the home number is chosen per round, so both rates
  // have to be judged round by round rather than against one number for the whole run.
  it('judges house and home hits per round, not per run', () => {
    const stats = aggregateRuns([
      view(
        [round([hit('S', 19), hit('S', 20)]), round([hit('S', 7), hit('S', 7)])],
        { houses: [19, 7], homes: [20, 1] }
      ),
    ]);
    expect(stats.houseHitRate).toBe(75); // S19 in round one, both 7s in round two
    expect(stats.homeHitRate).toBe(25); // only the S20 in round one
  });

  it('sums coins earned and the items runs ended holding', () => {
    const winner = view([round([hit('S', 1)], { coins: 6 }), round([hit('S', 1)], { coins: 4 })]);
    winner.run = { ...winner.run, charms: [{ id: 31, paid: 5 }], darts: [{ id: 12, paid: 3 }, null] } as unknown as Run;
    const other = view([round([hit('S', 1)], { coins: 2 })]);
    other.run = { ...other.run, charms: [{ id: 31, paid: 5 }], darts: [] } as unknown as Run;

    const stats = aggregateRuns([winner, other]);
    expect(stats.coinsEarned).toBe(12);
    expect(stats.topItems[0]).toEqual({ id: 31, count: 2 });
    expect(stats.topItems.map(entry => entry.id)).toContain(12);
  });

  // Same overlap as the heatmap: the live round counts while it's unresolved, and stops counting
  // the moment its result lands, rather than being tallied from both places.
  it('counts the round in progress once, against its own house and home numbers', () => {
    const inProgress = view([], { homes: [], houses: [] });
    inProgress.run = {
      ...inProgress.run,
      phase: 'playing',
      round: { index: 0, house: 11, home: 3, visits: [{ hits: [hit('S', 11), hit('S', 3)], board: 14, score: 14 }] },
    } as unknown as Run;
    const stats = aggregateRuns([inProgress]);
    expect(stats.darts).toBe(2);
    expect(stats.houseHitRate).toBe(50);
    expect(stats.homeHitRate).toBe(50);

    const resolved = view([round([hit('S', 11), hit('S', 3)], { board: 14 })], { houses: [11], homes: [3] });
    resolved.run = { ...resolved.run, round: { index: 0, house: 11, home: 3, visits: [{ hits: [hit('S', 11), hit('S', 3)] }] } } as unknown as Run;
    expect(aggregateRuns([resolved]).darts).toBe(2);
  });

  it('builds one heatmap from every dart of every run', () => {
    const stats = aggregateRuns([
      view([round([hit('T', 20), hit('M', 0)])]),
      view([round([hit('T', 20)])]),
    ]);
    expect(stats.heatmap).toEqual({ T20: 2, M0: 1 });
  });
});
