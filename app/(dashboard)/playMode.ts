// app/(dashboard)/playMode.ts
//
// All that survives of the old wizard's stored state: which way you were last playing. The rules
// themselves now live on the match (online) or in the local room's own storage, so there is
// nothing else about a setup left to remember here.
export type PlayMode = 'multiplayer' | 'singleplayer';

const STORAGE_KEY = 'oche.play-mode.v1';

export function parseMode(raw: string | null): PlayMode {
  return raw === 'singleplayer' ? 'singleplayer' : 'multiplayer';
}

/** Per-device convenience only — a throwing or empty localStorage just means starting fresh. */
export function loadMode(): PlayMode {
  try {
    return parseMode(localStorage.getItem(STORAGE_KEY));
  } catch {
    return 'multiplayer';
  }
}

export function saveMode(mode: PlayMode): void {
  try {
    localStorage.setItem(STORAGE_KEY, mode);
  } catch {
    // Private windows and blocked site data: the dashboard still works, it just won't remember.
  }
}
