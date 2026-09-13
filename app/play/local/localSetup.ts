// app/play/local/localSetup.ts
//
// What the local room remembers between visits, and how it copes with whatever an older build
// left behind. Kept apart from the component so the validation below can be tested directly —
// the same arrangement the setup wizard's own storage used before it was retired.
import { GameId } from '@/lib/games/registry';

export const MIN_PLAYERS = 2;
export const MAX_PLAYERS = 8;

export interface LocalSetup {
  settings: Record<string, unknown> | null;
  names: string[] | null;
}

const EMPTY: LocalSetup = { settings: null, names: null };

/** Per game: the rules you picked for X01 shouldn't follow you into Cricket. */
function storageKey(gameId: GameId): string {
  return `oche.local-setup.v1.${gameId}`;
}

function validNames(value: unknown): string[] | null {
  if (!Array.isArray(value)) return null;
  const names = value
    .filter((name): name is string => typeof name === 'string')
    .map((name) => name.slice(0, 32))
    .slice(0, MAX_PLAYERS);
  if (names.length < MIN_PLAYERS) return null;
  return names;
}

/**
 * Rebuild a stored setup, field by field.
 *
 * Settings are handed back as a plain object and are NOT trusted to be valid for the game: the
 * options a game offers can change between builds, so the room reconciles each field against the
 * options it can actually render (see `fieldValue`), and the server validates the whole object
 * against the game's schema on Start regardless. Nothing here can put an unplayable match on the
 * board — the worst case is a control falling back to its first option.
 */
export function parseLocalSetup(raw: string | null): LocalSetup {
  if (!raw) return EMPTY;
  let stored: unknown;
  try {
    stored = JSON.parse(raw);
  } catch {
    return EMPTY;
  }
  if (!stored || typeof stored !== 'object') return EMPTY;
  const { settings, names } = stored as { settings?: unknown; names?: unknown };
  return {
    settings: settings && typeof settings === 'object' && !Array.isArray(settings)
      ? (settings as Record<string, unknown>)
      : null,
    names: validNames(names),
  };
}

/** Per-device convenience only — a throwing or empty localStorage just means starting fresh. */
export function loadLocalSetup(gameId: GameId): LocalSetup {
  try {
    return parseLocalSetup(localStorage.getItem(storageKey(gameId)));
  } catch {
    return EMPTY;
  }
}

export function saveLocalSetup(gameId: GameId, setup: { settings: Record<string, unknown>; names: string[] }): void {
  try {
    localStorage.setItem(storageKey(gameId), JSON.stringify(setup));
  } catch {
    // Private windows and blocked site data: the room still works, it just won't be remembered.
  }
}
