// components/organisms/LiveStatsDrawer.tsx
'use client';
import { useEffect, useRef } from 'react';
import { X } from 'lucide-react';
import { GameModule, PlayerId } from '@/lib/types';
import { PlayerStatTiles } from './PlayerStatTiles';
import { Panel } from '@/components/atoms';

interface LiveStatsDrawerProps {
  open: boolean;
  onClose: () => void;
  gameModule: GameModule<any, any>;
  state: any;
  settings: any;
  players: PlayerId[];
  winnerId?: PlayerId | null;
  displayNames: Map<string, string>;
}

/** A bottom-sheet showing every player's live computed stats (3-dart avg, checkout %, MPR,
 *  etc.) mid-match — the same `PlayerStatTiles` PostMatchStats shows at the end, so live and
 *  final numbers can never disagree. Opened on demand from the match header; doesn't take up
 *  permanent screen space. */
export function LiveStatsDrawer({
  open,
  onClose,
  gameModule,
  state,
  settings,
  players,
  winnerId = null,
  displayNames,
}: LiveStatsDrawerProps) {
  const dialogRef = useRef<HTMLDialogElement>(null);
  useEffect(() => {
    const dialog = dialogRef.current;
    if (!dialog) return;
    if (open && !dialog.open) dialog.showModal();
    if (!open && dialog.open) dialog.close();
    if (!open) return;
    const previous = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    return () => { document.body.style.overflow = previous; };
  }, [open]);

  return (
    <dialog ref={dialogRef} onCancel={onClose} onClick={e => { if (e.target === e.currentTarget) onClose(); }}
      aria-labelledby="live-stats-title" className="stats-dialog">
      <div
        className="relative w-full max-w-2xl bg-slate border-t-2 border-x-2 border-wire/30 p-3 flex flex-col gap-2 max-h-[85dvh] pb-[max(16px,env(safe-area-inset-bottom))]"
      >
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <span className="w-1.5 h-6 rounded-full bg-wire" />
            <h2 id="live-stats-title" className="text-sm font-bold uppercase tracking-widest text-sisal">Live Stats</h2>
          </div>
          <button
            onClick={onClose}
            aria-label="Close stats"
            className="w-11 h-11 flex items-center justify-center border-2 border-sisal/30 bg-oche text-sisal hover:text-chalk hover:border-wire transition-colors"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        <p className="stat-note">Completed visits · current visit appears when finished</p>
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 overflow-y-auto overscroll-contain min-h-0 items-start">
          {players.map((playerId) => (
            <Panel
              key={playerId}
              notch="none"
              accent="wire"
              active={winnerId !== null && playerId === winnerId}
              className="p-2.5"
            >
              <PlayerStatTiles
                gameModule={gameModule}
                state={state}
                settings={settings}
                playerId={playerId}
                displayName={displayNames.get(playerId)}
                isWinner={winnerId !== null && playerId === winnerId}
              />
            </Panel>
          ))}
        </div>
      </div>
    </dialog>
  );
}
