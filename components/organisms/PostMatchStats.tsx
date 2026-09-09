// components/organisms/PostMatchStats.tsx
'use client';
import { GameModule, PlayerId } from '@/lib/types';
import { HeatmapBoard } from './HeatmapBoard';
import { Button } from '@/components/atoms/Button';
import { Panel } from '@/components/atoms';
import { ShareResultButton, ShareResultPlayer } from './ShareResultButton';
import { PlayerStatTiles } from './PlayerStatTiles';

interface PostMatchStatsProps {
  matchId: string;
  gameModule: GameModule<any, any>;
  state: any;
  settings: any;
  players: PlayerId[];
  winnerId: PlayerId | null;
  displayNames: Map<string, string>;
}

export function PostMatchStats({
  matchId,
  gameModule,
  state,
  settings,
  players,
  winnerId,
  displayNames,
}: PostMatchStatsProps) {
  const headlineTile = gameModule.statTiles[0];
  const matchInfoText = gameModule
    .matchInfo(state, settings)
    .map((info: { label: string; value: string }) => `${info.label} ${info.value}`)
    .join(' · ');

  const sharePlayers: ShareResultPlayer[] = players.map((playerId) => {
    const stats = gameModule.matchStats(state, playerId, settings);
    return {
      name: displayNames.get(playerId) ?? playerId,
      isWinner: playerId === winnerId,
      statLabel: headlineTile.label,
      statValue: String(headlineTile.value(stats)),
    };
  });

  return (
    <Panel notch="card" className="p-2.5 sm:p-3 flex flex-col gap-2.5">
      <h2 className="text-[20px] leading-6 font-display font-bold text-center">Match Complete!</h2>

      <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 items-start">
        {players.map((playerId) => {
          const heatmap = gameModule.heatmap(state, playerId);
          const isWinner = playerId === winnerId;

          return (
            <Panel key={playerId} notch="none" accent="wire" active={isWinner} activeBadge={false} className="p-2.5 flex flex-col gap-1">
              <PlayerStatTiles
                gameModule={gameModule}
                state={state}
                settings={settings}
                playerId={playerId}
                displayName={displayNames.get(playerId) ?? playerId.replace(/^player(\d+)$/, 'Player $1')}
                isWinner={isWinner}
              />
              <details className="summary-heatmap">
                <summary>Throw heatmap</summary>
                <div className="w-full max-w-[220px] mx-auto"><HeatmapBoard heatmap={heatmap} /></div>
              </details>
            </Panel>
          );
        })}
      </div>

      <div className="flex flex-col sm:flex-row gap-2 sm:gap-3 justify-center">
        <ShareResultButton
          matchId={matchId}
          gameName={gameModule.name}
          matchInfo={matchInfoText}
          players={sharePlayers}
        />
        <Button onClick={() => (window.location.href = '/')}>Back to Dashboard</Button>
      </div>
    </Panel>
  );
}
