import { describe, it, expect } from 'vitest';
import { suggestCheckout } from './checkoutSuggestion';

describe('suggestCheckout', () => {
  it('suggests a single-dart finish when the score is itself a double', () => {
    expect(suggestCheckout(40, 'double')).toEqual(['D20']);
  });

  it('suggests the classic two-dart finish for 100 (double-out)', () => {
    expect(suggestCheckout(100, 'double')).toEqual(['T20', 'D20']);
  });

  it('suggests the classic 170 finish (double-out)', () => {
    expect(suggestCheckout(170, 'double')).toEqual(['T20', 'T20', 'Bull']);
  });

  it('returns null for scores with no valid double-out finish', () => {
    for (const score of [169, 168, 166, 165, 163, 162, 159]) {
      expect(suggestCheckout(score, 'double')).toBeNull();
    }
  });

  it('returns null above the maximum checkout of 170', () => {
    expect(suggestCheckout(171, 'double')).toBeNull();
  });

  it('returns null at or below zero', () => {
    expect(suggestCheckout(0, 'double')).toBeNull();
  });

  it('allows a triple to finish under master checkout', () => {
    expect(suggestCheckout(60, 'master')).toEqual(['T20']);
  });

  it('allows any dart to finish under straight checkout', () => {
    expect(suggestCheckout(19, 'straight')).toEqual(['S19']);
  });
});
