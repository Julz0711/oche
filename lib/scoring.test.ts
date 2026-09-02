// lib/scoring.test.ts
import { describe, it, expect } from 'vitest';
import { computePoints, isValidRing, isValidSector } from './scoring';

describe('computePoints', () => {
  it('computes single/double/treble for a normal sector', () => {
    expect(computePoints(20, 'S')).toBe(20);
    expect(computePoints(20, 'D')).toBe(40);
    expect(computePoints(20, 'T')).toBe(60);
  });

  it('computes outer bull as 25 regardless of sector', () => {
    expect(computePoints(25, 'OB')).toBe(25);
  });

  it('computes inner bull as 50 regardless of sector', () => {
    expect(computePoints(25, 'IB')).toBe(50);
  });

  it('computes a miss as 0', () => {
    expect(computePoints(0, 'M')).toBe(0);
  });
});

describe('isValidRing', () => {
  it('accepts the six valid rings', () => {
    for (const ring of ['S', 'D', 'T', 'OB', 'IB', 'M']) {
      expect(isValidRing(ring)).toBe(true);
    }
  });

  it('rejects anything else', () => {
    expect(isValidRing('X')).toBe(false);
    expect(isValidRing(undefined)).toBe(false);
    expect(isValidRing(20)).toBe(false);
  });
});

describe('isValidSector', () => {
  it('accepts 1-20 for S/D/T', () => {
    expect(isValidSector(1, 'S')).toBe(true);
    expect(isValidSector(20, 'D')).toBe(true);
    expect(isValidSector(0, 'T')).toBe(false);
    expect(isValidSector(21, 'T')).toBe(false);
  });

  it('accepts any sector for bull rings and miss', () => {
    expect(isValidSector(25, 'OB')).toBe(true);
    expect(isValidSector(25, 'IB')).toBe(true);
    expect(isValidSector(0, 'M')).toBe(true);
  });

  it('rejects non-integer or non-numeric sectors', () => {
    expect(isValidSector('20', 'S')).toBe(false);
    expect(isValidSector(20.5, 'S')).toBe(false);
  });
});
