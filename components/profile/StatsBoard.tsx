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

/** The two boards: everything thrown, and the subset that found a multiplier or a bull.
 *
 *  The second board gets its own callouts rather than the defaults. Sharing them meant it
 *  reported "Strongest double" — derived only from D keys, which the filter keeps in full —
 *  so both boards printed the identical figure, and "Off the board 0%", which is a property
 *  of the filter rather than of anyone's throwing. Counts per ring are things only this board
 *  knows. */
function Heatmaps({ heatmap, dartsThrown }: { heatmap: Record<string, number>; dartsThrown?: number }) {
  const specials = specialsHeatmap(heatmap);
  const specialsSummary = summarizeHeatmap(specials);
  const bulls = specialsSummary.byRing.OB + specialsSummary.byRing.IB;
  // Prefer the API's own dart count over re-summing the map, so this caption and the "N recorded
  // darts" one above it can never quote two different totals for the same period.
  const total = dartsThrown ?? summarizeHeatmap(heatmap).darts;

  return (
    // Behind a disclosure: two dartboards are by far the heaviest thing on this page, and they
    // are a thing you go looking for rather than something you need every time you check an
    // average. Closed by default even inside an open game.
    <details className="stats-disclosure">
      <summary>Shot maps</summary>
      <div className="stats-heatmaps">
        <HeatmapFigure
          title="All throws"
          caption={dartsThrown ? `${dartsThrown} recorded darts` : 'No recorded darts in this period'}
          heatmap={heatmap}
        />
        <HeatmapFigure
          title="Doubles, trebles & bulls"
          caption={total
            ? `${specialsSummary.darts} of ${total} darts found a multiplier or a bull`
            : 'No recorded darts in this period'}
          heatmap={specials}
          callouts={[
            { label: 'Trebles', value: specialsSummary.byRing.T },
            { label: 'Doubles', value: specialsSummary.byRing.D },
            { label: 'Bulls', value: bulls },
          ]}
        />
      </div>
    </details>
  );
}

/** One game's numbers. The card is bounded by a single accent edge and its own spacing —
 *  no outline, and none of the per-statistic boxes the tiles used to sit in. */
function GameStatsCard({ gameId, played, wins, winRate, tiles, heatmap, dartsThrown, defaultOpen }: {
  gameId: string; played: number; wins: number; winRate: number; tiles: Tile[];
  heatmap?: Record<string, number>; dartsThrown?: number; defaultOpen: boolean;
}) {
  const meta = GAME_META[gameId] ?? { name: gameId, accent: 'wire' as const };
  return (
    // Collapsible, with the record in the summary. Every game used to be fully expanded at
    // once: three stacked blocks of a dozen statistics each, plus two dartboards, all at the
    // same visual weight. The row you can always see — name, played, won, win rate — is the
    // part anyone actually scans; the dozen numbers are what you open a game to read.
    <details
      className="stats-game-card"
      style={{ borderColor: `var(--${meta.accent})` }}
      open={defaultOpen}
    >
      <summary className="stats-game-card-heading">
        <h3 style={{ color: `var(--${meta.accent})` }}>{meta.name}</h3>
        <span>{played} played · {wins} won · {winRate}%</span>
      </summary>
      <div className="stats-game-card-body">
        <MetricGrid metrics={tiles} cols="auto" size="sm" />
        {heatmap && <Heatmaps heatmap={heatmap} dartsThrown={dartsThrown} />}
      </div>
    </details>
  );
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
  // After mount only — sessionStorage doesn't exist during the server render.
  useEffect(() => {
    const saved = sessionStorage.getItem(PERIOD_KEY);
    if (saved && PERIOD_OPTIONS.some(option => option.value === saved)) setPeriod(saved as StatsPeriod);
  }, []);
  useEffect(() => { sessionStorage.setItem(PERIOD_KEY, period); }, [period]);
  const stats = board[period];
  const gameCards = stats.games.filter(game => GAME_META[game.gameId]);

  return <div className="flex flex-col gap-5">
    <SegmentedControl
      label="Statistics period"
      value={period}
      onChange={setPeriod}
      options={PERIOD_OPTIONS}
    />
    <MetricGrid
      cols={4}
      aria-live="polite"
      metrics={[
        { label: 'Matches', value: stats.totalMatches },
        { label: 'Win rate', value: `${stats.winRate}%` },
        { label: 'Wins', value: stats.wins },
        { label: 'Losses', value: stats.losses },
      ]}
    />
    {!compact && gameCards.length > 0 && (
      <div className="stats-game-cards">
        {gameCards.map(game => {
          // One game open on arrival, so the section isn't a wall of collapsed rows — the one
          // you've played most, which is the one you most likely came to read.
          const mostPlayed = gameCards.reduce((best, entry) => (entry.totalMatches > best.totalMatches ? entry : best), gameCards[0]);
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
              defaultOpen={game.gameId === mostPlayed.gameId}
            />
          );
        })}
      </div>
    )}
    {stats.totalMatches === 0 && (
      <EmptyState
        icon={Target}
        title="Nothing in this period yet"
        body="Finish a match and its numbers show up here. Widen the period above to see older results."
      />
    )}
  </div>;
}
