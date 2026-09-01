// lib/games/x01/components.tsx
import { X01State } from './engine';
import { PlayerId } from '@/lib/types';
import { Numeral } from '@/components/atoms/Numeral';

export function ScoreboardSlot({ state, playerId }: { state: X01State; playerId: PlayerId }) {
  const score = state.playerScores[playerId];
  const legsWon = state.legsWon[playerId];
  const isCurrentPlayer = state.players[state.currentPlayerIndex] === playerId;

  return (
    <div className={`p-4 rounded ${isCurrentPlayer ? 'bg-wire text-oche' : 'bg-slate text-chalk'}`}>
      <div className="text-sm font-semibold mb-2">{playerId.toUpperCase()}</div>
      <Numeral value={score} size="2xl" />
      <div className="text-xs mt-2">Legs: {legsWon}</div>
    </div>
  );
}
