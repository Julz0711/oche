// lib/games/copycat/components.tsx
import { CopycatState } from './engine';
import { CopycatSettings } from './schema';
import { PlayerId } from '@/lib/types';
import { Numeral } from '@/components/atoms/Numeral';
import { Pips } from '@/components/atoms/Pips';
import { Crosshair } from 'lucide-react';

export function ScoreboardSlot({
  state,
  playerId,
  settings,
  displayName,
}: {
  state: CopycatState;
  playerId: PlayerId;
  settings: CopycatSettings;
  displayName?: string;
}) {
  const isCurrentPlayer = state.players[state.currentPlayerIndex] === playerId;
  const pointsWon = state.pointsWon[playerId];

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
      <Numeral value={pointsWon} size="4xl" className="font-display leading-none block mt-1" />
      {/* Points won lives here now, not in the shared middle panel — see
         GameModule.raceProgressInScoreboard. Wire, not Copycat's own treble identity accent:
         treble also reads as "danger/bust" elsewhere in the app, and a progress indicator is
         the one place on the match screen that must never risk that association. */}
      <div className="flex items-center justify-between gap-2 mt-2">
        <span className="text-[9px] font-bold uppercase tracking-widest text-sisal/70">
          Race to {settings.firstTo}
        </span>
      </div>
      <Pips value={pointsWon} target={settings.firstTo} accent="wire" className="mt-1" />
    </div>
  );
}
