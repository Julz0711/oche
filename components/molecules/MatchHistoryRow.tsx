import { Panel } from '@/components/atoms';

export interface MatchHistoryItem {
  id: string;
  gameName: string;
  completedAt: string;
  won: boolean;
  opponents: string[];
  headline: { label: string; value: string };
}

/** Win / Loss as a quiet pill rather than a saturated slab. The word carries the meaning, so
 *  nothing here depends on being able to tell red from green. */
export function ResultBadge({ won }: { won: boolean }) {
  return (
    <span className="result-badge" data-result={won ? 'win' : 'loss'}>
      {won ? 'Win' : 'Loss'}
    </span>
  );
}

/**
 * One row of match history.
 *
 * Everything sits on a fixed two-column grid, so the badge, game name, metadata and the
 * headline metric land on the same x positions all the way down the list — the headline
 * label changes per game (`POINTS`, `3-DART AVG`, `MPR`) and used to drag the numbers
 * around with it, which is what made the list hard to scan.
 */
export function MatchHistoryRow({ match }: { match: MatchHistoryItem }) {
  const when = new Date(match.completedAt);
  return (
    <Panel className="history-row">
      <div className="history-row-main">
        <div className="history-row-title">
          <ResultBadge won={match.won} />
          <strong className="capitalize">{match.gameName}</strong>
        </div>
        <span className="history-row-meta">
          <time dateTime={when.toISOString()}>
            {when.toLocaleTimeString(undefined, { hour: 'numeric', minute: '2-digit' })}
          </time>
          {match.opponents.length > 0 ? ` · vs ${match.opponents.join(', ')}` : ' · Solo'}
        </span>
      </div>
      <dl className="history-row-metric">
        <dt>{match.headline.label}</dt>
        <dd>{match.headline.value}</dd>
      </dl>
    </Panel>
  );
}

/**
 * Groups matches under `Today` / `Yesterday` / a date, newest first.
 *
 * Pure so it can be unit tested without a DOM: takes the list and the day to treat as
 * "today" (defaulting to now), returns the rendered group order.
 */
export function groupMatchesByDay<T extends { completedAt: string }>(
  matches: readonly T[],
  now: Date = new Date()
): { key: string; label: string; matches: T[] }[] {
  const dayKey = (date: Date) =>
    `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}-${String(date.getDate()).padStart(2, '0')}`;
  const today = dayKey(now);
  const yesterdayDate = new Date(now);
  yesterdayDate.setDate(yesterdayDate.getDate() - 1);
  const yesterday = dayKey(yesterdayDate);

  const groups = new Map<string, { key: string; label: string; matches: T[] }>();
  for (const match of matches) {
    const date = new Date(match.completedAt);
    const key = dayKey(date);
    if (!groups.has(key)) {
      const label =
        key === today
          ? 'Today'
          : key === yesterday
            ? 'Yesterday'
            : date.toLocaleDateString(undefined, {
                month: 'short',
                day: 'numeric',
                // Only name the year once the match is from a different one — "Sep 7" reads
                // better than "Sep 7, 2026" for the 99% of history that is recent.
                ...(date.getFullYear() === now.getFullYear() ? {} : { year: 'numeric' }),
              });
      groups.set(key, { key, label, matches: [] });
    }
    groups.get(key)!.matches.push(match);
  }
  return [...groups.values()];
}
