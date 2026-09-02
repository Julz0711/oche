// lib/games/x01/components.tsx
import { X01State, computeVisitTotal } from './engine';
import { X01Settings } from './schema';
import { PlayerId } from '@/lib/types';
import { Numeral } from '@/components/atoms/Numeral';
import { Trophy, Crosshair } from 'lucide-react';

export function ScoreboardSlot({
  state,
  playerId,
  settings,
}: {
  state: X01State;
  playerId: PlayerId;
  settings: X01Settings;
}) {
  const isCurrentPlayer = state.players[state.currentPlayerIndex] === playerId;
  const startedOn = settings.checkIn === 'straight' ? true : state.isOnDouble[playerId];
  const pending = isCurrentPlayer ? computeVisitTotal(state.currentVisit, startedOn).total : 0;
  const score = state.playerScores[playerId] - pending;
  const legsWon = state.legsWon[playerId];

  return (
    <div
      className={`relative rounded-2xl p-5 border-2 transition-colors duration-300 ${
        isCurrentPlayer ? 'border-wire bg-wire/10' : 'border-transparent bg-slate'
      }`}
    >
      {isCurrentPlayer && (
        <Crosshair className="absolute top-4 right-4 w-4 h-4 text-wire" aria-label="On throw" />
      )}
      <div className="text-xs font-bold uppercase tracking-widest text-sisal">{playerId}</div>
      <Numeral value={score} size="4xl" className="font-display leading-none block mt-1" />
      <div className="flex items-center gap-1.5 mt-3 text-wire">
        <Trophy className="w-4 h-4" fill="currentColor" />
        <span className="text-sm font-bold">{legsWon}</span>
      </div>
    </div>
  );
}
