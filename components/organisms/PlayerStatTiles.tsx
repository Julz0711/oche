import { GameModule, PlayerId } from '@/lib/types';

interface PlayerStatTilesProps {
  gameModule: GameModule;
  state: any;
  settings: any;
  playerId: PlayerId;
  displayName?: string;
  isWinner?: boolean;
}

interface Metric { label: string; value: string | number }

function MetricGrid({ metrics }: { metrics: Metric[] }) {
  return <dl className="player-stat-grid">
    {metrics.map(metric => <div key={metric.label}>
      <dt>{metric.label}</dt>
      <dd>{metric.value}</dd>
    </div>)}
  </dl>;
}

/** Live and final views use the same completed-visit stats. Secondary metrics are
 * optional, keeping the first comparison short regardless of the game. */
export function PlayerStatTiles({ gameModule, state, settings, playerId, displayName, isWinner }: PlayerStatTilesProps) {
  const stats = gameModule.matchStats(state, playerId, settings);
  const counts = gameModule.heatmap(state, playerId);
  let darts = 0, doubles = 0, trebles = 0, bulls = 0, misses = 0;
  for (const [segment, count] of Object.entries(counts)) {
    darts += count;
    if (segment.startsWith('D') || segment.startsWith('IB')) doubles += count;
    if (segment.startsWith('T')) trebles += count;
    if (segment.startsWith('IB') || segment.startsWith('OB')) bulls += count;
    if (segment.startsWith('M')) misses += count;
  }
  const metrics: Metric[] = [
    ...gameModule.statTiles.map(tile => ({ label: tile.label, value: tile.value(stats) })),
    { label: 'Darts thrown', value: darts },
    { label: 'Misses', value: misses },
    { label: 'Double hits', value: doubles },
    { label: 'Treble hits', value: trebles },
    { label: 'Bull hits', value: bulls },
  ];

  return (
    <section className="player-stats" aria-label={`Statistics for ${displayName ?? playerId}`}>
      <div className="player-stats-heading">
        <h3>{displayName ?? playerId.replace(/^player(\d+)$/, 'Player $1')}</h3>
        {isWinner && <span className="text-wire">Winner</span>}
      </div>
      <MetricGrid metrics={metrics.slice(0, 6)} />
      <details className="additional-stats">
        <summary>More stats</summary>
        <MetricGrid metrics={metrics.slice(6)} />
        <p className="stat-note">Hit counts include busts. Double hits include inner bulls; bull hits include both bulls.</p>
      </details>
    </section>
  );
}
