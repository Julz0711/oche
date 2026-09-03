// lib/games/cricket/components.tsx
import { CricketState, CricketNumber, CRICKET_NUMBERS, Marks } from './engine';
import { CricketSettings } from './schema';
import { PlayerId } from '@/lib/types';
import { Crosshair } from 'lucide-react';

function numberLabel(n: CricketNumber): string {
  return n === 'bull' ? 'BULL' : String(n);
}

function MarkIndicator({ marks }: { marks: Marks }) {
  if (marks === 3) {
    return <span className="text-double font-bold text-base leading-none">⊗</span>;
  }
  return (
    <span className="flex gap-0.5">
      {[0, 1, 2].map((i) => (
        <span key={i} className={`w-2 h-2 rounded-full ${i < marks ? 'bg-wire' : 'bg-sisal/20'}`} />
      ))}
    </span>
  );
}

export function ScoreboardSlot({
  state,
  playerId,
}: {
  state: CricketState;
  playerId: PlayerId;
  settings: CricketSettings;
}) {
  const isCurrentPlayer = state.players[state.currentPlayerIndex] === playerId;
  const legsWon = state.legsWon[playerId];

  return (
    <div
      className={`relative rounded-2xl p-4 border-2 transition-colors duration-300 ${
        isCurrentPlayer ? 'border-wire bg-wire/10' : 'border-transparent bg-slate'
      }`}
    >
      {isCurrentPlayer && (
        <Crosshair className="absolute top-3 right-3 w-4 h-4 text-wire" aria-label="On throw" />
      )}
      <div className="text-xs font-bold uppercase tracking-widest text-sisal mb-2">{playerId}</div>

      <div className="flex flex-col gap-1">
        {CRICKET_NUMBERS.map((n) => (
          <div key={n} className="flex items-center justify-between text-sm">
            <span className="font-bold text-chalk w-10">{numberLabel(n)}</span>
            <MarkIndicator marks={state.marks[playerId][n]} />
          </div>
        ))}
      </div>

      <div className="mt-2 pt-2 border-t border-sisal/20 flex items-center justify-between">
        <span className="text-xs font-bold uppercase tracking-widest text-sisal">Points</span>
        <span className="text-xl font-display font-bold text-chalk">{state.points[playerId]}</span>
      </div>

      <div className="flex items-center gap-1.5 mt-2 text-wire">
        <span className="text-xs font-bold">Legs: {legsWon}</span>
      </div>
    </div>
  );
}
