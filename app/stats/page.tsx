// app/stats/page.tsx
'use client';
import { LoadingIndicator } from '@/components/atoms/LoadingIndicator';
import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { useSession } from 'next-auth/react';
import { gameRegistry, GameId } from '@/lib/games/registry';
import { History } from 'lucide-react';
import {
  AppBar,
  EmptyState,
  InlineFeedback,
  MatchHistoryRow,
  SegmentedControl,
  TextLink,
  groupMatchesByDay,
} from '@/components/molecules';
import { StatsBoard } from '@/components/profile/StatsBoard';
import type { StatsBoard as Board } from '@/lib/stats/board';

interface HistoryMatch {
  id: string;
  gameId: string;
  gameName: string;
  mode: 'local' | 'remote';
  completedAt: string;
  won: boolean;
  opponents: string[];
  headline: { label: string; value: string };
}

interface HistoryResponse {
  matches: HistoryMatch[];
  summary: {
    played: number;
    wins: number;
    winRate: number;
    currentStreak: { type: 'win' | 'loss' | null; count: number };
  };
}

/** "All Games" plus one option per registered game. Built once at module scope — the
 *  registry is static, and rebuilding this array per render would defeat the control's
 *  memoisation for no benefit. */
const GAME_FILTER_OPTIONS = [
  { value: 'all' as const, label: 'All games' },
  ...(Object.keys(gameRegistry) as GameId[]).map((id) => ({
    value: id,
    label: id.charAt(0).toUpperCase() + id.slice(1),
  })),
];

/** "3 wins" is a fact; "3 W" is a column header abbreviation that only made sense next to
 *  other column headers. */
function streakLabel(streak: { type: 'win' | 'loss' | null; count: number }): string {
  if (streak.type === null || streak.count === 0) return 'None';
  const noun = streak.type === 'win' ? 'win' : 'loss';
  return `${streak.count} ${streak.count === 1 ? noun : noun === 'win' ? 'wins' : 'losses'}`;
}

/** The chosen game filter survives a trip into a match and back. Session-scoped, because
 *  "what I was looking at just now" is a property of this visit, not a lasting preference. */
const FILTER_KEY = 'oche:stats:gameFilter';
const VIEW_KEY = 'oche:stats:view';

export default function StatsPage() {
  const router = useRouter();
  const [view, setView] = useState<'performance' | 'history'>('performance');
  const { data: session, status: sessionStatus } = useSession();
  const [data, setData] = useState<HistoryResponse | null>(null);
  const [error, setError] = useState(false);
  const [board, setBoard] = useState<Board | null>(null);
  const [boardError, setBoardError] = useState(false);
  const [retry, setRetry] = useState(0);
  useEffect(() => {
    if (sessionStatus !== 'authenticated') return;
    const controller = new AbortController();
    setBoardError(false);
    fetch('/api/user/stats', { signal: controller.signal }).then(async res => { if (!res.ok) throw new Error(); const data = await res.json(); setBoard(data.periods); }).catch(() => { if (!controller.signal.aborted) setBoardError(true); });
    return () => controller.abort();
  }, [sessionStatus, retry]);
  const [gameFilter, setGameFilter] = useState<GameId | null>(null);
  // Restored after mount, never during render: sessionStorage does not exist on the server,
  // so reading it any earlier would hydrate a different tree than the one rendered there.
  useEffect(() => {
    const savedView = sessionStorage.getItem(VIEW_KEY);
    if (savedView === 'history' || savedView === 'performance') setView(savedView);
    const saved = sessionStorage.getItem(FILTER_KEY);
    if (saved && saved in gameRegistry) setGameFilter(saved as GameId);
  }, []);
  useEffect(() => {
    if (gameFilter) sessionStorage.setItem(FILTER_KEY, gameFilter);
    else sessionStorage.removeItem(FILTER_KEY);
  }, [gameFilter]);

  useEffect(() => {
    if (sessionStatus === 'unauthenticated') {
      router.replace('/signin');
    }
  }, [sessionStatus, router]);

  useEffect(() => {
    if (sessionStatus !== 'authenticated') return;
    let cancelled = false;
    (async () => {
      const url = gameFilter ? `/api/matches/history?gameId=${gameFilter}` : '/api/matches/history';
      try {
      const res = await fetch(url);
      if (cancelled) return;
      if (!res.ok) {
        setError(true);
        return;
      }
      const json = (await res.json()) as HistoryResponse;
      if (!cancelled) {
        setError(false);
        setData(json);
      }
      } catch { if (!cancelled) setError(true); }
    })();
    return () => {
      cancelled = true;
    };
  }, [sessionStatus, gameFilter]);

  if (sessionStatus !== 'authenticated' || !session?.user) {
    return <LoadingIndicator fullPage />;
  }

  const groups = groupMatchesByDay(data?.matches ?? []);

  return (
    <main className="page-gutters account-page stats-page">
      <AppBar eyebrow="Your record" title="Statistics" />

      <SegmentedControl label="Statistics view" value={view} onChange={nextView => {
        setView(nextView);
        sessionStorage.setItem(VIEW_KEY, nextView);
      }}
        options={[{ value: 'performance', label: 'Performance' }, { value: 'history', label: 'Match history' }]} />
      {view === 'performance' ? <section className="stats-performance" aria-label="Performance">
        {boardError ? (
          <InlineFeedback tone="error">
            Could not load performance.{' '}
            <button className="underline" onClick={() => setRetry((n) => n + 1)}>Try again</button>
          </InlineFeedback>
        ) : board ? (
          <StatsBoard board={board} showHeatmap />
        ) : (
          <div className="flex flex-col gap-4" aria-busy="true">
            <div className="skeleton h-11" />
            <div className="skeleton h-24" />
          </div>
        )}
      </section> : <section className="flex flex-col gap-4">
        <div className="section-header"><h2>Match history</h2></div>

        {error ? (
          <InlineFeedback tone="error">Could not load your match history. Try refreshing the page.</InlineFeedback>
        ) : data === null ? (
          <div className="flex flex-col gap-3" aria-busy="true">
            <div className="skeleton h-20" />
            {[0, 1, 2].map((i) => <div key={i} className="skeleton h-16" />)}
          </div>
        ) : (
          <>
            <p className="history-summary">{data.summary.played} matches · {Math.round(data.summary.winRate * 100)}% wins · Streak: {streakLabel(data.summary.currentStreak)}<span>All time</span></p>

            <SegmentedControl
              label="Filter by game"
              value={gameFilter ?? 'all'}
              onChange={(value) => setGameFilter(value === 'all' ? null : (value as GameId))}
              options={GAME_FILTER_OPTIONS}
            />

            {data.matches.length === 0 ? (
              <EmptyState
                icon={History}
                title={gameFilter ? `No ${gameFilter} matches yet` : 'No completed matches yet'}
                body={
                  gameFilter
                    ? 'Switch the filter above, or play a round of this game to start a record.'
                    : 'Finish a match and it lands here with its result and headline number.'
                }
                action={<TextLink href="/">Start a match</TextLink>}
              />
            ) : (
              /* Grouped by day, so a long history reads in chunks. Each group is its own
                 list, which is also what a screen reader announces. */
              groups.map((group) => (
                <section key={group.key} className="flex flex-col gap-2" aria-label={group.label}>
                  <h3 className="history-group"><span className="t-label">{group.label}</span></h3>
                  <div className="flex flex-col gap-2">
                    {group.matches.map((match) => <MatchHistoryRow key={match.id} match={match} />)}
                  </div>
                </section>
              ))
            )}
          </>
        )}
      </section>}
    </main>
  );
}
