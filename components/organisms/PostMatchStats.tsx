// components/organisms/PostMatchStats.tsx
'use client';
import { GameModule, PlayerId } from '@/lib/types';
import { HeatmapBoard } from './HeatmapBoard';
import { Button } from '@/components/atoms/Button';

interface PostMatchStatsProps {
  gameModule: GameModule<any, any>;
  state: any;
  settings: any;
  players: PlayerId[];
  winnerId: PlayerId | null;
}

export function PostMatchStats({ gameModule, state, settings, players, winnerId }: PostMatchStatsProps) {
  return (
    <div className="rounded-2xl bg-slate p-4 border border-wire/40 flex flex-col gap-4">
      <p className="text-lg font-display font-bold text-center">Match Complete!</p>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {players.map((playerId) => {
          const stats = gameModule.matchStats(state, playerId, settings);
          const heatmap = gameModule.heatmap(state, playerId);
          const isWinner = playerId === winnerId;

          return (
            <div
              key={playerId}
              className={`rounded-2xl p-4 border-2 flex flex-col gap-3 ${
                isWinner ? 'border-wire bg-wire/10' : 'border-transparent bg-oche'
              }`}
            >
              <div className="text-sm font-bold uppercase tracking-widest text-sisal">
                {playerId}
                {isWinner ? ' — Winner' : ''}
              </div>

              <div className="grid grid-cols-2 gap-3">
                {gameModule.statTiles.map((tile: { label: string; key: string; value: (s: any) => string | number }) => (
                  <div key={tile.key} className="text-center">
                    <div className="text-[10px] font-bold uppercase tracking-widest text-sisal">{tile.label}</div>
                    <div className="text-xl font-display font-bold">{tile.value(stats)}</div>
                  </div>
                ))}
              </div>

              <HeatmapBoard heatmap={heatmap} />
            </div>
          );
        })}
      </div>

      <Button onClick={() => (window.location.href = '/')}>Back to Dashboard</Button>
    </div>
  );
}
