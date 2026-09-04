// components/organisms/PlayerStatTiles.tsx
import { GameModule, PlayerId, StatTileDef } from '@/lib/types';

interface PlayerStatTilesProps {
  gameModule: GameModule<any, any>;
  state: any;
  settings: any;
  playerId: PlayerId;
  displayName?: string;
  isWinner?: boolean;
}

/** A player's name header plus their computed stat-tile grid (3-dart avg, checkout %, MPR,
 *  etc. — whatever `gameModule.statTiles` defines). Shared by `PostMatchStats` (end of match)
 *  and `LiveStatsDrawer` (mid-match) so the two surfaces can never disagree on a number — both
 *  call `gameModule.matchStats` and render `gameModule.statTiles` the same way.
 *
 *  Deliberately unstyled at the card level (no border/background) — each consumer wraps this
 *  in whatever card treatment fits its own layout (e.g. PostMatchStats nests a HeatmapBoard
 *  inside the same bordered card; LiveStatsDrawer doesn't). */
export function PlayerStatTiles({ gameModule, state, settings, playerId, displayName, isWinner }: PlayerStatTilesProps) {
  const stats = gameModule.matchStats(state, playerId, settings);

  return (
    <div className="flex flex-col gap-3">
      <div className="text-sm font-bold uppercase tracking-widest text-sisal">
        {displayName ?? playerId}
        {isWinner ? ' — Winner' : ''}
      </div>

      <div className="grid grid-cols-2 gap-3">
        {gameModule.statTiles.map((tile: StatTileDef<any>) => (
          <div key={tile.key} className="text-center">
            <div className="text-[10px] font-bold uppercase tracking-widest text-sisal">{tile.label}</div>
            <div className="text-xl font-display font-bold">{tile.value(stats)}</div>
          </div>
        ))}
      </div>
    </div>
  );
}
