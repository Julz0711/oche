// lib/games/x01/stats.ts
import { Visit, StatTileDef, GameStats } from '@/lib/types';
import { X01Settings } from './schema';

export interface X01Stats extends GameStats {
  avg3Dart: number;
  firstNineAvg: number;
  checkoutRate: number;
  dartsPerLeg: number;
  bestLeg: number | null;
  highestCheckout: number | null;
  doublesHit: number;
  doublesAttempts: number;
  doublesRate: number;
  treblesHit: number;
  treblesRate: number;
}

const EMPTY_STATS: X01Stats = {
  avg3Dart: 0,
  firstNineAvg: 0,
  checkoutRate: 0,
  dartsPerLeg: 0,
  bestLeg: null,
  highestCheckout: null,
  doublesHit: 0,
  doublesAttempts: 0,
  doublesRate: 0,
  treblesHit: 0,
  treblesRate: 0,
};

export function computeStats(visits: Visit[], settings: X01Settings): X01Stats {
  if (visits.length === 0) {
    return { ...EMPTY_STATS };
  }

  let totalPoints = 0;
  let totalDarts = 0;
  let checkoutAttempts = 0;
  let checkoutHits = 0;
  let doublesAttempts = 0;
  let doublesHit = 0;
  let treblesHit = 0;
  let trebleAttempts = 0;
  let highestCheckout = 0;
  let legsCompleted = 0;
  let totalDartsInLegs = 0;
  let bestLegDarts = Infinity;

  const dartsInLeg = new Map<string, number>();

  visits.forEach((visit) => {
    const legKey = visit.legId ?? 'default';

    visit.throws.forEach((t) => {
      totalPoints += t.points;
      totalDarts++;

      if (t.ring === 'T') {
        treblesHit++;
        trebleAttempts++;
      } else if (t.ring === 'D' || t.ring === 'IB') {
        doublesHit++;
        doublesAttempts++;
      }
    });

    const dartsThisLeg = (dartsInLeg.get(legKey) ?? 0) + visit.throws.length;
    dartsInLeg.set(legKey, dartsThisLeg);

    if (visit.isCheckout) {
      checkoutHits++;
      checkoutAttempts++;
      highestCheckout = Math.max(highestCheckout, visit.scoreBefore || 0);
      legsCompleted++;
      totalDartsInLegs += dartsThisLeg;
      bestLegDarts = Math.min(bestLegDarts, dartsThisLeg);
      dartsInLeg.delete(legKey);
    } else if (visit.busted) {
      checkoutAttempts++;
    }
  });

  const allDarts = visits.flatMap((v) => v.throws);
  const firstNine = allDarts.slice(0, 9);

  const avg3Dart = totalDarts > 0 ? (totalPoints / totalDarts) * 3 : 0;
  const firstNineAvg = firstNine.length > 0
    ? (firstNine.reduce((sum, t) => sum + t.points, 0) / firstNine.length) * 3
    : 0;
  const checkoutRate = checkoutAttempts > 0 ? checkoutHits / checkoutAttempts : 0;
  const dartsPerLeg = legsCompleted > 0 ? totalDartsInLegs / legsCompleted : 0;
  const doublesRate = doublesAttempts > 0 ? doublesHit / doublesAttempts : 0;
  const treblesRate = trebleAttempts > 0 ? treblesHit / trebleAttempts : 0;

  return {
    avg3Dart: Math.round(avg3Dart * 10) / 10,
    firstNineAvg: Math.round(firstNineAvg * 10) / 10,
    checkoutRate: Math.round(checkoutRate * 1000) / 10, // Percentage
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

export const statTiles: StatTileDef<X01Stats>[] = [
  {
    label: '3-dart avg',
    key: 'avg3Dart',
    value: (stats) => stats.avg3Dart.toFixed(1),
  },
  {
    label: 'Checkout %',
    key: 'checkoutRate',
    value: (stats) => `${stats.checkoutRate.toFixed(0)}%`,
  },
  {
    label: 'Darts/leg',
    key: 'dartsPerLeg',
    value: (stats) => stats.dartsPerLeg.toFixed(1),
  },
  {
    label: 'Best leg',
    key: 'bestLeg',
    value: (stats) => (stats.bestLeg ? `${stats.bestLeg}` : '—'),
  },
];
