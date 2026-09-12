// app/(dashboard)/matchSetup.ts
//
// The match-setup wizard's state: what the three steps read and write, how it survives a reload,
// and how it turns into the settings payload POST /api/matches expects. Kept apart from the
// components so the validation below — the part that has to cope with whatever an old build left
// in localStorage — can be tested directly.
import { gameRegistry, GameId } from '@/lib/games/registry';

export const STARTING_SCORES = [301, 501, 701] as const;
export const LEG_OPTIONS = [1, 3, 5, 7] as const;
export const SET_OPTIONS = [0, 2, 3, 4, 5] as const;
export const COPYCAT_LIMIT_OPTIONS = [3, 5, 7, 9] as const;
export const CRICKET_SCORING = ['standard', 'no-points'] as const;

export const MIN_PLAYERS = 2;
export const MAX_PLAYERS = 8;

export type PlayMode = 'multiplayer' | 'singleplayer';
export type WizardStep = 'game' | 'settings' | 'review';
export const WIZARD_STEPS: { id: WizardStep; label: string }[] = [
  { id: 'game', label: 'Game' },
  { id: 'settings', label: 'Settings' },
  { id: 'review', label: 'Review' },
];

export interface MatchSetup {
  mode: PlayMode;
  gameId: GameId;
  x01: {
    startingScore: (typeof STARTING_SCORES)[number];
    firstTo: (typeof LEG_OPTIONS)[number];
    sets: (typeof SET_OPTIONS)[number];
  };
  cricket: {
    firstTo: (typeof LEG_OPTIONS)[number];
    scoring: (typeof CRICKET_SCORING)[number];
  };
  copycat: { firstTo: (typeof COPYCAT_LIMIT_OPTIONS)[number] };
  playerNames: string[];
}

export const DEFAULT_SETUP: MatchSetup = {
  mode: 'multiplayer',
  gameId: 'x01',
  x01: { startingScore: 501, firstTo: 1, sets: 0 },
  cricket: { firstTo: 1, scoring: 'standard' },
  copycat: { firstTo: 3 },
  playerNames: ['Player 1', 'Player 2'],
};

const STORAGE_KEY = 'oche.match-setup.v1';

/** Keep `value` only if it is still one of the options the UI can render; otherwise fall back. */
function oneOf<T>(options: readonly T[], value: unknown, fallback: T): T {
  return options.includes(value as T) ? (value as T) : fallback;
}

function validPlayerNames(value: unknown): string[] {
  if (!Array.isArray(value)) return DEFAULT_SETUP.playerNames;
  const names = value.filter((name): name is string => typeof name === 'string').slice(0, MAX_PLAYERS);
  while (names.length < MIN_PLAYERS) names.push(`Player ${names.length + 1}`);
  return names;
}

/** Rebuild a setup from stored JSON, field by field: anything missing, malformed or no longer
 *  offered falls back to its default rather than reaching a step that can't display it. */
export function parseSetup(raw: string | null): MatchSetup {
  let stored: Partial<Record<keyof MatchSetup, unknown>> = {};
  try {
    const parsed: unknown = raw ? JSON.parse(raw) : null;
    if (parsed && typeof parsed === 'object') stored = parsed as typeof stored;
  } catch {
    return { ...DEFAULT_SETUP };
  }
  const x01 = (stored.x01 ?? {}) as Partial<MatchSetup['x01']>;
  const cricket = (stored.cricket ?? {}) as Partial<MatchSetup['cricket']>;
  const copycat = (stored.copycat ?? {}) as Partial<MatchSetup['copycat']>;
  return {
    mode: oneOf(['multiplayer', 'singleplayer'] as const, stored.mode, DEFAULT_SETUP.mode),
    gameId: oneOf(Object.keys(gameRegistry) as GameId[], stored.gameId, DEFAULT_SETUP.gameId),
    x01: {
      startingScore: oneOf(STARTING_SCORES, x01.startingScore, DEFAULT_SETUP.x01.startingScore),
      firstTo: oneOf(LEG_OPTIONS, x01.firstTo, DEFAULT_SETUP.x01.firstTo),
      sets: oneOf(SET_OPTIONS, x01.sets, DEFAULT_SETUP.x01.sets),
    },
    cricket: {
      firstTo: oneOf(LEG_OPTIONS, cricket.firstTo, DEFAULT_SETUP.cricket.firstTo),
      scoring: oneOf(CRICKET_SCORING, cricket.scoring, DEFAULT_SETUP.cricket.scoring),
    },
    copycat: { firstTo: oneOf(COPYCAT_LIMIT_OPTIONS, copycat.firstTo, DEFAULT_SETUP.copycat.firstTo) },
    playerNames: stored.playerNames === undefined ? DEFAULT_SETUP.playerNames : validPlayerNames(stored.playerNames),
  };
}

