// lib/scoring.ts
import { Ring } from '@/lib/types';

const VALID_RINGS: readonly Ring[] = ['S', 'D', 'T', 'OB', 'IB', 'M'];

/** Type guard for the six valid Ring values. */
export function isValidRing(ring: unknown): ring is Ring {
  return typeof ring === 'string' && (VALID_RINGS as readonly string[]).includes(ring);
}

/** Whether `sector` is legal for the given `ring`. OB/IB are fixed-value bull rings — the
 *  client encodes both with `sector: 25`, but the sector value is irrelevant to their score, so
 *  any sector is accepted for them. M (miss) is likewise sector-irrelevant (scores 0 regardless).
 *  S/D/T require a sector in the 1-20 dartboard range. */
export function isValidSector(sector: unknown, ring: Ring): boolean {
  if (typeof sector !== 'number' || !Number.isInteger(sector)) return false;
  if (ring === 'OB' || ring === 'IB' || ring === 'M') return true;
  return sector >= 1 && sector <= 20;
}

/** Pure, server-trusted derivation of a dart's points from its sector + ring. This is the single
 *  source of truth for scoring math — never trust a client-supplied `points` value. */
export function computePoints(sector: number, ring: Ring): number {
  if (ring === 'M') return 0;
  if (ring === 'OB') return 25;
  if (ring === 'IB') return 50;
  return sector * (ring === 'D' ? 2 : ring === 'T' ? 3 : 1);
}
