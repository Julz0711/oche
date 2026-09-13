'use client';
import type { ReactNode } from 'react';
import { AppBar } from '@/components/molecules';
import { MatchSettingsFields } from './MatchSettingsFields';
import type { GameId } from '@/lib/games/registry';

/**
 * The screen you set a match up on, for both kinds of match.
 *
 * Online it is the waiting room: a code to share, the players as they arrive, and the rules —
 * which the host can change while everyone watches. Local play has no code and nobody to wait
 * for, but is otherwise the same screen: same sections, same order, same place for the rules and
 * the start button.
 *
 * Layout decisions worth keeping:
 *
 * - **Invite is the only framed surface.** It is the one thing that gets people into the room, so
 *   it gets the one card. Players and rules are bounded by spacing and a section heading instead
 *   — three equal-weight panels made the settings look as urgent as the invite.
 * - **The action is sticky, not merely last.** A waiting room is a screen you sit on watching for
 *   arrivals; "can we start yet?" and the button that starts it must be answerable without
 *   scrolling back down past the rules.
 * - **The status line says what is blocking.** It used to restate the settings that were already
 *   on screen directly above it, which told a reader nothing they could not already see.
 *
 * Everything mode-specific arrives as a slot, so this never branches on mode and neither caller
 * has to reproduce the other's layout.
 */
export function MatchRoom({
  eyebrow,
  title,
  back,
  gameId,
  settings,
  onSettingsChange,
  savingSettings = false,
  invite,
  playersCount,
  playersAside,
  players,
  status,
  action,
  notice,
}: {
  eyebrow: string;
  title: string;
  back: { href: string; label: string };
  gameId: GameId;
  settings: Record<string, unknown>;
  /** Omit to render the rules read-only — that is what a guest gets. */
  onSettingsChange?: (next: Record<string, unknown>) => void;
  savingSettings?: boolean;
  /** The invite card. Online rooms only. */
  invite?: ReactNode;
  /** Beside the Players heading: `1 / 2`. */
  playersCount?: ReactNode;
  /** Under the Players heading — connection status online, guidance locally. */
  playersAside?: ReactNode;
  players: ReactNode;
  /** What is blocking the action, or that nothing is. Sits directly above it. */
  status?: ReactNode;
  action: ReactNode;
  notice?: ReactNode;
}) {
  return (
    <main className="account-page page-gutters room-page">
      <AppBar back={back} eyebrow={eyebrow} title={title} />
      {notice}
      {invite}

      <section className="room-section">
        <div className="section-header">
          <h2>Players {playersCount && <span className="section-header-count">{playersCount}</span>}</h2>
        </div>
        {playersAside}
        {players}
      </section>

      <section className="room-section">
        <div className="section-header">
          <h2>Match rules</h2>
          {!onSettingsChange && <span className="section-header-count">Set by the host</span>}
        </div>
        <MatchSettingsFields
          gameId={gameId}
          settings={settings}
          onChange={onSettingsChange}
          busy={savingSettings}
        />
      </section>

      <div className="room-dock">
        {status && <p className="room-status">{status}</p>}
        {action}
      </div>
    </main>
  );
}
