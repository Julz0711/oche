'use client';
import { useEffect, useState } from 'react';
import type { StatsBoard as Board, StatsPeriod } from '@/lib/stats/board';
import type { X01AggregateStats, CricketAggregateStats, CopycatAggregateStats } from '@/lib/stats/aggregateGameStats';
import { Target } from 'lucide-react';
import { EmptyState, MetricGrid, SegmentedControl, HeatmapFigure, summarizeHeatmap } from '@/components/molecules';
import type { Metric } from '@/components/molecules';

type Tile = Metric;

/** Every dart that landed in a multiplier or a bull.
 *
 *  This used to be presented as "Finishing throws", which it is not and never was: it keeps
 *  every D/T/OB/IB hit in the period, not the darts that actually checked out a leg — the
 *  data has no notion of which dart finished anything. It is the board's high-value regions,
 *  so it is now labelled as exactly that.
 *
 *  Heatmap keys are `${ring}${sector}` (ring one of S/D/T/OB/IB) or the fixed `M0` for a miss —
 *  see lib/stats/board.ts. A double/inner-bull or treble/outer-bull is unambiguous from the key's
 *  leading letter(s), so this needs no extra data beyond the same heatmap already fetched. */
function specialsHeatmap(heatmap: Record<string, number>): Record<string, number> {
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
    { label: 'Top double out', value: s.commonDoubleOut ?? '—' },
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

/** One board with two views. The filtered view uses ring counts: an off-board rate
 *  would describe the filter, rather than the player's accuracy. */
function ShotMap({ heatmap, dartsThrown }: { heatmap: Record<string, number>; dartsThrown?: number }) {
  const [mode, setMode] = useState<'all' | 'specials'>('all');
  const specials = specialsHeatmap(heatmap);
  const summary = summarizeHeatmap(specials);
  const total = dartsThrown ?? summarizeHeatmap(heatmap).darts;
  return <details className="stats-disclosure shot-map" open>
    <summary>Shot map</summary>
    <div className="shot-map-content">
      <SegmentedControl label="Shot map filter" value={mode} onChange={setMode}
        options={[{ value: 'all', label: 'All throws' }, { value: 'specials', label: 'Doubles, trebles & bulls' }]} />
      <HeatmapFigure key={mode}
        title={mode === 'all' ? 'All throws' : 'Doubles, trebles & bulls'}
        caption={mode === 'all' ? total + ' recorded darts' : summary.darts + ' of ' + total + ' darts'}
        heatmap={mode === 'all' ? heatmap : specials}
        callouts={mode === 'all' ? undefined : [
          { label: 'Trebles', value: summary.byRing.T },
          { label: 'Doubles', value: summary.byRing.D },
          { label: 'Bulls', value: summary.byRing.OB + summary.byRing.IB },
        ]} />
    </div>
  </details>;
}

function GameStatsCard({ gameId, played, wins, tiles, heatmap, dartsThrown }: {
  gameId: string; played: number; wins: number; tiles: Tile[];
  heatmap?: Record<string, number>; dartsThrown?: number;
}) {
  const meta = GAME_META[gameId];
  const primary = gameId === 'x01' ? [tiles[0], tiles[2], tiles[3]]
    : gameId === 'copycat' ? [tiles[0], tiles[2], tiles[1]] : tiles;
  const groups = gameId === 'x01' ? [
    { title: 'Scoring', metrics: [tiles[1], tiles[5], tiles[6], tiles[7]] },
    { title: 'Finishing', metrics: [tiles[4], tiles[10], tiles[12]] },
    { title: 'Accuracy', metrics: [tiles[11], tiles[8], tiles[9]] },
  ] : gameId === 'copycat' ? [{ title: 'Finishing', metrics: [tiles[3]] }] : [];
  return <details className="game-performance" data-game={gameId} open>
    <summary className="game-performance-heading">
      <span className="game-performance-name">{meta.name}</span><span>{played} played · {wins} won</span>
    </summary>
    <div className="game-performance-content">
    <MetricGrid metrics={primary.filter(Boolean)} cols={3} className="performance-headlines" />
    {groups.length > 0 && <details className="stats-disclosure" open>
      <summary>Detailed statistics</summary>
      <div className="stat-detail-groups">{groups.map(group => <section key={group.title}>
        <h4>{group.title}</h4>
        <dl>{group.metrics.filter(Boolean).map(metric => <div key={metric.label}>
          <dt>{metric.label}</dt><dd>{metric.value}</dd>
        </div>)}</dl>
      </section>)}</div>
    </details>}
    {heatmap && <ShotMap heatmap={heatmap} dartsThrown={dartsThrown} />}
    </div>
  </details>;
}

const PERIOD_OPTIONS = [
  { value: 'day', label: 'Daily' },
  { value: 'week', label: 'Weekly' },
  { value: 'month', label: 'Monthly' },
  { value: 'all', label: 'All time' },
] as const satisfies readonly { value: StatsPeriod; label: string }[];

/** The chosen period is remembered for the visit, so opening a match and coming back doesn't
 *  silently reset a reader from "Weekly" to "All time" under them. */
const PERIOD_KEY = 'oche:stats:period';

export function StatsBoard({ board, compact = false, showHeatmap = false }: { board: Board; compact?: boolean; showHeatmap?: boolean }) {
  const [period, setPeriod] = useState<StatsPeriod>('all');
  const [gameFilter, setGameFilter] = useState('x01');
  useEffect(() => {
    const saved = sessionStorage.getItem(PERIOD_KEY);
    if (saved && PERIOD_OPTIONS.some(option => option.value === saved)) setPeriod(saved as StatsPeriod);
  }, []);
  const stats = board[compact ? 'all' : period];
  const gameCards = Object.keys(GAME_META).flatMap(id => stats.games.filter(game => game.gameId === id));

  return <div className="stats-board" data-compact={compact || undefined}>
    {!compact && <div className="stats-overview-heading"><h2>Overview</h2><label className="stats-period"><span className="sr-only">Period</span>
      <select aria-label="Statistics period" value={period} onChange={event => {
        setPeriod(event.target.value as StatsPeriod);
        sessionStorage.setItem(PERIOD_KEY, event.target.value);
      }}>
        {PERIOD_OPTIONS.map(option => <option value={option.value} key={option.value}>{option.label}</option>)}
      </select>
    </label></div>}
    <dl className="record-summary" aria-live="polite">
      <div><dt>Matches</dt><dd>{stats.totalMatches}</dd></div>
      <div><dt>Win rate</dt><dd>{stats.winRate}%</dd></div>
      <div className="record-results"><dt>Record</dt><dd><span>{stats.wins} wins</span><span>{stats.losses} losses</span></dd></div>
    </dl>
    {!compact && <>
      <SegmentedControl label="Performance game" value={gameFilter} onChange={setGameFilter}
        className="performance-game-tabs"
        options={Object.entries(GAME_META).map(([id, meta]) => ({
          value: id, label: <span data-game={id}>{meta.name}</span>,
        }))} />
      <div className="game-accordions">{gameCards.filter(game => game.gameId === gameFilter).map(game => {
      const tiles = game.gameId === 'x01' && stats.x01 ? x01Tiles(stats.x01)
        : game.gameId === 'cricket' && stats.cricket ? cricketTiles(stats.cricket)
        : game.gameId === 'copycat' && stats.copycat ? copycatTiles(stats.copycat) : [];
      return <GameStatsCard key={period + gameFilter + game.gameId} gameId={game.gameId} played={game.totalMatches}
        wins={game.wins} tiles={tiles}
        heatmap={showHeatmap && game.gameId === 'x01' ? stats.heatmap : undefined}
        dartsThrown={game.gameId === 'x01' ? stats.dartsThrown : undefined} />;
    })}</div>
      {stats.totalMatches > 0 && !gameCards.some(game => game.gameId === gameFilter) &&
        <EmptyState icon={Target} title={'No ' + GAME_META[gameFilter].name + ' matches in this period'}
          body="Choose another game or a longer period to see your results." />}
    </>}
    {stats.totalMatches === 0 && <EmptyState icon={Target} title="Nothing in this period yet"
      body="Finish a match or choose a longer period to see your results." />}
  </div>;
}
