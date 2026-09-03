'use client';

import { useState } from 'react';
import { Button } from '@/components/atoms/Button';

export interface ShareResultPlayer {
  name: string;
  isWinner: boolean;
  statLabel: string;
  statValue: string;
}

interface ShareResultButtonProps {
  matchId: string;
  gameName: string;
  matchInfo: string;
  players: ShareResultPlayer[];
}

export function ShareResultButton({ matchId, gameName, matchInfo, players }: ShareResultButtonProps) {
  const [status, setStatus] = useState<'idle' | 'loading' | 'error'>('idle');

  async function handleShare() {
    setStatus('loading');
    try {
      const response = await fetch(`/api/matches/${matchId}/share-image`, {
        method: 'POST',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify({ gameName, matchInfo, players }),
      });
      if (!response.ok) {
        setStatus('error');
        return;
      }
      const blob = await response.blob();
      const file = new File([blob], 'oche-result.png', { type: 'image/png' });

      if (typeof navigator.canShare === 'function' && navigator.canShare({ files: [file] })) {
        try {
          await navigator.share({ files: [file], title: 'Oche match result' });
          setStatus('idle');
          return;
        } catch (err) {
          if (err instanceof DOMException && err.name === 'AbortError') {
            setStatus('idle');
            return;
          }
          // Any other share failure falls through to the download fallback below.
        }
      }

      const url = URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = url;
      link.download = 'oche-result.png';
      link.click();
      URL.revokeObjectURL(url);
      setStatus('idle');
    } catch {
      setStatus('error');
    }
  }

  return (
    <div className="flex flex-col items-center gap-2">
      <Button variant="secondary" onClick={handleShare} disabled={status === 'loading'}>
        {status === 'loading' ? 'Generating…' : 'Share Result'}
      </Button>
      {status === 'error' && <p className="text-sm text-treble">Couldn't generate image — try again.</p>}
    </div>
  );
}