export function serializeSetup(setup: MatchSetup): string {
  return JSON.stringify(setup);
}

/** Per-device convenience only — a throwing or empty localStorage just means starting fresh. */
export function loadSetup(): MatchSetup {
  try {
    return parseSetup(localStorage.getItem(STORAGE_KEY));
  } catch {
    return { ...DEFAULT_SETUP };
  }
}

export function saveSetup(setup: MatchSetup): void {
  try {
    localStorage.setItem(STORAGE_KEY, serializeSetup(setup));
  } catch {
    // Private windows and blocked site data: the wizard still works, it just won't be remembered.
  }
}

/** The settings payload for the chosen game, merged over that game module's own defaults.
 *  Undefined until the module has loaded, since its defaults are the base of the object. */
export function buildSettings(
  setup: MatchSetup,
  defaults: Record<string, unknown> | undefined
): Record<string, unknown> | undefined {
  if (!defaults) return undefined;
  if (setup.gameId === 'x01') {
    return { ...defaults, startingScore: String(setup.x01.startingScore), firstTo: setup.x01.firstTo, sets: setup.x01.sets };
  }
  if (setup.gameId === 'cricket') {
    return { ...defaults, firstTo: setup.cricket.firstTo, scoring: setup.cricket.scoring };
  }
  if (setup.gameId === 'copycat') return { ...defaults, firstTo: setup.copycat.firstTo };
  return defaults;
}

export interface SummaryRow {
  label: string;
  value: string;
  /** Which step to return to when this row's Edit is used. */
  step: WizardStep;
}

const GAME_NAMES: Record<GameId, string> = { x01: 'X01', cricket: 'Cricket', copycat: 'Copycat' };

/** The review step's readout: every choice that will be sent, and nothing that won't. */
export function summarize(setup: MatchSetup): SummaryRow[] {
  const rows: SummaryRow[] = [
    { label: 'Mode', value: setup.mode === 'multiplayer' ? 'Online room' : 'Local · same device', step: 'game' },
    { label: 'Game', value: GAME_NAMES[setup.gameId] ?? setup.gameId, step: 'game' },
  ];
  if (setup.gameId === 'x01') {
    rows.push(
      { label: 'Starting score', value: String(setup.x01.startingScore), step: 'settings' },
      { label: 'Legs', value: `First to ${setup.x01.firstTo}`, step: 'settings' },
      { label: 'Sets', value: setup.x01.sets === 0 ? 'Off' : `First to ${setup.x01.sets}`, step: 'settings' }
    );
  }
  if (setup.gameId === 'cricket') {
    rows.push(
      { label: 'Legs', value: `First to ${setup.cricket.firstTo}`, step: 'settings' },
      { label: 'Scoring', value: setup.cricket.scoring === 'standard' ? 'Standard' : 'No points', step: 'settings' }
    );
  }
  if (setup.gameId === 'copycat') {
    rows.push({ label: 'Points', value: `First to ${setup.copycat.firstTo}`, step: 'settings' });
  }
  if (setup.mode === 'singleplayer') {
    rows.push({ label: 'Players', value: setup.playerNames.join(', '), step: 'settings' });
  }
  return rows;
}

/** A single line naming every rule the match will be played under — `501 · First to 1 leg ·
 *  No sets`. Shown next to the forward action on the settings step so the choice being
 *  confirmed is readable at the moment of confirming it, without reading a whole table.
 *
 *  Deliberately built from the same `summarize` rows as the review step, so the two can never
 *  disagree about what is about to be sent. `Mode` and `Players` are dropped: the mode is
 *  already the selected tab, and a player list is too long for one line. */
export function summaryLine(setup: MatchSetup): string {
  return summarize(setup)
    .filter(row => row.step === 'settings' && row.label !== 'Players')
    .map(row => {
      if (row.label === 'Legs') return `First to ${row.value.replace('First to ', '')} leg${row.value.endsWith('1') ? '' : 's'}`;
      if (row.label === 'Sets') return row.value === 'Off' ? 'No sets' : `${row.value} sets`;
      if (row.label === 'Points') return `${row.value} points`;
      return row.value;
    })
    .join(' · ');
}
