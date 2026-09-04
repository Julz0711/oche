// lib/games/copycat/components.tsx
import { CopycatState } from './engine';
import { CopycatSettings } from './schema';
import { PlayerId } from '@/lib/types';
import { Numeral } from '@/components/atoms/Numeral';
import { Crosshair } from 'lucide-react';

export function ScoreboardSlot({
  state,
  playerId,
  displayName,
}: {
  state: CopycatState;
  playerId: PlayerId;
  settings: CopycatSettings;
  displayName?: string;
}) {
  const isCurrentPlayer = state.players[state.currentPlayerIndex] === playerId;

  return (
    <div
      className={`relative rounded-2xl p-5 border-2 transition-colors duration-300 ${
        isCurrentPlayer ? 'border-wire bg-wire/10' : 'border-transparent bg-slate'
      }`}
    >
      {isCurrentPlayer && (
        <Crosshair className="absolute top-4 right-4 w-4 h-4 text-wire" aria-label="On throw" />
      )}
      <div className="text-xs font-bold uppercase tracking-widest text-sisal">{displayName ?? playerId}</div>
      <Numeral value={state.pointsWon[playerId]} size="4xl" className="font-display leading-none block mt-1" />
    </div>
  );
}
