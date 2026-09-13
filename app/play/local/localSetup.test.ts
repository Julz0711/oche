import { describe, it, expect } from 'vitest';
import { parseLocalSetup } from './localSetup';

describe('parseLocalSetup', () => {
  it('returns nothing stored for an empty slot', () => {
    expect(parseLocalSetup(null)).toEqual({ settings: null, names: null });
  });

  it('returns nothing stored for unreadable JSON rather than throwing', () => {
    expect(parseLocalSetup('{ not json')).toEqual({ settings: null, names: null });
  });

  it('reads back a setup it wrote', () => {
    const raw = JSON.stringify({ settings: { startingScore: 301, firstTo: 3 }, names: ['Ann', 'Bo'] });
    expect(parseLocalSetup(raw)).toEqual({ settings: { startingScore: 301, firstTo: 3 }, names: ['Ann', 'Bo'] });
  });

  it('drops a name list shorter than a match needs', () => {
    expect(parseLocalSetup(JSON.stringify({ names: ['Ann'] })).names).toBeNull();
  });

  it('drops non-string entries and caps the list at the maximum seats', () => {
    const names = parseLocalSetup(JSON.stringify({ names: ['Ann', 42, 'Bo', null, 'Cy'] })).names;
    expect(names).toEqual(['Ann', 'Bo', 'Cy']);

    const many = parseLocalSetup(JSON.stringify({ names: Array.from({ length: 20 }, (_, i) => `P${i}`) })).names;
    expect(many).toHaveLength(8);
  });

  it('truncates an over-long name to what the input accepts', () => {
    const names = parseLocalSetup(JSON.stringify({ names: ['x'.repeat(100), 'Bo'] })).names;
    expect(names?.[0]).toHaveLength(32);
  });

  it('rejects settings that are not a plain object', () => {
    expect(parseLocalSetup(JSON.stringify({ settings: [1, 2] })).settings).toBeNull();
    expect(parseLocalSetup(JSON.stringify({ settings: 'x01' })).settings).toBeNull();
  });

  // Stored settings are deliberately not validated here: which options a game offers can change
  // between builds, the room reconciles each field against what it can render, and the server
  // validates the whole object against the game schema on Start.
  it('passes settings through without judging their contents', () => {
    expect(parseLocalSetup(JSON.stringify({ settings: { startingScore: 999 } })).settings).toEqual({ startingScore: 999 });
  });

  it('survives a payload from a build that stored something else entirely', () => {
    expect(parseLocalSetup(JSON.stringify({ mode: 'multiplayer', x01: { sets: 3 } }))).toEqual({ settings: null, names: null });
  });
});
