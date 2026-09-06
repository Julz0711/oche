// app/(dashboard)/page.tsx
'use client';
import { useRouter } from 'next/navigation';
import { useEffect, useState } from 'react';
import { useSession } from 'next-auth/react';
import Link from 'next/link';
import { Panel, BoardMotif } from '@/components/atoms';
import type { AccentToken, MotifName } from '@/components/atoms';
import { gameRegistry, GameId, getGameModule } from '@/lib/games/registry';
import type { LucideIcon } from 'lucide-react';
import type { ReactNode } from 'react';

interface ActiveMatch {
  id: string;
  gameId: GameId;
  gameName: string;
  status: 'lobby' | 'live';
  roomCode: string;
  opponents: string[];
}

interface GameOption {
  id: GameId;
  name: string;
  description: string;
  icon: LucideIcon;
  playerRange: [number, number];
  status?: 'stable' | 'beta' | 'comingSoon';
  defaultSettings: Record<string, unknown>;
}

/** Each game's identity: its accent token and the motif that says something true about how
 *  it's played. Copycat uses `treble` for identity only — never for state — per the spec. */
const GAME_IDENTITY: Record<GameId, { accent: AccentToken; motif: MotifName }> = {
  x01: { accent: 'wire', motif: 'board' },
  cricket: { accent: 'double', motif: 'scoresheet' },
  copycat: { accent: 'treble', motif: 'echo' },
};

const ACCENT_TEXT: Record<AccentToken, string> = {
  wire: 'text-wire',
  double: 'text-double',
  treble: 'text-treble',
  sisal: 'text-sisal',
};

function GameCard({
  game,
  index,
  selected,
  onSelect,
}: {
  game: GameOption;
  index: number;
  selected: boolean;
  onSelect: () => void;
}) {
  const { accent, motif } = GAME_IDENTITY[game.id];

  return (
    <Panel
      as="button"
      notch="card"
      accent={accent}
      accentBar
      active={selected}
      onClick={onSelect}
      aria-pressed={selected}
      className="min-h-[172px]"
    >
      <BoardMotif
        name={motif}
        className={`pointer-events-none absolute -right-11 -bottom-14 w-[168px] h-[168px] ${ACCENT_TEXT[accent]} group-hover:rotate-[9deg]`}
        style={{ opacity: 'var(--motif-rest)' }}
      />
      <span className="relative block p-[18px] pt-[18px]">
        <span className={`block font-display font-bold text-[10px] tracking-[0.2em] ${ACCENT_TEXT[accent]}`}>
          {String(index + 1).padStart(2, '0')}
        </span>
        <span className="block font-display font-bold uppercase text-[30px] leading-[0.94] text-chalk mt-12 mb-1.5">
          {game.name}
        </span>
        <span className="block text-[10px] leading-[1.4] text-sisal/60">
          {game.playerRange[0]}–{game.playerRange[1]} players · {game.description}
        </span>
      </span>
    </Panel>
  );
}

/** A row of pressable pills for picking one value from a small fixed set — used for every
 *  match-settings control below. `format` renders the label; defaults to the raw value. */
function Pills<T extends string | number>({
  options,
  value,
  onChange,
  format,
}: {
  options: readonly T[];
  value: T;
  onChange: (value: T) => void;
  format?: (value: T) => string;
}) {
  return (
    <div className="flex gap-2 flex-wrap">
      {options.map((option) => (
        <button
          key={String(option)}
          type="button"
          onClick={() => onChange(option)}
          aria-pressed={option === value}
          className={`px-4 py-2 rounded-none text-sm font-bold transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-wire focus-visible:ring-offset-2 focus-visible:ring-offset-oche ${
            option === value ? 'bg-wire text-oche' : 'bg-oche text-sisal border border-sisal/30 hover:opacity-80'
          }`}
        >
          {format ? format(option) : option}
        </button>
      ))}
    </div>
  );
}

function SettingLabel({ children }: { children: ReactNode }) {
  return <span className="text-[11px] font-bold uppercase tracking-widest text-sisal">{children}</span>;
}

const STARTING_SCORES = [301, 501, 701] as const;
const LEG_OPTIONS = [1, 3, 5, 7] as const;
const SET_OPTIONS = [0, 2, 3, 4, 5] as const;
const COPYCAT_LIMIT_OPTIONS = [3, 5, 7, 9] as const;

