// lib/roomCode.test.ts
import { describe, it, expect } from 'vitest';
import { generateRoomCode } from './roomCode';

describe('generateRoomCode', () => {
  it('generates a 6-character code using only the allowed alphabet', () => {
    for (let i = 0; i < 50; i++) {
      const code = generateRoomCode();
      expect(code).toHaveLength(6);
      expect(code).toMatch(/^[A-HJ-NP-Z2-9]{6}$/); // excludes 0, O, 1, I
    }
  });
});
