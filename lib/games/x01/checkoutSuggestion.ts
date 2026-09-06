// lib/games/x01/checkoutSuggestion.ts
import { X01Settings } from './schema';

interface CandidateDart {
  value: number;
  label: string;
  isDouble: boolean;
  isTriple: boolean;
}

const CANDIDATE_DARTS: CandidateDart[] = [
  ...Array.from({ length: 20 }, (_, i) => i + 1).map((n) => ({
    value: n,
    label: `S${n}`,
    isDouble: false,
    isTriple: false,
  })),
  ...Array.from({ length: 20 }, (_, i) => i + 1).map((n) => ({
    value: n * 2,
    label: `D${n}`,
    isDouble: true,
    isTriple: false,
  })),
  ...Array.from({ length: 20 }, (_, i) => i + 1).map((n) => ({
    value: n * 3,
    label: `T${n}`,
    isDouble: false,
    isTriple: true,
  })),
  { value: 25, label: '25', isDouble: false, isTriple: false },
  { value: 50, label: 'Bull', isDouble: true, isTriple: false },
];

// Highest value first: a suggestion should spend the biggest scoring darts early and leave the
// simplest possible finish for last, matching how real checkout charts read (e.g. 100 -> T20, D20
// rather than 20 smaller darts that happen to also sum to 100).
const DARTS_DESC = [...CANDIDATE_DARTS].sort((a, b) => b.value - a.value);

function isValidFinishDart(dart: CandidateDart, checkOut: X01Settings['checkOut']): boolean {
  if (checkOut === 'double') return dart.isDouble;
  if (checkOut === 'master') return dart.isDouble || dart.isTriple;
  return true; // straight: any dart may finish
}

/**
 * Suggests a finishing dart combination for the given remaining score, assuming a fresh 3-dart
 * visit — the same convention printed checkout charts use, independent of how many darts are
 * actually left in the current visit. Returns null when no combination exists within 3 darts
 * under the match's checkout rule (e.g. 169/168/166/165/163/162/159 under double-out).
 */
export function suggestCheckout(score: number, checkOut: X01Settings['checkOut']): string[] | null {
  if (score <= 0 || score > 170) return null;

  for (const d1 of DARTS_DESC) {
    if (d1.value === score && isValidFinishDart(d1, checkOut)) return [d1.label];
  }

  for (const d1 of DARTS_DESC) {
    const remAfter1 = score - d1.value;
    if (remAfter1 <= 0) continue;
    for (const d2 of DARTS_DESC) {
      if (d2.value === remAfter1 && isValidFinishDart(d2, checkOut)) return [d1.label, d2.label];
    }
  }

  for (const d1 of DARTS_DESC) {
    const remAfter1 = score - d1.value;
    if (remAfter1 <= 0) continue;
    for (const d2 of DARTS_DESC) {
      const remAfter2 = remAfter1 - d2.value;
      if (remAfter2 <= 0) continue;
      for (const d3 of DARTS_DESC) {
        if (d3.value === remAfter2 && isValidFinishDart(d3, checkOut)) return [d1.label, d2.label, d3.label];
      }
    }
  }

  return null;
}
