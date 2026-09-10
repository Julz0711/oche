// lib/localMatchStorage.ts
const KEY_PREFIX = 'oche:local-match:';

export interface StoredLocalMatch {
  players?: unknown[];
  gameId: string;
  settings: unknown;
  gameState: unknown;
  pendingCompletion?: { winnerId: string | null } | null;
}

function keyFor(matchId: string): string {
  return `${KEY_PREFIX}${matchId}`;
}

/** Persists a local match's current state. Best-effort: localStorage can throw (private
 *  browsing, quota exceeded, disabled) — local-mode play still works entirely in memory either
 *  way; only offline-reload recovery is lost if this fails. */
export function saveLocalMatch(matchId: string, snapshot: StoredLocalMatch): void {
  try {
    localStorage.setItem(keyFor(matchId), JSON.stringify(snapshot));
  } catch {
    // See doc comment above.
  }
}

export function loadLocalMatch(matchId: string): StoredLocalMatch | null {
  try {
    const raw = localStorage.getItem(keyFor(matchId));
    if (!raw) return null;
    return JSON.parse(raw) as StoredLocalMatch;
  } catch {
    return null;
  }
}

export function clearLocalMatch(matchId: string): void {
  try {
    localStorage.removeItem(keyFor(matchId));
  } catch {
    // Best-effort — see saveLocalMatch.
  }
}

/** Marks an already-stored local match as having a completion sync that needs retrying (e.g.
 *  the completion POST failed because the match finished while offline). A no-op if no snapshot
 *  exists for this match id — there is nothing to retry without the match's final state. */
export function markPendingCompletion(matchId: string, winnerId: string | null): void {
  const existing = loadLocalMatch(matchId);
  if (!existing) return;
  saveLocalMatch(matchId, { ...existing, pendingCompletion: { winnerId } });
}

/** Scans every stored local match for one with a pending completion sync. Used by
 *  PendingSyncManager to retry them on mount and when connectivity returns. */
export function listPendingCompletions(): { matchId: string; snapshot: StoredLocalMatch }[] {
  const results: { matchId: string; snapshot: StoredLocalMatch }[] = [];
  try {
    for (let i = 0; i < localStorage.length; i++) {
      const key = localStorage.key(i);
      if (!key || !key.startsWith(KEY_PREFIX)) continue;
      const raw = localStorage.getItem(key);
      if (!raw) continue;
      try {
        const snapshot = JSON.parse(raw) as StoredLocalMatch;
        if (snapshot.pendingCompletion) {
          results.push({ matchId: key.slice(KEY_PREFIX.length), snapshot });
        }
      } catch {
        continue;
      }
    }
  } catch {
    return [];
  }
  return results;
}
