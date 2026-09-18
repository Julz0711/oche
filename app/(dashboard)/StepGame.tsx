// app/(dashboard)/StepGame.tsx
'use client';
import Link from 'next/link';
import { X, ArrowUpRight, KeyRound } from 'lucide-react';
import { Panel } from '@/components/atoms';
import type { GameId } from '@/lib/games/registry';
import { GameCard, GameOption, SettingLabel } from './SetupControls';
import type { PlayMode } from './playMode';
import styles from './dashboard.module.css';

export interface ActiveMatch {
  id: string;
  gameId: GameId;
  gameName: string;
  status: 'lobby' | 'live';
  roomCode: string;
  opponents: string[];
  isHost: boolean;
}

/** How you're playing and what you're playing. Resuming an existing game and joining by room
 *  code live here too — they're ways into a match rather than part of setting one up.
 *
 *  Picking a game no longer advances a wizard; it opens that match's room, where the rules and
 *  the start button are. */
export function StepGame({
  mode,
  onModeChange,
  games,
  onPickGame,
  opening,
  activeMatches,
  onResumeMatch,
  onDeleteMatch,
  onLeaveMatch,
}: {
  mode: PlayMode;
  onModeChange: (mode: PlayMode) => void;
  games: GameOption[] | null;
  onPickGame: (gameId: GameId) => void;
  /** The game whose online room is being opened, if any — its card shows the wait. */
  opening: GameId | null;
  activeMatches: ActiveMatch[];
  onResumeMatch: (id: string) => void;
  onDeleteMatch: (id: string) => void;
  onLeaveMatch: (id: string) => void;
}) {
  return (
    <>
      <div className={styles.selectionHead}>
      <div><h2>Choose your game</h2><p className="t-meta">{mode === 'multiplayer' ? 'Create a room and invite your rivals.' : 'One board, one device. Play together.'}</p></div>
      <div className={styles.tabs} role="tablist" aria-label="Play mode">
        {([
          { id: 'multiplayer', label: 'Online', detail: 'Play from anywhere' },
          { id: 'singleplayer', label: 'At the board', detail: 'Share one device' },
        ] as const).map((tab) => (
          <button
            key={tab.id}
            id={`play-tab-${tab.id}`}
            type="button"
            role="tab"
            aria-selected={mode === tab.id}
            aria-controls="dashboard-play-panel"
            tabIndex={mode === tab.id ? 0 : -1}
            onClick={() => onModeChange(tab.id)}
            onKeyDown={(event) => {
              if (!['ArrowLeft', 'ArrowRight', 'Home', 'End'].includes(event.key)) return;
              event.preventDefault();
              const next = event.key === 'Home' ? 'multiplayer' : event.key === 'End' ? 'singleplayer' : mode === 'multiplayer' ? 'singleplayer' : 'multiplayer';
              onModeChange(next);
              document.getElementById(`play-tab-${next}`)?.focus();
            }}
          >
            <strong>{tab.label}</strong><span>{tab.detail}</span>
          </button>
        ))}
      </div>

      </div>
      {mode === 'multiplayer' && activeMatches.length > 0 && (
        <div className="flex flex-col gap-2">
          <SettingLabel>Active games</SettingLabel>
          <div className="flex flex-col gap-2">
            {activeMatches.map((match) => (
              <Panel key={match.id} className="p-3 flex items-center gap-3">
                <button
                  type="button"
                  onClick={() => onResumeMatch(match.id)}
                  className="flex flex-1 items-center justify-between gap-3 min-w-0 text-left"
                >
                  <div className="flex flex-col items-start gap-0.5 min-w-0">
                    <span className="font-display font-bold uppercase text-sm text-chalk truncate max-w-full">{match.gameName}</span>
                    <span className="text-[10px] font-bold uppercase tracking-widest text-sisal truncate max-w-full">
                      {match.status === 'lobby'
                        ? 'Waiting for players'
                        : match.opponents.length > 0
                          ? `vs ${match.opponents.join(', ')}`
                          : 'In progress'}
                    </span>
                  </div>
                  <span className="text-xs font-bold uppercase tracking-widest text-wire shrink-0">Resume</span>
                </button>
                <button
                  type="button"
                  onClick={() => (match.isHost ? onDeleteMatch(match.id) : onLeaveMatch(match.id))}
                  aria-label={match.isHost ? 'Delete match' : 'Leave match'}
                  className="shrink-0 min-w-11 min-h-11 flex items-center justify-center text-sisal hover:text-treble transition-colors"
                >
                  <X className="w-4 h-4" />
                </button>
              </Panel>
            ))}
          </div>
        </div>
      )}

      <div id="dashboard-play-panel" role="tabpanel" aria-labelledby={`play-tab-${mode}`} className={styles.gameGrid}>
        {games === null ? [0, 1, 2].map(i => <div key={i} className="skeleton h-56" />) : games.map((game, index) => (
          <GameCard key={game.id} game={game} index={index} opening={opening === game.id}
            disabled={opening !== null && opening !== game.id} onSelect={() => onPickGame(game.id)} />
        ))}
      </div>
      {mode === 'multiplayer' && <Link href="/join" className={styles.joinCard}>
        <KeyRound size={16} aria-hidden="true" /><span><strong>Join a room</strong><small>Enter a room code</small></span><ArrowUpRight size={16} aria-hidden="true" />
      </Link>}
    </>
  );
}
