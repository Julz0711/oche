// lib/games/x01/matchStats.ts
import { scoringVisitStats, doublesAndTreblesStats } from './visitStats';
import { PlayerId } from '@/lib/types';
import { X01State } from './engine';
import { X01Settings } from './schema';
import { X01Stats, EMPTY_X01_STATS } from './stats';

/** A visit counts as a checkout attempt if the score it started from was within reach of a
 * finish in one 3-dart visit under any checkout mode (max 170, e.g. T20 T20 D-bull). This is a
 * documented simplification — it can't know which darts were deliberately "going for it" — but
 * it correctly excludes ordinary busts far from finishing range, unlike counting every bust. */
function isCheckoutAttempt(scoreBefore: number): boolean {
  return scoreBefore <= 170;
}

export function matchStats(state: X01State, playerId: PlayerId, settings: X01Settings): X01Stats {
  const entries = state.visitHistory.filter((entry) => entry.playerId === playerId);

  if (entries.length === 0) {
    return { ...EMPTY_X01_STATS };
  }

  let totalPoints = 0;
  let totalDarts = 0;
  let checkoutAttempts = 0;
  let checkoutHits = 0;
  let highestCheckout = 0;
  let legsCompleted = 0;
  let totalDartsInLegs = 0;
  let bestLegDarts = Infinity;

  const dartsInLeg = new Map<number, number>();

  entries.forEach((entry) => {
    const legKey = entry.legNumberBefore;

    entry.throws.forEach((t) => {
      totalPoints += t.points;
      totalDarts++;
    });

    const dartsThisLeg = (dartsInLeg.get(legKey) ?? 0) + entry.throws.length;
    dartsInLeg.set(legKey, dartsThisLeg);

    if (isCheckoutAttempt(entry.scoreBefore)) {
      checkoutAttempts++;
      if (entry.wasCheckout) checkoutHits++;
    }

    if (entry.wasCheckout) {
      highestCheckout = Math.max(highestCheckout, entry.scoreBefore);
      legsCompleted++;
      totalDartsInLegs += dartsThisLeg;
      bestLegDarts = Math.min(bestLegDarts, dartsThisLeg);
      dartsInLeg.delete(legKey);
    }
  });

  const allDarts = entries.flatMap((e) => e.throws);
  const firstNine = allDarts.slice(0, 9);

  const avg3Dart = totalDarts > 0 ? (totalPoints / totalDarts) * 3 : 0;
  const firstNineAvg =
    firstNine.length > 0 ? (firstNine.reduce((sum, t) => sum + t.points, 0) / firstNine.length) * 3 : 0;
  const checkoutRate = checkoutAttempts > 0 ? checkoutHits / checkoutAttempts : 0;
  const dartsPerLeg = legsCompleted > 0 ? totalDartsInLegs / legsCompleted : 0;
  const { doublesHit, doublesAttempts, treblesHit, treblesAttempts } = doublesAndTreblesStats(entries, settings.checkOut);
  const doublesRate = doublesAttempts > 0 ? doublesHit / doublesAttempts : 0;
  const treblesRate = treblesAttempts > 0 ? treblesHit / treblesAttempts : 0;

  return {
    ...scoringVisitStats(entries),
    avg3Dart: Math.round(avg3Dart * 10) / 10,
    firstNineAvg: Math.round(firstNineAvg * 10) / 10,
    checkoutRate: Math.round(checkoutRate * 1000) / 10,
    dartsPerLeg: Math.round(dartsPerLeg * 10) / 10,
    bestLeg: bestLegDarts === Infinity ? null : bestLegDarts,
    highestCheckout: highestCheckout || null,
    doublesHit,
    doublesAttempts,
    doublesRate: Math.round(doublesRate * 1000) / 10,
    treblesHit,
    treblesRate: Math.round(treblesRate * 1000) / 10,
  };
}
