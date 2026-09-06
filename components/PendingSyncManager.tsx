// components/PendingSyncManager.tsx
'use client';
import { useEffect } from 'react';
import { listPendingCompletions, clearLocalMatch } from '@/lib/localMatchStorage';

/** Retries any local match completions that failed to sync (e.g. the match finished while
 *  offline) — on mount and whenever the browser regains connectivity. Renders nothing; this is
 *  a side-effect-only component, following the same pattern as PwaRegistration.tsx. */
export function PendingSyncManager() {
  useEffect(() => {
    const retryPending = () => {
      for (const { matchId, snapshot } of listPendingCompletions()) {
        fetch(`/api/matches/${matchId}/complete`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            state: snapshot.gameState,
            winnerId: snapshot.pendingCompletion?.winnerId ?? null,
          }),
        })
          .then((res) => {
            if (res.ok) clearLocalMatch(matchId);
          })
          .catch(() => {
            // Still offline or still failing — leave it marked pending, try again next time.
          });
      }
    };

    retryPending();
    window.addEventListener('online', retryPending);
    return () => window.removeEventListener('online', retryPending);
  }, []);

  return null;
}
