// components/organisms/MatchLobby.tsx
'use client';
import { Button } from '@/components/atoms/Button';
import { Panel } from '@/components/atoms';
import { Copy, Check, Share2, ChevronUp, ChevronDown } from 'lucide-react';
import { useEffect, useState } from 'react';
import { identityIdOf, MatchPlayerDoc } from '@/lib/matchLobby';
import { InlineFeedback } from '@/components/molecules';
import { toSchemaInput } from '@/lib/games/settingsForm';
import type { GameId } from '@/lib/games/registry';
import { MatchRoom } from './MatchRoom';

interface MatchLobbyProps {
  matchId: string;
  gameId: GameId;
  gameName: string;
  roomCode: string;
  players: MatchPlayerDoc[];
  settings: Record<string, unknown>;
  /** [min, max] players this game supports — drives the "waiting for player" placeholders,
   *  the join-progress counter, and when Start becomes enabled. */
  playerRange: [number, number];
  isHost: boolean;
  /** This client's identity id, so its own row can say so. */
  you: string | null;
  hostId: string | null;
  onStart: () => void;
  starting: boolean;
  presence: { onlinePlayers: string[]; connection: string; presenceReady: boolean };
}

/**
 * The online waiting room: the match-setup screen for a remote game.
 *
 * The `MatchRoom` shell wired to a real match document. The host edits the rules here and they
 * are saved immediately; every other client picks the change up through the lobby broadcast the
 * `PATCH` publishes, so what a guest sees is always what they are about to play.
 */
