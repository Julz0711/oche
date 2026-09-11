'use client';
import { useState } from 'react';
import type { StatsBoard as Board, StatsPeriod } from '@/lib/stats/board';
import type { X01AggregateStats, CricketAggregateStats, CopycatAggregateStats } from '@/lib/stats/aggregateGameStats';
import { HeatmapBoard } from '@/components/organisms/HeatmapBoard';

interface Tile { label: string; value: string }

/** Heatmap keys are `${ring}${sector}` (ring one of S/D/T/OB/IB) or the fixed `M0` for a miss —
 *  see lib/stats/board.ts. A double/inner-bull or treble/outer-bull is unambiguous from the key's
 *  leading letter(s), so this needs no extra data beyond the same heatmap already fetched. */
function finishingHeatmap(heatmap: Record<string, number>): Record<string, number> {
  const out: Record<string, number> = {};
  for (const [key, count] of Object.entries(heatmap)) {
    if (key.startsWith('D') || key.startsWith('T') || key.startsWith('OB') || key.startsWith('IB')) out[key] = count;
  }
  return out;
}

/** Display name and accent token per game — mirrors the dashboard's GAME_IDENTITY mapping
 *  (app/(dashboard)/page.tsx) so a game reads as the same "thing" everywhere in the app. */
const GAME_META: Record<string, { name: string; accent: 'wire' | 'double' | 'treble' }> = {
  x01: { name: 'X01', accent: 'wire' },
  cricket: { name: 'Cricket', accent: 'double' },
  copycat: { name: 'Copycat', accent: 'treble' },
};

function x01Tiles(s: X01AggregateStats): Tile[] {
  return [
    { label: '3-dart avg', value: s.avg3Dart.toFixed(1) },
    { label: 'First 9 avg', value: s.firstNineAvg.toFixed(1) },
    { label: 'Checkout %', value: `${s.checkoutRate.toFixed(0)}%` },
    { label: 'Best visit', value: String(s.bestVisit) },
    { label: 'High checkout', value: s.highestCheckout ? String(s.highestCheckout) : '—' },
    { label: '180s', value: String(s.visits180) },
    { label: '140–179', value: String(s.visits140) },
    { label: '100–139', value: String(s.visits100) },
    { label: 'Busts', value: String(s.busts) },
    { label: 'Busts/game', value: s.bustsPerMatch.toFixed(1) },
    { label: 'Doubles hit %', value: `${s.doublesRate.toFixed(0)}%` },
    { label: 'Trebles hit %', value: `${s.treblesRate.toFixed(0)}%` },
    { label: 'Most common double out', value: s.commonDoubleOut ?? '—' },
  ];
}

function cricketTiles(s: CricketAggregateStats): Tile[] {
  return [
    { label: 'MPR', value: s.mpr.toFixed(2) },
    { label: 'Total marks', value: String(s.totalMarks) },
    { label: 'Points scored', value: String(s.pointsScored) },
  ];
}

function copycatTiles(s: CopycatAggregateStats): Tile[] {
  return [
    { label: 'Avg visit', value: s.avgVisit.toFixed(1) },
    { label: 'Points won', value: String(s.points) },
    { label: 'Match %', value: `${s.matchRate.toFixed(0)}%` },
    { label: 'Double finishes', value: String(s.doubleFinishes) },
  ];
}

function GameStatsCard({ gameId, played, wins, winRate, tiles, heatmap, dartsThrown }: {
  gameId: string; played: number; wins: number; winRate: number; tiles: Tile[];
  heatmap?: Record<string, number>; dartsThrown?: number;
}) {
  const meta = GAME_META[gameId] ?? { name: gameId, accent: 'wire' as const };
  return (
    <section className="stats-game-card" style={{ borderColor: `var(--${meta.accent})` }} aria-labelledby={`stats-game-${gameId}`}>
      <div className="stats-game-card-heading">
        <h3 id={`stats-game-${gameId}`} style={{ color: `var(--${meta.accent})` }}>{meta.name}</h3>
        <span>{played} played · {wins}W · {winRate}%</span>
      </div>
      <dl className="player-stat-grid stats-game-tiles">
        {tiles.map(tile => <div key={tile.label}><dt>{tile.label}</dt><dd>{tile.value}</dd></div>)}
      </dl>
      {heatmap && (
        <div className="stats-heatmaps">
          <div className="stats-heatmap-item">
            <h4>All throws</h4>
            <p>{dartsThrown ? `${dartsThrown} recorded darts` : 'No recorded darts in this period'}</p>
            <HeatmapBoard heatmap={heatmap} />
          </div>
          <div className="stats-heatmap-item">
            <h4>Finishing throws</h4>
            <p>Doubles, trebles &amp; bulls</p>
            <HeatmapBoard heatmap={finishingHeatmap(heatmap)} />
          </div>
        </div>
      )}
    </section>
  );
}

export function StatsBoard({ board, compact = false, showHeatmap = false }: { board: Board; compact?: boolean; showHeatmap?: boolean }) {
  const [period, setPeriod] = useState<StatsPeriod>('all');
  const stats = board[period];
  const gameCards = stats.games.filter(game => GAME_META[game.gameId]);

  return <div className="flex flex-col gap-3">
    <div className="period-picker" role="group" aria-label="Statistics period">
      {([['day', 'Daily'], ['week', 'Weekly'], ['month', 'Monthly'], ['all', 'All time']] as const).map(([key, label]) =>
        <button key={key} type="button" aria-pressed={period === key} onClick={() => setPeriod(key)}>{label}</button>)}
    </div>
    <dl className="profile-totals" aria-live="polite">
      {([['Played', stats.totalMatches], ['Win rate', `${stats.winRate}%`], ['Wins', stats.wins], ['Losses', stats.losses]] as const).map(([label, value]) =>
        <div key={label}><dt>{label}</dt><dd>{value}</dd></div>)}
    </dl>
    {!compact && gameCards.length > 0 && (
      <div className="stats-game-cards">
        {gameCards.map(game => {
          const tiles =
            game.gameId === 'x01' && stats.x01 ? x01Tiles(stats.x01) :
            game.gameId === 'cricket' && stats.cricket ? cricketTiles(stats.cricket) :
            game.gameId === 'copycat' && stats.copycat ? copycatTiles(stats.copycat) :
            [];
          return (
            <GameStatsCard
              key={game.gameId}
              gameId={game.gameId}
              played={game.totalMatches}
              wins={game.wins}
              winRate={game.winRate}
              tiles={tiles}
              heatmap={showHeatmap && game.gameId === 'x01' ? stats.heatmap : undefined}
              dartsThrown={game.gameId === 'x01' ? stats.dartsThrown : undefined}
            />
          );
        })}
      </div>
    )}
    {stats.totalMatches === 0 && <p className="text-sm text-sisal">No completed matches in this period.</p>}
  </div>;
}
