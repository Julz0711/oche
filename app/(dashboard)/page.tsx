// app/(dashboard)/page.tsx
'use client';
import { useRouter } from 'next/navigation';
import { useEffect, useState } from 'react';
import { useSession } from 'next-auth/react';
import Link from 'next/link';
import { Panel, BoardMotif } from '@/components/atoms';
import type { AccentToken, MotifName } from '@/components/atoms';
import { gameRegistry, GameId, getGameModule } from '@/lib/games/registry';
import { Input } from '@/components/atoms/Input';
import { LoadingIndicator } from '@/components/atoms/LoadingIndicator';
import { PlayerAvatar } from '@/components/profile/PlayerAvatar';
import styles from './dashboard.module.css';
import type { LucideIcon } from 'lucide-react';
import { X } from 'lucide-react';
import type { ReactNode } from 'react';

interface ActiveMatch {
  id: string;
  gameId: GameId;
  gameName: string;
  status: 'lobby' | 'live';
  roomCode: string;
  opponents: string[];
  isHost: boolean;
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
      className="dashboard-game min-h-[72px] sm:min-h-[172px]"
    >
      <BoardMotif
        name={motif}
        className={`pointer-events-none absolute -right-11 -bottom-14 w-[168px] h-[168px] ${ACCENT_TEXT[accent]} transition-transform duration-300 group-hover:rotate-[3deg]`}
        style={{ opacity: 'var(--motif-rest)' }}
      />
      <span className="game-card-content relative block px-3 py-2 sm:p-[18px]">
        <span className={`game-card-index block font-display font-bold text-[10px] tracking-[0.2em] ${ACCENT_TEXT[accent]}`}>
          {String(index + 1).padStart(2, '0')}
        </span>
        <span className="block font-display font-bold uppercase text-[22px] sm:text-[30px] leading-none text-chalk sm:mt-12 mb-1">
          {game.name}
        </span>
        <span className="block text-xs sm:text-[10px] leading-[1.4] text-sisal/60">
          {game.playerRange[0]} to {game.playerRange[1]} players · {game.description}
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
    <div className="flex gap-1.5 sm:gap-2 flex-wrap">
      {options.map((option) => (
        <button
          key={String(option)}
          type="button"
          onClick={() => onChange(option)}
          aria-pressed={option === value}
          className={`min-h-11 min-w-11 px-3 sm:px-4 py-2 rounded-none text-sm font-bold transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-wire focus-visible:ring-offset-2 focus-visible:ring-offset-oche ${
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
  const [playerNames, setPlayerNames] = useState(['Player 1', 'Player 2']);
  const [createError, setCreateError] = useState<string | null>(null);
  const [creating, setCreating] = useState<'local' | 'remote' | null>(null);
  const [playTab, setPlayTab] = useState<'multiplayer' | 'singleplayer'>('multiplayer');

  const { data: session } = useSession();
  const [activeMatches, setActiveMatches] = useState<ActiveMatch[]>([]);


  const [startingScore, setStartingScore] = useState<(typeof STARTING_SCORES)[number]>(501);
  const [x01FirstTo, setX01FirstTo] = useState<(typeof LEG_OPTIONS)[number]>(1);
  const [sets, setSets] = useState<(typeof SET_OPTIONS)[number]>(0);
  const [cricketFirstTo, setCricketFirstTo] = useState<(typeof LEG_OPTIONS)[number]>(1);
  const [cricketScoring, setCricketScoring] = useState<'standard' | 'no-points'>('standard');
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
    if (gameId === 'cricket') return { ...defaults, firstTo: cricketFirstTo, scoring: cricketScoring };
    if (gameId === 'copycat') return { ...defaults, firstTo: copycatFirstTo };
    return defaults;
  };

  const handleDeleteMatch = async (id: string) => {
    if (!window.confirm('Delete this game? This cannot be undone.')) return;
    const res = await fetch(`/api/matches/${id}`, { method: 'DELETE' });
    if (res.ok) {
      setActiveMatches((prev) => prev.filter((m) => m.id !== id));
    }
  };

  const handleLeaveMatch = async (id: string) => {
    if (!window.confirm('Leave this game? It stays active for the other player(s).')) return;
    const res = await fetch(`/api/matches/${id}/leave`, { method: 'POST' });
    if (res.ok) {
      setActiveMatches((prev) => prev.filter((m) => m.id !== id));
    }
  };

  const handleCreateMatch = async (gameId: GameId, mode: 'local' | 'remote') => {
    setCreateError(null);
    setCreating(mode);
    try {
      const res = await fetch('/api/matches', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ gameId, mode, settings: buildSettings(gameId), ...(mode === 'local' ? { playerNames } : {}) }),
      });
      const body = await res.json();
      if (!res.ok || !body.id) throw new Error(body.error || 'Could not start the match. Try again.');
      router.push(`/match/${body.id}`);
    } catch (error) {
      setCreateError(error instanceof Error ? error.message : 'Could not start the match. Check your connection.');
    } finally {
      setCreating(null);
    }
  };

  return (
    <div
      className="dashboard-page page-gutters min-h-screen text-chalk p-3 md:p-8 flex flex-col items-center relative"
    >
      <div className="relative z-10 w-full max-w-3xl flex flex-col gap-3 md:gap-9 pt-0 md:pt-12">
        <header className="dashboard-header flex flex-col gap-2 md:gap-5">
          {session?.user && <Link href="/profile" className="dashboard-identity"><PlayerAvatar name={session.user.name || 'Player'} image={session.user.image} /><span className="min-w-0"><small>Currently logged in as</small><strong>{session.user.name || 'Player'}</strong></span></Link>}
          <h1 className="text-sisal text-sm md:text-base font-normal">Pick a game, grab your darts</h1>
        </header>

        <div className={styles.tabs} role="tablist" aria-label="Play mode">
          {([
            { id: 'multiplayer', label: 'Online', detail: 'Games with a room code' },
            { id: 'singleplayer', label: 'Local & solo', detail: 'Same device or solo runs' },
          ] as const).map((tab) => (
            <button
              key={tab.id}
              id={`play-tab-${tab.id}`}
              type="button"
              role="tab"
              aria-selected={playTab === tab.id}
              aria-controls="dashboard-play-panel"
              tabIndex={playTab === tab.id ? 0 : -1}
              disabled={creating !== null}
              onClick={() => setPlayTab(tab.id)}
              onKeyDown={(event) => {
                if (!['ArrowLeft', 'ArrowRight', 'Home', 'End'].includes(event.key)) return;
                event.preventDefault();
                const next = event.key === 'Home' ? 'multiplayer' : event.key === 'End' ? 'singleplayer' : playTab === 'multiplayer' ? 'singleplayer' : 'multiplayer';
                setPlayTab(next);
                document.getElementById(`play-tab-${next}`)?.focus();
              }}
            >
              <strong>{tab.label}</strong><span>{tab.detail}</span>
            </button>
          ))}
        </div>

        <section id="dashboard-play-panel" role="tabpanel" aria-labelledby={`play-tab-${playTab}`} className={styles.playPanel}>
          {playTab === 'singleplayer' && (
          <Link href="/solo" className={styles.soloLink}>
              <Panel notch="card" accent="wire" interactive className="p-4 sm:p-5">
                <BoardMotif name="board" className="pointer-events-none absolute -right-8 -bottom-16 w-56 h-56 text-wire" style={{ opacity: 'var(--motif-rest)' }} />
                <span className="relative block">
                  <span className="block text-[10px] font-bold tracking-[0.2em] text-wire uppercase">Solo roguelike · 1 player</span>
                  <strong className="block font-display font-bold uppercase text-[30px] leading-none text-chalk mt-5 mb-2">House Rules</strong>
                  <span className="block text-xs text-sisal/60">Build your darts. Beat the bosses. Challenge your friends.</span>
                </span>
              </Panel>
            </Link>
          )}

          {playTab === 'multiplayer' && activeMatches.length > 0 && (
            <div className="flex flex-col gap-2">
              <SettingLabel>Active games</SettingLabel>
              <div className="flex flex-col gap-2">
                {activeMatches.map((m) => (
                  <Panel key={m.id} notch="panel" className="p-3 flex items-center gap-3">
                    <button
                      type="button"
                      onClick={() => router.push(`/match/${m.id}`)}
                      className="flex flex-1 items-center justify-between gap-3 min-w-0 text-left"
                    >
                      <div className="flex flex-col items-start gap-0.5 min-w-0">
                        <span className="font-display font-bold uppercase text-sm text-chalk truncate max-w-full">
                          {m.gameName}
                        </span>
                        <span className="text-[10px] font-bold uppercase tracking-widest text-sisal truncate max-w-full">
                          {m.status === 'lobby'
                            ? 'Waiting for players'
                            : m.opponents.length > 0
                              ? `vs ${m.opponents.join(', ')}`
                              : 'In progress'}
                        </span>
                      </div>
                      <span className="text-xs font-bold uppercase tracking-widest text-wire shrink-0">Resume</span>
                    </button>
                    {m.isHost ? (
                      <button
                        type="button"
                        onClick={() => handleDeleteMatch(m.id)}
                        aria-label="Delete match"
                        className="shrink-0 min-w-11 min-h-11 flex items-center justify-center text-sisal hover:text-treble transition-colors"
                      >
                        <X className="w-4 h-4" />
                      </button>
                    ) : (
                      <button
                        type="button"
                        onClick={() => handleLeaveMatch(m.id)}
                        aria-label="Leave match"
                        className="shrink-0 min-w-11 min-h-11 flex items-center justify-center text-sisal hover:text-treble transition-colors"
                      >
                        <X className="w-4 h-4" />
                      </button>
                    )}
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
              {playTab === 'singleplayer' && <SettingLabel>Classic games · same device</SettingLabel>}
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-2 sm:gap-3.5">
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

              <Panel notch="panel" className="dashboard-settings p-3 md:p-6">
                <SettingLabel>Match settings</SettingLabel>

                {selectedGameId === 'x01' && (
                  <>
                    <div className="dashboard-setting flex flex-col gap-2">
                      <SettingLabel>Starting score</SettingLabel>
                      <Pills options={STARTING_SCORES} value={startingScore} onChange={setStartingScore} />
                    </div>
                    <div className="dashboard-setting flex flex-col gap-2">
                      <SettingLabel>Legs (first to)</SettingLabel>
                      <Pills options={LEG_OPTIONS} value={x01FirstTo} onChange={setX01FirstTo} />
                    </div>
                    <div className="dashboard-setting flex flex-col gap-2">
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
                  <>
                  <div className="dashboard-setting flex flex-col gap-2">
                    <SettingLabel>Legs (first to)</SettingLabel>
                    <Pills options={LEG_OPTIONS} value={cricketFirstTo} onChange={setCricketFirstTo} />
                  </div>
                  <div className="dashboard-setting flex flex-col gap-2">
                    <SettingLabel>Scoring</SettingLabel>
                    <Pills options={['standard', 'no-points'] as const} value={cricketScoring} onChange={setCricketScoring} format={value => value === 'standard' ? 'Standard' : 'No points'} />
                    <p className="text-xs text-sisal max-w-xs">{cricketScoring === 'standard' ? 'Extra hits score while an opponent has the number open. Close all numbers and lead or tie on points to win.' : 'First to close all seven numbers wins the leg. Extra hits do not score.'}</p>
                  </div>
                  </>
                )}

                {selectedGameId === 'copycat' && (
                  <div className="dashboard-setting flex flex-col gap-2">
                    <SettingLabel>Points (first to)</SettingLabel>
                    <Pills options={COPYCAT_LIMIT_OPTIONS} value={copycatFirstTo} onChange={setCopycatFirstTo} />
                  </div>
                )}
              </Panel>

              {playTab === 'singleplayer' && <Panel notch="panel" className="p-4 flex flex-col gap-3">
                <div className="flex items-center justify-between gap-3">
                  <SettingLabel>Players · {playerNames.length} / 8</SettingLabel>
                  <button type="button" className="min-h-11 px-3 border border-wire text-sm text-wire disabled:opacity-40" disabled={playerNames.length >= 8 || creating !== null}
                    onClick={() => setPlayerNames(names => [...names, `Player ${names.length + 1}`])}>Add player</button>
                </div>
                <p className="text-xs text-sisal">Throw in this order. Pass the device when your turn ends.</p>
                <div className="grid gap-3 sm:grid-cols-2">{playerNames.map((name, index) => <div key={index} className="flex items-end gap-2">
                  <Input label={`Player ${index + 1}`} maxLength={32} value={index === 0 && session?.user?.name ? session.user.name : name}
                    readOnly={index === 0 && !!session?.user?.name} disabled={creating !== null} containerClassName="flex-1 min-w-0" className="min-h-11"
                    onChange={event => setPlayerNames(names => names.map((value, i) => i === index ? event.target.value : value))} />
                  {index > 1 && <button type="button" aria-label={`Remove player ${index + 1}`} className="min-h-11 px-2 text-sm text-sisal" disabled={creating !== null}
                    onClick={() => setPlayerNames(names => names.filter((_, i) => i !== index))}>Remove</button>}
                </div>)}</div>
              </Panel>}
              {createError && <p role="alert" className="text-sm text-chalk border border-treble p-3">{createError}</p>}
              {creating && <LoadingIndicator label="Opening your match…" />}
              <div className="flex flex-col gap-2">
                <Panel
                  as="button"
                  notch="panel"
                  accent="wire"
                  fill="wire"
                  onClick={() => handleCreateMatch(selectedGameId, playTab === 'multiplayer' ? 'remote' : 'local')}
                  disabled={creating !== null}
                  className="play-action play-action-primary"
                >
                  {creating !== null ? 'Starting…' : playTab === 'multiplayer' ? 'Play Online' : 'Play Local'}
                </Panel>
                <span className="text-center text-xs text-sisal">
                  {playTab === 'multiplayer' ? 'Create a room and invite players' : 'Play on the same device'}
                </span>
              </div>
              {playTab === 'multiplayer' && <Link href="/join" className="join-room-link">Have a room code? <span>Join a room →</span></Link>}
            </>
          )}
        </section>
      </div>
    </div>
  );
}
