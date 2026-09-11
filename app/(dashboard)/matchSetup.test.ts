import { describe, it, expect } from 'vitest';
import {
  DEFAULT_SETUP,
  MatchSetup,
  buildSettings,
  parseSetup,
  serializeSetup,
  summarize,
} from './matchSetup';

const custom: MatchSetup = {
  mode: 'singleplayer',
  gameId: 'cricket',
  x01: { startingScore: 301, firstTo: 5, sets: 3 },
  cricket: { firstTo: 7, scoring: 'no-points' },
  copycat: { firstTo: 9 },
  playerNames: ['Ann', 'Bo', 'Cy'],
};

describe('parseSetup', () => {
  it('falls back to defaults with nothing stored', () => {
    expect(parseSetup(null)).toEqual(DEFAULT_SETUP);
  });

  it('falls back to defaults on unreadable JSON', () => {
    expect(parseSetup('{oops')).toEqual(DEFAULT_SETUP);
  });

  it('round-trips a setup the user actually chose', () => {
    expect(parseSetup(serializeSetup(custom))).toEqual(custom);
  });

  it('drops a game that is no longer registered', () => {
    const stored = serializeSetup({ ...custom, gameId: 'shanghai' as MatchSetup['gameId'] });
    expect(parseSetup(stored).gameId).toBe(DEFAULT_SETUP.gameId);
  });

  // Stored values outlive the option lists that produced them: if 7-set matches stop being
  // offered, a stale `sets: 7` must not survive into a settings screen that can't display it.
  it('replaces values that are no longer offered, keeping the rest of the setup', () => {
    const stored = JSON.stringify({
      ...custom,
      x01: { startingScore: 999, firstTo: 5, sets: 42 },
    });
    const parsed = parseSetup(stored);
    expect(parsed.x01).toEqual({ startingScore: DEFAULT_SETUP.x01.startingScore, firstTo: 5, sets: DEFAULT_SETUP.x01.sets });
    expect(parsed.cricket).toEqual(custom.cricket);
  });

  it('ignores a partially-written setup rather than spreading undefined into it', () => {
    expect(parseSetup(JSON.stringify({ mode: 'singleplayer' }))).toEqual({
      ...DEFAULT_SETUP,
      mode: 'singleplayer',
    });
  });

  it('keeps player names usable: strings only, at least two, never more than eight', () => {
    expect(parseSetup(JSON.stringify({ playerNames: ['Ann', 42, null] })).playerNames).toEqual(['Ann', 'Player 2']);
    expect(parseSetup(JSON.stringify({ playerNames: [] })).playerNames).toEqual(DEFAULT_SETUP.playerNames);
    expect(parseSetup(JSON.stringify({ playerNames: Array(12).fill('X') })).playerNames).toHaveLength(8);
  });
});

describe('buildSettings', () => {
  const defaults = { some: 'default' };

  it('sends X01 its starting score as a string, as the schema expects', () => {
    expect(buildSettings(DEFAULT_SETUP, defaults)).toEqual({ some: 'default', startingScore: '501', firstTo: 1, sets: 0 });
  });

  it('sends only the chosen game’s settings', () => {
    expect(buildSettings(custom, defaults)).toEqual({ some: 'default', firstTo: 7, scoring: 'no-points' });
    expect(buildSettings({ ...custom, gameId: 'copycat' }, defaults)).toEqual({ some: 'default', firstTo: 9 });
  });

  it('has nothing to send until the game module has loaded its defaults', () => {
    expect(buildSettings(DEFAULT_SETUP, undefined)).toBeUndefined();
  });
});

describe('summarize', () => {
  it('describes only the chosen game, and says which step owns each row', () => {
    const rows = summarize(DEFAULT_SETUP);
    expect(rows.map(row => row.label)).toEqual(['Mode', 'Game', 'Starting score', 'Legs', 'Sets']);
    expect(rows.find(row => row.label === 'Game')?.step).toBe('game');
    expect(rows.find(row => row.label === 'Legs')?.step).toBe('settings');
    expect(rows.find(row => row.label === 'Sets')?.value).toBe('Off');
  });

  it('lists local players, and drops set/leg rows the game does not have', () => {
    const rows = summarize(custom);
    expect(rows.map(row => row.label)).toEqual(['Mode', 'Game', 'Legs', 'Scoring', 'Players']);
    expect(rows.find(row => row.label === 'Players')?.value).toBe('Ann, Bo, Cy');
  });
});
