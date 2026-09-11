// lib/solo/runStats.ts
//
// House Rules statistics, derived entirely from the runs saved in this browser. Each save holds
// only `{config, actions}`, so a replay reconstructs the whole run — every dart included — and
// nothing here needs a schema, an API or a migration.
//
// Two things a run's `results` can't tell you on their own, because `RoundResult` doesn't carry
// them: the house number (regenerated per round from the seed) and the home number (chosen per
// round, and only ever stored on the live round). `viewOf` recovers both up front so the
// aggregation below is plain arithmetic over numbers it was handed.
import { houseNumber, replay } from '@/lib/games/roguelike/engine';
import type { Hit, Run, VisitResult } from '@/lib/games/roguelike/types';
import type { RunSave } from './library';

export interface RunView {
  run: Run;
  /** Home number chosen for each round, by round index. */
  homes: number[];
  /** House number the game set for each round, by round index. */
  houses: number[];
}

export interface SoloStats {
  runs: number;
  wins: number;
  winRate: number;
  roundsCleared: number;
  furthestRound: number;
  avgRounds: number;

  darts: number;
  boardAverage: number;
  bestVisit: number;
  bestRun: number;
  hitRate: number;
  trebleRate: number;
  doubleRate: number;

  houseHitRate: number;
  homeHitRate: number;

  coinsEarned: number;
  itemsBought: number;
  /** Items runs most often ended holding, most-held first. */
  topItems: { id: number; count: number }[];

  heatmap: Record<string, number>;
}

export const EMPTY_SOLO_STATS: SoloStats = {
  runs: 0, wins: 0, winRate: 0, roundsCleared: 0, furthestRound: 0, avgRounds: 0,
  darts: 0, boardAverage: 0, bestVisit: 0, bestRun: 0, hitRate: 0, trebleRate: 0, doubleRate: 0,
  houseHitRate: 0, homeHitRate: 0,
  coinsEarned: 0, itemsBought: 0, topItems: [], heatmap: {},
};

const round1 = (value: number) => Math.round(value * 10) / 10;
const percent = (part: number, whole: number) => (whole > 0 ? round1((part / whole) * 100) : 0);

/** Same key shape the rest of the app's boards use (see lib/stats/board.ts): `${ring}${sector}`,
 *  with the fixed `M0` for a miss. */
export function heatmapKey(hit: Hit): string {
  return hit.ring === 'M' ? 'M0' : `${hit.ring}${hit.sector}`;
}

interface CountedRound {
  visits: VisitResult[];
  /** Absent for the live round of a run whose view didn't resolve them. */
  house?: number;
  home?: number;
}

/** Every round whose darts should be counted, each exactly once.
 *
 *  A resolved round is pushed into `results` but stays in `run.round` until the *next* round
 *  starts, so through the shop and at the end of a run the same round appears in both. Matching
 *  on the round index keeps the live round in while it's genuinely unresolved (so a run in
 *  progress isn't shown as empty) without counting it twice once it isn't. */
function countedRounds(run: Run, homes: number[] = [], houses: number[] = []): CountedRound[] {
  const rounds: CountedRound[] = run.results.map((result, index) => ({
    visits: result.visits,
    house: houses[index],
    home: homes[index],
  }));
  const live = run.round;
  if (live && !run.results.some(result => result.index === live.index)) {
    rounds.push({ visits: live.visits ?? [], house: live.house, home: live.home });
  }
  return rounds;
}

export function runHeatmap(run: Run): Record<string, number> {
  const heatmap: Record<string, number> = {};
  for (const round of countedRounds(run)) {
    for (const visit of round.visits) {
      for (const hit of visit.hits) {
        const key = heatmapKey(hit);
        heatmap[key] = (heatmap[key] ?? 0) + 1;
      }
    }
  }
  return heatmap;
}

/** Replay a saved run and recover the per-round numbers the results don't carry. Each round is
 *  opened by its own `start` action, so those actions in order give the home number per round. */
export function viewOf(save: RunSave): RunView {
  const run = replay(save.config, save.actions);
  const homes = save.actions.filter(action => action.type === 'start').map(action => action.home);
  return {
    run,
    homes,
    houses: run.results.map(result => houseNumber(save.config, result.index)),
  };
}

export function aggregateRuns(views: RunView[]): SoloStats {
  if (views.length === 0) return { ...EMPTY_SOLO_STATS };

  let wins = 0, roundsCleared = 0, furthestRound = 0, bestRun = 0;
  let darts = 0, boardPoints = 0, bestVisit = 0;
  let landed = 0, trebles = 0, doubles = 0;
  let houseHits = 0, houseDarts = 0, homeHits = 0, homeDarts = 0;
  let coinsEarned = 0, itemsBought = 0;
  const heatmap: Record<string, number> = {};
  const itemCounts = new Map<number, number>();

  for (const { run, homes, houses } of views) {
    if (run.phase === 'won') wins++;
    furthestRound = Math.max(furthestRound, run.results.length);

    let runScore = 0;
    for (const result of run.results) {
      if (result.won) roundsCleared++;
      runScore += result.score;
      coinsEarned += result.coins;
    }
    bestRun = Math.max(bestRun, runScore);

    // Darts are counted per round so a hit can be judged against that round's own house and home
    // numbers — both change round to round.
    for (const { visits, house, home } of countedRounds(run, homes, houses)) {
      for (const visit of visits) {
        boardPoints += visit.board;
        bestVisit = Math.max(bestVisit, visit.score);
        for (const hit of visit.hits) {
          darts++;
          const key = heatmapKey(hit);
          heatmap[key] = (heatmap[key] ?? 0) + 1;
          if (hit.ring !== 'M') landed++;
          if (hit.ring === 'T') trebles++;
          if (hit.ring === 'D') doubles++;
          // A miss, a bull or an outer bull can never match a 1–20 house/home number, so they
          // correctly count as darts that didn't find the target rather than being excluded.
          if (house !== undefined) { houseDarts++; if (hit.sector === house && hit.ring !== 'M') houseHits++; }
          if (home !== undefined) { homeDarts++; if (hit.sector === home && hit.ring !== 'M') homeHits++; }
        }
      }
    }

    for (const owned of [...run.darts.filter(Boolean), ...run.charms, ...run.consumables]) {
      const id = (owned as { id: number }).id;
      itemCounts.set(id, (itemCounts.get(id) ?? 0) + 1);
    }
    itemsBought += (run.shop?.purchases ?? 0) + (run.shop?.consumablePurchases ?? 0);
  }

  return {
    runs: views.length,
    wins,
    winRate: percent(wins, views.length),
    roundsCleared,
    furthestRound,
    avgRounds: round1(roundsCleared / views.length),

    darts,
    boardAverage: darts > 0 ? round1((boardPoints / darts) * 3) : 0,
    bestVisit,
    bestRun,
    hitRate: percent(landed, darts),
    trebleRate: percent(trebles, darts),
    doubleRate: percent(doubles, darts),

    houseHitRate: percent(houseHits, houseDarts),
    homeHitRate: percent(homeHits, homeDarts),

    coinsEarned,
    itemsBought,
    topItems: [...itemCounts.entries()]
      .map(([id, count]) => ({ id, count }))
      .sort((a, b) => b.count - a.count || a.id - b.id)
      .slice(0, 6),

    heatmap,
  };
}
