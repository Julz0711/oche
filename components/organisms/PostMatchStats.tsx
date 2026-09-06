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
    <Panel notch="card" className="p-4 flex flex-col gap-4">
      <p className="text-lg font-display font-bold text-center">Match Complete!</p>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {players.map((playerId) => {
          const heatmap = gameModule.heatmap(state, playerId);
          const isWinner = playerId === winnerId;

          return (
            <Panel key={playerId} notch="none" accent="wire" active={isWinner} className="p-4 flex flex-col gap-3">
              <PlayerStatTiles
                gameModule={gameModule}
                state={state}
                settings={settings}
                playerId={playerId}
                displayName={displayNames.get(playerId)}
                isWinner={isWinner}
              />
              <HeatmapBoard heatmap={heatmap} />
            </Panel>
          );
        })}
      </div>

      <div className="flex gap-3 justify-center">
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
