// lib/games/x01/components.tsx
import { X01State, computeVisitTotal } from './engine';
import { X01Settings } from './schema';
import { PlayerId } from '@/lib/types';
import { Numeral } from '@/components/atoms/Numeral';

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
    <div className={`p-4 rounded ${isCurrentPlayer ? 'bg-wire text-oche' : 'bg-slate text-chalk'}`}>
      <div className="text-sm font-semibold mb-2">{playerId.toUpperCase()}</div>
      <Numeral value={score} size="2xl" />
      <div className="text-xs mt-2">Legs: {legsWon}</div>
    </div>
  );
}
