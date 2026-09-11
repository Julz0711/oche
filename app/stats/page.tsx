// app/stats/page.tsx
'use client';
import { LoadingIndicator } from '@/components/atoms/LoadingIndicator';
import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { useSession } from 'next-auth/react';
import { gameRegistry, GameId } from '@/lib/games/registry';
import { Panel } from '@/components/atoms';
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

function GameFilterPills({ value, onChange }: { value: GameId | null; onChange: (value: GameId | null) => void }) {
  const gameIds = Object.keys(gameRegistry) as GameId[];
  return (
    <div className="stats-filter flex gap-1.5 sm:gap-2 flex-wrap">
      <button
        type="button"
        onClick={() => onChange(null)}
        aria-pressed={value === null}
        className={`min-h-11 px-3 sm:px-4 py-2 rounded-none text-sm font-bold transition-colors ${
          value === null ? 'bg-wire text-oche' : 'bg-oche text-sisal border border-sisal/30 hover:opacity-80'
        }`}
      >
        All Games
      </button>
      {gameIds.map((id) => (
        <button
          key={id}
          type="button"
          onClick={() => onChange(id)}
          aria-pressed={value === id}
          className={`min-h-11 px-3 sm:px-4 py-2 rounded-none text-sm font-bold capitalize transition-colors ${
            value === id ? 'bg-wire text-oche' : 'bg-oche text-sisal border border-sisal/30 hover:opacity-80'
          }`}
        >
          {id}
        </button>
      ))}
    </div>
  );
}

export default function StatsPage() {
  const router = useRouter();
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

  return (
    <div className="page-gutters min-h-screen text-chalk p-3 md:p-8 flex flex-col items-center">
      <div className="w-full max-w-3xl flex flex-col gap-3 md:gap-8 pt-0 md:pt-12">
        <header className="flex flex-col gap-3">
          <h1 className="page-title">Your Stats</h1>
          <p className="text-sisal text-sm md:text-base mt-1">Every completed match, all in one place</p>
        </header>

        <Panel notch="panel" className="account-section stats-performance"><div className="section-heading"><h2>Performance</h2></div>{boardError ? <p role="alert" className="text-sm text-sisal">Could not load performance. <button className="text-wire min-h-11" onClick={() => setRetry(n => n + 1)}>Try again</button></p> : board ? <StatsBoard board={board} showHeatmap /> : <LoadingIndicator label="Loading performance…" />}</Panel>
        <h2 className="font-display text-[24px]">Match history</h2>
        {error ? (
          <p className="text-sisal text-center py-8">Could not load your stats. Try refreshing the page.</p>
        ) : data === null ? (
          <div className="grid grid-cols-3 gap-2 md:gap-4">
            {[0, 1, 2].map((i) => (
              <div key={i} className="h-20 bg-slate animate-pulse" style={{ clipPath: 'polygon(0 0, 100% 0, 100% calc(100% - 13px), calc(100% - 13px) 100%, 0 100%)' }} />
            ))}
          </div>
        ) : (
          <>
            <dl className="history-summary">
              <div><dt>Played</dt><dd>{data.summary.played}</dd></div>
              <div><dt>Win rate</dt><dd>{Math.round(data.summary.winRate * 100)}%</dd></div>
              <div><dt>Streak</dt><dd>{data.summary.currentStreak.type === null ? 'None' : `${data.summary.currentStreak.count} ${data.summary.currentStreak.type === 'win' ? 'W' : 'L'}`}</dd></div>
            </dl>

            <GameFilterPills value={gameFilter} onChange={setGameFilter} />

            {data.matches.length === 0 ? (
              <p className="text-sisal text-center py-8">No completed matches yet. Play a game to see your results.</p>
            ) : (
              <div className="flex flex-col gap-3">
                {data.matches.map((match) => (
                  <Panel
                    key={match.id}
                    notch="panel"
                    className="p-3 md:p-4 flex items-center justify-between gap-2 md:gap-4"
                  >
                    <div className="min-w-0 flex flex-col gap-1">
                      <div className="flex items-center gap-2">
                        <span
                          className={`text-[10px] font-bold uppercase tracking-widest rounded-none px-2.5 py-1 ${
                            match.won ? 'bg-double text-chalk' : 'bg-treble text-chalk'
                          }`}
                        >
                          {match.won ? 'Win' : 'Loss'}
                        </span>
                        <span className="font-bold capitalize">{match.gameName}</span>
                      </div>
                      <span className="text-xs text-sisal break-words">
                        {new Date(match.completedAt).toLocaleDateString()}
                        {match.opponents.length > 0 ? ` · vs ${match.opponents.join(', ')}` : ''}
                      </span>
                    </div>
                    <div className="shrink-0 max-w-[35%] text-right flex flex-col items-end gap-0.5">
                      <span className="text-[10px] font-bold uppercase tracking-widest text-sisal">
                        {match.headline.label}
                      </span>
                      <span className="text-lg font-display font-bold">{match.headline.value}</span>
                    </div>
                  </Panel>
                ))}
              </div>
            )}
          </>
        )}
      </div>
    </div>
  );
}
