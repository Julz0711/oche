// app/stats/page.tsx
'use client';
import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { useSession } from 'next-auth/react';
import { gameRegistry, GameId } from '@/lib/games/registry';

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

function SummaryCard({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-2xl bg-slate p-4 flex flex-col gap-1">
      <span className="text-[11px] font-bold uppercase tracking-widest text-sisal">{label}</span>
      <span className="text-3xl font-display font-bold">{value}</span>
    </div>
  );
}

function GameFilterPills({ value, onChange }: { value: GameId | null; onChange: (value: GameId | null) => void }) {
  const gameIds = Object.keys(gameRegistry) as GameId[];
  return (
    <div className="flex gap-2 flex-wrap">
      <button
        type="button"
        onClick={() => onChange(null)}
        aria-pressed={value === null}
        className={`px-4 py-2 rounded-full text-sm font-bold transition-colors ${
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
          className={`px-4 py-2 rounded-full text-sm font-bold capitalize transition-colors ${
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
      const res = await fetch(url);
      if (!res.ok || cancelled) return;
      const json = (await res.json()) as HistoryResponse;
      if (!cancelled) setData(json);
    })();
    return () => {
      cancelled = true;
    };
  }, [sessionStatus, gameFilter]);

  if (sessionStatus !== 'authenticated' || !session?.user) {
    return <div className="min-h-screen bg-oche text-chalk flex items-center justify-center">Loading...</div>;
  }

  return (
    <div className="min-h-screen bg-oche text-chalk p-4 md:p-8 flex flex-col items-center">
      <div className="w-full max-w-3xl flex flex-col gap-6 md:gap-8 pt-6 md:pt-12">
        <header className="flex flex-col">
          <h1 className="text-2xl sm:text-3xl md:text-4xl font-display font-bold tracking-tight leading-none">
            Your Stats
          </h1>
          <p className="text-sisal text-sm md:text-base mt-1">Every completed match, all in one place</p>
        </header>

        {data === null ? (
          <div className="grid grid-cols-3 gap-4">
            {[0, 1, 2].map((i) => (
              <div key={i} className="h-20 rounded-2xl bg-slate animate-pulse" />
            ))}
          </div>
        ) : (
          <>
            <div className="grid grid-cols-3 gap-4">
              <SummaryCard label="Matches Played" value={String(data.summary.played)} />
              <SummaryCard label="Win Rate" value={`${Math.round(data.summary.winRate * 100)}%`} />
              <SummaryCard
                label="Current Streak"
                value={
                  data.summary.currentStreak.type === null
                    ? '—'
                    : `${data.summary.currentStreak.count} ${data.summary.currentStreak.type === 'win' ? 'W' : 'L'}`
                }
              />
            </div>

            <GameFilterPills value={gameFilter} onChange={setGameFilter} />

            {data.matches.length === 0 ? (
              <p className="text-sisal text-center py-8">No completed matches yet — go play one.</p>
            ) : (
              <div className="flex flex-col gap-3">
                {data.matches.map((match) => (
                  <div
                    key={match.id}
                    className="rounded-2xl bg-slate p-4 flex items-center justify-between gap-4"
                  >
                    <div className="flex flex-col gap-1">
                      <div className="flex items-center gap-2">
                        <span
                          className={`text-[10px] font-bold uppercase tracking-widest rounded-full px-2.5 py-1 ${
                            match.won ? 'bg-double text-chalk' : 'bg-treble text-chalk'
                          }`}
                        >
                          {match.won ? 'Win' : 'Loss'}
                        </span>
                        <span className="font-bold capitalize">{match.gameName}</span>
                      </div>
                      <span className="text-xs text-sisal">
                        {new Date(match.completedAt).toLocaleDateString()}
                        {match.opponents.length > 0 ? ` · vs ${match.opponents.join(', ')}` : ''}
                      </span>
                    </div>
                    <div className="flex flex-col items-end gap-0.5">
                      <span className="text-[10px] font-bold uppercase tracking-widest text-sisal">
                        {match.headline.label}
                      </span>
                      <span className="text-lg font-display font-bold">{match.headline.value}</span>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </>
        )}
      </div>
    </div>
  );
}
