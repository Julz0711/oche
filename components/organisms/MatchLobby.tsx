// components/organisms/MatchLobby.tsx
'use client';
import { Button } from '@/components/atoms/Button';
import { Copy, Crosshair } from 'lucide-react';
import { useState } from 'react';

interface MatchLobbyProps {
  roomCode: string;
  players: { name: string }[];
  isHost: boolean;
  onStart: () => void;
  starting: boolean;
}

export function MatchLobby({ roomCode, players, isHost, onStart, starting }: MatchLobbyProps) {
  const [copied, setCopied] = useState(false);
  const joinUrl = typeof window !== 'undefined' ? `${window.location.origin}/join/${roomCode}` : '';

  const handleCopy = async () => {
    await navigator.clipboard.writeText(joinUrl);
    setCopied(true);
    setTimeout(() => setCopied(false), 1500);
  };

  return (
    <div className="rounded-2xl bg-slate p-6 border border-wire/30 flex flex-col items-center gap-4 max-w-md mx-auto">
      <Crosshair className="w-8 h-8 text-wire" />
      <div className="text-center">
        <div className="text-xs font-bold uppercase tracking-widest text-sisal">Room code</div>
        <div className="text-4xl font-display font-bold tracking-[0.2em]">{roomCode}</div>
      </div>

      <button
        onClick={handleCopy}
        className="flex items-center gap-2 text-sm text-sisal hover:text-chalk rounded-full px-3 py-1.5 bg-oche border border-sisal/30"
      >
        <Copy className="w-3.5 h-3.5" />
        {copied ? 'Copied!' : joinUrl}
      </button>

      <div className="flex flex-col gap-2 w-full">
        {[0, 1].map((seat) => {
          const player = players[seat];
          return (
            <div
              key={seat}
              className={`rounded-xl p-3 text-center font-bold ${
                player ? 'bg-double/15 text-double' : 'bg-oche text-sisal/50 border border-sisal/20'
              }`}
            >
              {player ? player.name : 'Waiting for player…'}
            </div>
          );
        })}
      </div>

      {isHost && (
        <Button onClick={onStart} disabled={players.length < 2 || starting}>
          {starting ? 'Starting…' : 'Start Match'}
        </Button>
      )}
    </div>
  );
}
