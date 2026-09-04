// app/(dashboard)/page.tsx
'use client';
import { useRouter } from 'next/navigation';
import { useEffect, useState } from 'react';
import { Button } from '@/components/atoms/Button';
import { gameRegistry, GameId, getGameModule } from '@/lib/games/registry';
import { Users } from 'lucide-react';
import type { LucideIcon } from 'lucide-react';

interface GameOption {
  id: GameId;
  name: string;
  description: string;
  icon: LucideIcon;
  playerRange: [number, number];
  status?: 'stable' | 'beta' | 'comingSoon';
}

/** Per-game accent, written as literal class strings (not composed at runtime) so Tailwind's
 *  scanner can see them. Each game gets its own color from the existing palette rather than
 *  everything defaulting to gold. */
const GAME_ACCENT: Record<GameId, { selected: string; badge: string }> = {
  x01: { selected: 'border-wire bg-wire/15', badge: 'bg-wire text-oche' },
  cricket: { selected: 'border-double bg-double/15', badge: 'bg-double text-chalk' },
};

/** The app's dartboard-ring mark (same concentric nesting as the PWA icon set), rendered as
 *  plain nested divs so it can carry a live ambient glow — the dashboard's signature element. */
function RingMark({ size = 56 }: { size?: number }) {
  return (
    <div
      className="ring-mark-glow rounded-full flex items-center justify-center shrink-0"
      style={{ width: size, height: size, background: 'var(--wire)' }}
    >
      <div
        className="rounded-full flex items-center justify-center"
        style={{ width: size * 0.66, height: size * 0.66, background: 'var(--oche)' }}
      >
        <div
          className="rounded-full flex items-center justify-center"
          style={{ width: size * 0.4, height: size * 0.4, background: 'var(--wire)' }}
        >
          <div className="rounded-full" style={{ width: size * 0.18, height: size * 0.18, background: 'var(--chalk)' }} />
        </div>
      </div>
    </div>
  );
}

function GameCard({ game, selected, onSelect }: { game: GameOption; selected: boolean; onSelect: () => void }) {
  const accent = GAME_ACCENT[game.id];
  const Icon = game.icon;

  return (
    <button
      onClick={onSelect}
      aria-pressed={selected}
      className={`text-left rounded-2xl p-5 md:p-6 flex flex-col gap-4 border-2 transition-all active:scale-[0.98] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-wire focus-visible:ring-offset-2 focus-visible:ring-offset-oche ${
        selected ? accent.selected : 'border-transparent bg-slate'
      }`}
    >
      <div className={`w-14 h-14 rounded-2xl flex items-center justify-center ${accent.badge}`}>
        <Icon className="w-7 h-7" />
      </div>

      <div className="flex flex-col gap-1">
        <span className="text-2xl md:text-3xl font-display font-bold">{game.name}</span>
        <span className="text-sm text-sisal">{game.description}</span>
      </div>

      <div className="flex items-center gap-2 mt-auto">
        <span className="flex items-center gap-1 text-[10px] font-bold uppercase tracking-widest text-sisal bg-oche rounded-full px-2.5 py-1">
          <Users className="w-3 h-3" />
          {game.playerRange[0]}–{game.playerRange[1]} players
        </span>
        {game.status && game.status !== 'stable' && (
          <span className="text-[10px] font-bold uppercase tracking-widest text-oche bg-wire rounded-full px-2.5 py-1">
            {game.status === 'beta' ? 'Beta' : 'Coming soon'}
          </span>
        )}
      </div>
    </button>
  );
}

export default function Dashboard() {
  const router = useRouter();
  const [games, setGames] = useState<GameOption[] | null>(null);
  const [selectedGameId, setSelectedGameId] = useState<GameId>('x01');
  const [creating, setCreating] = useState<'local' | 'remote' | null>(null);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      const ids = Object.keys(gameRegistry) as GameId[];
      const modules = await Promise.all(ids.map((id) => getGameModule(id)));
      if (cancelled) return;
      setGames(
        ids.map((id, i) => ({
          id,
          name: modules[i].name,
          description: modules[i].description,
          icon: modules[i].icon,
          playerRange: modules[i].playerRange,
          status: modules[i].status,
        }))
      );
    })();
    return () => {
      cancelled = true;
    };
  }, []);

  const handleCreateMatch = async (gameId: GameId, mode: 'local' | 'remote') => {
    setCreating(mode);
    try {
      const res = await fetch('/api/matches', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ gameId, mode }),
      });
      const { id } = await res.json();
      router.push(`/match/${id}`);
    } finally {
      setCreating(null);
    }
  };

  return (
    <div
      className="min-h-screen bg-oche text-chalk p-4 md:p-8 flex flex-col items-center"
      style={{
        backgroundImage:
          'radial-gradient(circle at 50% 0%, color-mix(in srgb, var(--wire) 10%, transparent), transparent 60%)',
      }}
    >
      <div className="w-full max-w-3xl flex flex-col gap-8 md:gap-10 pt-6 md:pt-12">
        <header className="flex items-center gap-4">
          <RingMark size={56} />
          <div className="flex flex-col">
            <h1 className="text-2xl sm:text-3xl md:text-4xl font-display font-bold tracking-tight leading-none">
              OCHE
            </h1>
            <p className="text-sisal text-sm md:text-base mt-1">Pick a game, grab your darts</p>
          </div>
        </header>

        {games === null ? (
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 md:gap-5">
            {[0, 1].map((i) => (
              <div key={i} className="h-48 rounded-2xl bg-slate animate-pulse" />
            ))}
          </div>
        ) : (
          <>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 md:gap-5">
              {games.map((game) => (
                <GameCard
                  key={game.id}
                  game={game}
                  selected={game.id === selectedGameId}
                  onSelect={() => setSelectedGameId(game.id)}
                />
              ))}
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 md:gap-4">
              <div className="flex flex-col gap-2">
                <Button
                  onClick={() => handleCreateMatch(selectedGameId, 'local')}
                  disabled={creating !== null}
                  className="min-h-16 md:min-h-20 rounded-2xl text-xl md:text-2xl w-full"
                >
                  {creating === 'local' ? 'Starting…' : 'Play Local'}
                </Button>
                <span className="text-center text-[11px] font-bold uppercase tracking-widest text-sisal">
                  Same device
                </span>
              </div>

              <div className="flex flex-col gap-2">
                <Button
                  variant="secondary"
                  onClick={() => handleCreateMatch(selectedGameId, 'remote')}
                  disabled={creating !== null}
                  className="min-h-16 md:min-h-20 rounded-2xl text-xl md:text-2xl w-full"
                >
                  {creating === 'remote' ? 'Starting…' : 'Play Online'}
                </Button>
                <span className="text-center text-[11px] font-bold uppercase tracking-widest text-sisal">
                  Room code
                </span>
              </div>
            </div>
          </>
        )}
      </div>
    </div>
  );
}
