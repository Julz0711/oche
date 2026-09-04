// components/organisms/MatchLobby.tsx
'use client';
import { Button } from '@/components/atoms/Button';
import { Copy, Crosshair, ChevronUp, ChevronDown } from 'lucide-react';
import { useState } from 'react';
import { identityIdOf, MatchPlayerDoc } from '@/lib/matchLobby';

interface MatchLobbyProps {
  matchId: string;
  roomCode: string;
  players: MatchPlayerDoc[];
  /** [min, max] players this game supports — drives the "waiting for player" placeholders,
   *  the join-progress counter, and when Start becomes enabled. */
  playerRange: [number, number];
  isHost: boolean;
  onStart: () => void;
  starting: boolean;
}

export function MatchLobby({ matchId, roomCode, players, playerRange, isHost, onStart, starting }: MatchLobbyProps) {
  const [copied, setCopied] = useState(false);
  const [reordering, setReordering] = useState(false);
  const joinUrl = typeof window !== 'undefined' ? `${window.location.origin}/join/${roomCode}` : '';
  const [minPlayers, maxPlayers] = playerRange;

  const handleCopy = async () => {
    await navigator.clipboard.writeText(joinUrl);
    setCopied(true);
    setTimeout(() => setCopied(false), 1500);
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
      // The server's broadcast 'lobby' event (received via useRemoteMatchSync) updates the
      // `players` prop for every connected client, including this one — no local state to sync.
    } finally {
      setReordering(false);
    }
  };

  return (
    <div className="rounded-2xl bg-slate p-6 border-2 border-wire/30 flex flex-col items-center gap-4 max-w-md mx-auto">
      <Crosshair className="w-8 h-8 text-wire" />
      <div className="text-center rounded-xl border-2 border-wire/20 bg-oche px-4 py-2 w-full">
        <div className="text-xs font-bold uppercase tracking-widest text-sisal">Room code</div>
        {/* Explicit pixel size, not text-4xl/text-3xl — this project's fontSize scale replaces
            those with much larger custom values (see lib/theme.ts), which is right for a big
            scoreboard number but far too big for a 6-character room code. */}
        <div className="text-[32px] font-display font-bold tracking-[0.2em] text-wire">{roomCode}</div>
      </div>

      <button
        onClick={handleCopy}
        className="flex items-center gap-2 justify-center text-sm text-sisal hover:text-chalk hover:border-wire rounded-xl px-3 py-1.5 bg-oche border-2 border-sisal/30 w-full max-w-full overflow-hidden transition-colors"
      >
        <Copy className="w-3.5 h-3.5 shrink-0" />
        <span className="truncate">{copied ? 'Copied!' : joinUrl}</span>
      </button>

      <div className="w-full flex items-center justify-between text-[11px] font-bold uppercase tracking-widest text-sisal">
        <span>Players</span>
        <span>
          {players.length}/{maxPlayers} joined · min {minPlayers}
        </span>
      </div>

      <div className="flex flex-col gap-2 w-full">
        {players.map((player, index) => (
          <div
            key={identityIdOf(player)}
            className="flex items-center gap-2 rounded-xl p-3 bg-double/15 border-2 border-double/40 text-double font-bold"
          >
            <span className="flex-1 text-left truncate">{player.name}</span>
            {isHost && players.length > 1 && (
              <div className="flex flex-col gap-0.5 shrink-0">
                <button
                  type="button"
                  onClick={() => handleMove(index, -1)}
                  disabled={index === 0 || reordering}
                  aria-label={`Move ${player.name} up`}
                  className="w-6 h-5 flex items-center justify-center rounded-md border border-sisal/30 bg-oche text-sisal disabled:opacity-30 hover:border-wire transition-colors"
                >
                  <ChevronUp className="w-3.5 h-3.5" />
                </button>
                <button
                  type="button"
                  onClick={() => handleMove(index, 1)}
                  disabled={index === players.length - 1 || reordering}
                  aria-label={`Move ${player.name} down`}
                  className="w-6 h-5 flex items-center justify-center rounded-md border border-sisal/30 bg-oche text-sisal disabled:opacity-30 hover:border-wire transition-colors"
                >
                  <ChevronDown className="w-3.5 h-3.5" />
                </button>
              </div>
            )}
          </div>
        ))}

        {players.length < minPlayers &&
          Array.from({ length: minPlayers - players.length }).map((_, i) => (
            <div
              key={`empty-${i}`}
              className="rounded-xl p-3 text-center font-bold bg-oche text-sisal/50 border-2 border-sisal/20"
            >
              Waiting for player…
            </div>
          ))}
      </div>

      {isHost && (
        <Button onClick={onStart} disabled={players.length < minPlayers || starting}>
          {starting ? 'Starting…' : 'Start Match'}
        </Button>
      )}
    </div>
  );
}