export function MatchLobby({
  matchId,
  gameId,
  gameName,
  roomCode,
  players,
  settings,
  playerRange,
  isHost,
  you,
  hostId,
  onStart,
  starting,
  presence,
}: MatchLobbyProps) {
  const [copied, setCopied] = useState(false);
  const [canShare, setCanShare] = useState(false);
  const [reordering, setReordering] = useState(false);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');
  const joinUrl = typeof window !== 'undefined' ? `${window.location.origin}/join/${roomCode}` : '';
  const [minPlayers] = playerRange;

  // After mount: navigator.share does not exist during the server render, and on most desktop
  // browsers it does not exist at all.
  useEffect(() => {
    setCanShare(typeof navigator !== 'undefined' && typeof navigator.share === 'function');
  }, []);

  const handleCopy = async () => {
    try {
      await navigator.clipboard.writeText(joinUrl);
      setCopied(true);
      setTimeout(() => setCopied(false), 1800);
    } catch {
      setError('Could not copy. The code above can be read out instead.');
    }
  };

  const handleShare = async () => {
    try {
      await navigator.share({ title: 'Join my Oche match', text: `Room code ${roomCode}`, url: joinUrl });
    } catch {
      /* The share sheet was dismissed — not an error worth reporting. */
    }
  };

  const handleSettingsChange = async (next: Record<string, unknown>) => {
    setSaving(true);
    setError('');
    try {
      const res = await fetch(`/api/matches/${matchId}/settings`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ settings: toSchemaInput(gameId, next) }),
      });
      if (!res.ok) {
        const body = await res.json().catch(() => ({}));
        setError(body.error ?? 'Could not save that setting.');
        return;
      }
      // The server's 'lobby' broadcast lands back here through useRemoteMatchSync and updates
      // the store for every client, this one included — so there is no local copy to keep in
      // step, exactly as with reordering below.
    } catch {
      setError('Could not connect. Your change was not saved.');
    } finally {
      setSaving(false);
    }
  };

  const handleMove = async (index: number, direction: -1 | 1) => {
    const target = index + direction;
    if (target < 0 || target >= players.length) return;
    const reordered = [...players];
    [reordered[index], reordered[target]] = [reordered[target], reordered[index]];

    setReordering(true);
    try {
      await fetch(`/api/matches/${matchId}/reorder`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ order: reordered.map(identityIdOf) }),
      });
    } finally {
      setReordering(false);
    }
  };

  const waitingFor = Math.max(0, minPlayers - players.length);
  const ready = waitingFor === 0;

  return (
    <MatchRoom
      eyebrow="Online room"
      title={gameName}
      back={{ href: '/', label: 'Back to dashboard' }}
      gameId={gameId}
      settings={settings}
      onSettingsChange={isHost ? handleSettingsChange : undefined}
      savingSettings={saving}
      notice={error ? <InlineFeedback tone="error">{error}</InlineFeedback> : undefined}
      invite={
        <Panel notch="card" accent="wire" accentBar className="room-invite">
          <p className="t-label">Room code</p>
          <p className="room-code-value">{roomCode}</p>
          <div className="room-invite-actions">
            <Button size="sm" variant="secondary" onClick={handleCopy} className="flex items-center gap-2">
              {copied ? <Check size={14} aria-hidden="true" /> : <Copy size={14} aria-hidden="true" />}
              {copied ? 'Link copied' : 'Copy link'}
            </Button>
            {canShare && (
              <Button size="sm" variant="secondary" onClick={handleShare} className="flex items-center gap-2">
                <Share2 size={14} aria-hidden="true" />Share
              </Button>
            )}
          </div>
          <p className="t-meta">Anyone with this code can join until the match starts.</p>
        </Panel>
      }
      playersCount={`${players.length} / ${Math.max(minPlayers, players.length)}`}
      playersAside={
        presence.connection !== 'connected' ? (
          <p role="status" className="t-meta">Reconnecting — the room updates on its own.</p>
        ) : undefined
      }
      players={
        <ul className="room-players">
          {players.map((player, index) => {
            const id = identityIdOf(player);
            // Only claim someone is online when presence is actually known; a dropped realtime
            // connection would otherwise quietly report the whole room as away.
            const known = presence.connection === 'connected' && presence.presenceReady;
            const online = known && presence.onlinePlayers.includes(id);
            return (
              <li key={id} className="room-player">
                <span className="room-player-seat">{index + 1}</span>
                <span className="room-player-name">
                  <span
                    className="room-player-dot"
                    data-online={online}
                    title={known ? (online ? 'Online' : 'Away') : 'Connection unknown'}
                  />
                  <span className="truncate">{player.name}</span>
                  <span className="sr-only">{known ? (online ? 'Online' : 'Away') : 'Connection unknown'}</span>
                  {id === you && <span className="room-tag">You</span>}
                  {id === hostId && <span className="room-tag">Host</span>}
                </span>
                {isHost && players.length > 1 && (
                  <span className="room-player-order">
                    <button
                      type="button"
                      onClick={() => handleMove(index, -1)}
                      disabled={index === 0 || reordering}
                      aria-label={`Move ${player.name} up`}
                    >
                      <ChevronUp className="w-4 h-4" />
                    </button>
                    <button
                      type="button"
                      onClick={() => handleMove(index, 1)}
                      disabled={index === players.length - 1 || reordering}
                      aria-label={`Move ${player.name} down`}
                    >
                      <ChevronDown className="w-4 h-4" />
                    </button>
                  </span>
                )}
              </li>
            );
          })}
          {Array.from({ length: waitingFor }).map((_, i) => (
            <li key={`empty-${i}`} className="room-player room-player-empty">
              <span className="room-player-seat">{players.length + i + 1}</span>
              <span>Waiting for a player…</span>
            </li>
          ))}
        </ul>
      }
      status={
        isHost
          ? ready
            ? 'Everyone is in. Start when you are ready.'
            : `Waiting for ${waitingFor} more ${waitingFor === 1 ? 'player' : 'players'}.`
          : ready
            ? 'The host starts the match.'
            : `Waiting for ${waitingFor} more ${waitingFor === 1 ? 'player' : 'players'}.`
      }
      action={
        isHost ? (
          <Button onClick={onStart} disabled={!ready || starting} className="room-action">
            {starting ? 'Starting…' : 'Start match'}
          </Button>
        ) : null
      }
    />
  );
}
