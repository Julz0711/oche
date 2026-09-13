// app/(dashboard)/page.tsx
'use client';
import { useRouter } from 'next/navigation';
import { useEffect, useState } from 'react';
import { useSession } from 'next-auth/react';
import { gameRegistry, GameId, getGameModule } from '@/lib/games/registry';
import { InlineFeedback } from '@/components/molecules';
import { GameOption } from './SetupControls';
import { StepGame, ActiveMatch } from './StepGame';
import { PlayMode, loadMode, saveMode } from './playMode';
import styles from './dashboard.module.css';

/**
 * The dashboard is now only a way in: how you're playing, what you're playing, and the games
 * already in progress.
 *
 * It used to be a three-step wizard — game, then settings, then a review — which meant the rules
 * were fixed two screens before anyone else could see them, and could never be changed once a
 * room existed. Picking a game now goes straight to that match's room, where the rules live
 * alongside the players and the start button. See components/organisms/MatchRoom.tsx.
 */
export default function Dashboard() {
  const router = useRouter();
  const { data: session } = useSession();
  const [games, setGames] = useState<GameOption[] | null>(null);
  const [activeMatches, setActiveMatches] = useState<ActiveMatch[]>([]);
  const [createError, setCreateError] = useState<string | null>(null);
  const [opening, setOpening] = useState<GameId | null>(null);

  const [mode, setMode] = useState<PlayMode>('multiplayer');
  // Restored after mount, never during render: the server has no localStorage, so reading it
  // any earlier would hydrate a different tree than the one rendered on the server.
  const [restored, setRestored] = useState(false);
  useEffect(() => { setMode(loadMode()); setRestored(true); }, []);
  useEffect(() => { if (restored) saveMode(mode); }, [restored, mode]);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      const ids = Object.keys(gameRegistry) as GameId[];
      const modules = await Promise.all(ids.map((id) => getGameModule(id)));
      if (cancelled) return;
      setGames(ids.map((id, i) => ({
        id,
        name: modules[i].name,
        description: modules[i].description,
        icon: modules[i].icon,
        playerRange: modules[i].playerRange,
        status: modules[i].status,
        defaultSettings: modules[i].defaultSettings,
      })));
    })();
    return () => { cancelled = true; };
  }, []);

  useEffect(() => {
    if (!session?.user) { setActiveMatches([]); return; }
    let cancelled = false;
    (async () => {
      const res = await fetch('/api/matches/active');
      if (cancelled || !res.ok) return;
      const { matches } = await res.json();
      if (!cancelled) setActiveMatches(matches);
    })();
    return () => { cancelled = true; };
  }, [session?.user]);

  const handleDeleteMatch = async (id: string) => {
    if (!window.confirm('Delete this game? This cannot be undone.')) return;
    const res = await fetch(`/api/matches/${id}`, { method: 'DELETE' });
    if (res.ok) setActiveMatches(prev => prev.filter(match => match.id !== id));
  };

  const handleLeaveMatch = async (id: string) => {
    if (!window.confirm('Leave this game? It stays active for the other player(s).')) return;
    const res = await fetch(`/api/matches/${id}/leave`, { method: 'POST' });
    if (res.ok) setActiveMatches(prev => prev.filter(match => match.id !== id));
  };

  /**
   * Picking a game opens its room.
   *
   * Local play needs nothing from the server to set up, so it goes straight to a client-side
   * room and the match is only created on Start. Online play needs a room code, so the match is
   * created here — `POST /api/matches` hands back an existing unstarted room for this game if
   * the player already has one, rather than leaving a new empty room behind on every visit.
   */
  const handlePickGame = async (gameId: GameId) => {
    setCreateError(null);
    if (mode === 'singleplayer') {
      router.push(`/play/local?game=${gameId}`);
      return;
    }
    setOpening(gameId);
    try {
      const res = await fetch('/api/matches', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ gameId, mode: 'remote' }),
      });
      const body = await res.json();
      if (!res.ok || !body.id) throw new Error(body.error || 'Could not open a room. Try again.');
      router.push(`/match/${body.id}`);
    } catch (error) {
      setCreateError(error instanceof Error ? error.message : 'Could not open a room. Check your connection.');
      setOpening(null);
    }
  };

  return (
    <div className="dashboard-page page-gutters min-h-screen text-chalk flex flex-col items-center relative">
      <div className="relative z-10 w-full max-w-3xl flex flex-col flex-1 gap-4 md:gap-6">
        <header className="dashboard-header">
          <h1 className="page-title">Play</h1>
        </header>

        {createError && <InlineFeedback tone="error">{createError}</InlineFeedback>}

        <section id="dashboard-play-panel" className={styles.playPanel} role="tabpanel" aria-labelledby={`play-tab-${mode}`}>
          <StepGame
            mode={mode}
            onModeChange={setMode}
            games={games}
            onPickGame={handlePickGame}
            opening={opening}
            activeMatches={activeMatches}
            onResumeMatch={id => router.push(`/match/${id}`)}
            onDeleteMatch={handleDeleteMatch}
            onLeaveMatch={handleLeaveMatch}
          />
        </section>
      </div>
    </div>
  );
}
