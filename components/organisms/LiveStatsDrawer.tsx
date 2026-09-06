// components/organisms/LiveStatsDrawer.tsx
'use client';
import { useEffect } from 'react';
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
  useEffect(() => {
    if (!open) return;
    const onKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose();
    };
    window.addEventListener('keydown', onKeyDown);
    return () => window.removeEventListener('keydown', onKeyDown);
  }, [open, onClose]);

  return (
    <div
      className={`fixed inset-0 z-40 flex items-end justify-center transition-opacity duration-200 ${
        open ? 'opacity-100 pointer-events-auto' : 'opacity-0 pointer-events-none'
      }`}
      aria-hidden={!open}
    >
      <div className="absolute inset-0 bg-oche/70" onClick={onClose} />

      <div
        className={`relative w-full max-w-2xl bg-slate border-t-2 border-x-2 border-wire/30 p-4 flex flex-col gap-4 max-h-[80vh] transition-transform duration-200 ${
          open ? 'translate-y-0' : 'translate-y-full'
        }`}
      >
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <span className="w-1.5 h-6 rounded-full bg-wire" />
            <span className="text-sm font-bold uppercase tracking-widest text-sisal">Live Stats</span>
          </div>
          <button
            onClick={onClose}
            aria-label="Close stats"
            className="w-8 h-8 flex items-center justify-center border-2 border-sisal/30 bg-oche text-sisal hover:text-chalk hover:border-wire transition-colors"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-4 overflow-y-auto">
          {players.map((playerId) => (
            <Panel
              key={playerId}
              notch="none"
              accent="wire"
              active={winnerId !== null && playerId === winnerId}
              className="p-4"
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
    </div>
  );
}