export default function Dashboard() {
  const router = useRouter();
  const [games, setGames] = useState<GameOption[] | null>(null);
  const [selectedGameId, setSelectedGameId] = useState<GameId>('x01');
  const [creating, setCreating] = useState<'local' | 'remote' | null>(null);

  const { data: session } = useSession();
  const [activeMatches, setActiveMatches] = useState<ActiveMatch[]>([]);

  const [startingScore, setStartingScore] = useState<(typeof STARTING_SCORES)[number]>(501);
  const [x01FirstTo, setX01FirstTo] = useState<(typeof LEG_OPTIONS)[number]>(3);
  const [sets, setSets] = useState<(typeof SET_OPTIONS)[number]>(0);
  const [cricketFirstTo, setCricketFirstTo] = useState<(typeof LEG_OPTIONS)[number]>(3);
  const [copycatFirstTo, setCopycatFirstTo] = useState<(typeof COPYCAT_LIMIT_OPTIONS)[number]>(3);

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
          defaultSettings: modules[i].defaultSettings,
        }))
      );
    })();
    return () => {
      cancelled = true;
    };
  }, []);

  useEffect(() => {
    if (!session?.user) {
      setActiveMatches([]);
      return;
    }
    let cancelled = false;
    (async () => {
      const res = await fetch('/api/matches/active');
      if (cancelled || !res.ok) return;
      const { matches } = await res.json();
      if (!cancelled) setActiveMatches(matches);
    })();
    return () => {
      cancelled = true;
    };
  }, [session?.user]);

  const buildSettings = (gameId: GameId): Record<string, unknown> | undefined => {
    const defaults = games?.find((g) => g.id === gameId)?.defaultSettings;
    if (!defaults) return undefined;
    if (gameId === 'x01') return { ...defaults, startingScore: String(startingScore), firstTo: x01FirstTo, sets };
    if (gameId === 'cricket') return { ...defaults, firstTo: cricketFirstTo };
    if (gameId === 'copycat') return { ...defaults, firstTo: copycatFirstTo };
    return defaults;
  };

  const handleCreateMatch = async (gameId: GameId, mode: 'local' | 'remote') => {
    setCreating(mode);
    try {
      const res = await fetch('/api/matches', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ gameId, mode, settings: buildSettings(gameId) }),
      });
      const { id } = await res.json();
      router.push(`/match/${id}`);
    } finally {
      setCreating(null);
    }
  };

  return (
    <div
      className="min-h-screen bg-oche text-chalk p-4 md:p-8 flex flex-col items-center relative scanlines"
      style={{
        backgroundImage:
          'radial-gradient(circle at 50% 0%, color-mix(in srgb, var(--wire) 10%, transparent), transparent 60%)',
      }}
    >
      <div className="relative z-10 w-full max-w-3xl flex flex-col gap-7 md:gap-9 pt-6 md:pt-12">
        <header className="flex flex-col gap-5">
          <div className="flex items-center justify-between">
            <span className="text-xs font-bold uppercase tracking-widest text-sisal">
              {session?.user ? session.user.name ?? 'Signed in' : 'Not signed in'}
            </span>
            {session?.user ? (
              <div className="flex items-center gap-4">
                <Link
                  href="/stats"
                  className="text-xs font-bold uppercase tracking-widest text-wire hover:text-chalk transition-colors"
                >
                  History
                </Link>
                <Link
                  href="/settings"
                  className="text-xs font-bold uppercase tracking-widest text-wire hover:text-chalk transition-colors"
                >
                  Settings
                </Link>
                <Link
                  href="/signout"
                  className="text-xs font-bold uppercase tracking-widest text-sisal hover:text-chalk transition-colors"
                >
                  Sign out
                </Link>
              </div>
            ) : (
              <Link
                href="/signin"
                className="text-xs font-bold uppercase tracking-widest text-wire hover:text-chalk transition-colors"
              >
                Sign in
              </Link>
            )}
          </div>
          <h1 className="text-2xl sm:text-3xl md:text-4xl font-display font-bold tracking-tight leading-none">
            OCHE
          </h1>
          <p className="text-sisal text-sm md:text-base mt-1">Pick a game, grab your darts</p>
        </header>

        {activeMatches.length > 0 && (
          <div className="flex flex-col gap-2">
            <SettingLabel>Active games</SettingLabel>
            <div className="flex flex-col gap-2">
              {activeMatches.map((m) => (
                <Panel
                  key={m.id}
                  as="button"
                  notch="panel"
                  onClick={() => router.push(`/match/${m.id}`)}
                  className="p-3 flex items-center justify-between gap-3"
                >
                  <div className="flex flex-col items-start gap-0.5 min-w-0">
                    <span className="font-display font-bold uppercase text-sm text-chalk truncate">
                      {m.gameName}
                    </span>
                    <span className="text-[10px] font-bold uppercase tracking-widest text-sisal truncate">
                      {m.status === 'lobby'
                        ? 'Waiting for players'
                        : m.opponents.length > 0
                          ? `vs ${m.opponents.join(', ')}`
                          : 'In progress'}
                    </span>
                  </div>
                  <span className="text-xs font-bold uppercase tracking-widest text-wire shrink-0">Resume</span>
                </Panel>
              ))}
            </div>
          </div>
        )}

        {games === null ? (
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 md:gap-5">
            {[0, 1].map((i) => (
              <div key={i} className="h-48 bg-slate animate-pulse" />
            ))}
          </div>
        ) : (
          <>
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3.5">
              {games.map((game, index) => (
                <GameCard
                  key={game.id}
                  game={game}
                  index={index}
                  selected={game.id === selectedGameId}
                  onSelect={() => setSelectedGameId(game.id)}
                />
              ))}
            </div>

            <Panel notch="panel" className="p-5 md:p-6 flex flex-col gap-4">
              <SettingLabel>Match settings</SettingLabel>

              {selectedGameId === 'x01' && (
                <>
                  <div className="flex flex-col gap-2">
                    <SettingLabel>Starting score</SettingLabel>
                    <Pills options={STARTING_SCORES} value={startingScore} onChange={setStartingScore} />
                  </div>
                  <div className="flex flex-col gap-2">
                    <SettingLabel>Legs (first to)</SettingLabel>
                    <Pills options={LEG_OPTIONS} value={x01FirstTo} onChange={setX01FirstTo} />
                  </div>
                  <div className="flex flex-col gap-2">
                    <SettingLabel>Sets (first to)</SettingLabel>
                    <Pills
                      options={SET_OPTIONS}
                      value={sets}
                      onChange={setSets}
                      format={(v) => (v === 0 ? 'Off' : String(v))}
                    />
                  </div>
                </>
              )}

              {selectedGameId === 'cricket' && (
                <div className="flex flex-col gap-2">
                  <SettingLabel>Legs (first to)</SettingLabel>
                  <Pills options={LEG_OPTIONS} value={cricketFirstTo} onChange={setCricketFirstTo} />
                </div>
              )}

              {selectedGameId === 'copycat' && (
                <div className="flex flex-col gap-2">
                  <SettingLabel>Points (first to)</SettingLabel>
                  <Pills options={COPYCAT_LIMIT_OPTIONS} value={copycatFirstTo} onChange={setCopycatFirstTo} />
                </div>
              )}
            </Panel>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 md:gap-4">
              <div className="flex flex-col gap-2">
                <Panel
                  as="button"
                  notch="card"
                  accent="wire"
                  fill="wire"
                  onClick={() => handleCreateMatch(selectedGameId, 'remote')}
                  disabled={creating !== null}
                  className="min-h-16 md:min-h-20 flex items-center justify-center text-xl md:text-2xl font-display uppercase tracking-[0.14em] text-oche"
                >
                  {creating === 'remote' ? 'Starting…' : 'Play Online'}
                </Panel>
                <span className="text-center text-[11px] font-bold uppercase tracking-widest text-sisal">
                  Room code
                </span>
              </div>

              <div className="flex flex-col gap-2">
                <Panel
                  as="button"
                  notch="card"
                  accent="wire"
                  onClick={() => handleCreateMatch(selectedGameId, 'local')}
                  disabled={creating !== null}
                  className="min-h-16 md:min-h-20 flex items-center justify-center text-xl md:text-2xl font-display uppercase tracking-[0.14em] text-chalk"
                >
                  {creating === 'local' ? 'Starting…' : 'Play Local'}
                </Panel>
                <span className="text-center text-[11px] font-bold uppercase tracking-widest text-sisal">
                  Same device
                </span>
              </div>
            </div>
          </>
        )}
      </div>
    </div>
  );
}
