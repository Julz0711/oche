// lib/throwValidation.ts
/**
 * Request-shape validation and trusted scoring for client-supplied darts.
 *
 * Any route that accepts a dart from a client uses these: the shape guards reject nonsense before
 * it reaches an engine, and `computeDartPoints` is the authority on what a dart is worth, so a
 * forged `points` field on the wire has no effect on anything derived from it.
 */
import type { Ring, Throw } from './types';

const VALID_RINGS: readonly Ring[] = ['S', 'D', 'T', 'OB', 'IB', 'M'];

/** Type guard for the six valid Ring values — basic request-shape hygiene, not anti-cheat. */
export function isValidRing(ring: unknown): ring is Ring {
  return typeof ring === 'string' && (VALID_RINGS as readonly string[]).includes(ring);
}

/**
 * Whether `sector` is legal for the given `ring`. OB/IB are fixed-value bull rings — the client
 * encodes both with `sector: 25`, but the sector value doesn't affect them, so any sector is
 * accepted. M (miss) is likewise sector-irrelevant. S/D/T require a sector in the 1-20 range.
 */
export function isValidSector(sector: unknown, ring: Ring): boolean {
  if (typeof sector !== 'number' || !Number.isInteger(sector)) return false;
  if (ring === 'OB' || ring === 'IB' || ring === 'M') return true;
  return sector >= 1 && sector <= 20;
}

/** A dart's real point value, derived from sector+ring alone. */
export function computeDartPoints(sector: number, ring: Ring): number {
  if (ring === 'M') return 0;
  if (ring === 'OB') return 25;
  if (ring === 'IB') return 50;
  return sector * (ring === 'D' ? 2 : ring === 'T' ? 3 : 1);
}

/** A dart as it arrives on the wire — only the two fields the server is willing to trust. */
export interface ThrowInput {
  sector: Throw['sector'];
  ring: Ring;
}

/**
 * Validate a client-supplied list of darts, returning them with server-computed points.
 * Returns null if anything about the list is malformed.
 */
export function parseThrows(value: unknown, maxDarts: number): (ThrowInput & { points: number })[] | null {
  if (!Array.isArray(value) || value.length > maxDarts) return null;

  const parsed: (ThrowInput & { points: number })[] = [];
  for (const entry of value) {
    const { sector, ring } = (entry ?? {}) as { sector?: unknown; ring?: unknown };
    if (!isValidRing(ring)) return null;
    if (!isValidSector(sector, ring)) return null;
    const numericSector = sector as Throw['sector'];
    parsed.push({ sector: numericSector, ring, points: computeDartPoints(numericSector, ring) });
  }
  return parsed;
}
