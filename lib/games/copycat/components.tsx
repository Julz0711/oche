// lib/games/copycat/components.tsx
import { CopycatState } from './engine';
import { CopycatSettings } from './schema';
import { PlayerId } from '@/lib/types';
import { Numeral } from '@/components/atoms/Numeral';
import { Pips } from '@/components/atoms/Pips';
import { Panel } from '@/components/atoms';
import { Crosshair, Target } from 'lucide-react';

export function ScoreboardSlot({
  state,
  playerId,
  settings,
  displayName,
  compact = false,
}: {
  state: CopycatState;
  playerId: PlayerId;
  settings: CopycatSettings;
  displayName?: string;
  compact?: boolean;
}) {
  const isCurrentPlayer = state.players[state.currentPlayerIndex] === playerId;
  const pointsWon = state.pointsWon[playerId];
  // On match point, a matching visit only counts if its last dart is a double or inner bull
  // (engine.ts's endVisit) — otherwise the chase just continues, which reads as "stuck" if a
  // player doesn't know the rule is active. Surfaced here so it's visible before it costs a
  // point, not discovered after the fact.
  const isMatchPoint = pointsWon === settings.firstTo - 1;

  if (compact) return (
    <div className="compact-score">
      <div className="compact-player-name" title={displayName ?? playerId}>{displayName ?? playerId}</div>
      <span className="compact-score-value">{pointsWon}</span>
      <div className="compact-score-meta">First to {settings.firstTo}</div>
      {isMatchPoint && <div className="compact-score-hint text-treble">Match point · double finish</div>}
    </div>
  );

  return (
    <Panel accent="wire" active={isCurrentPlayer} activeBadge={false} className="match-scorecard p-5">
      {isCurrentPlayer && (
        <Crosshair className="absolute top-4 right-4 w-4 h-4 text-wire" aria-label="On throw" />
      )}
      <div className="text-xs font-bold uppercase tracking-widest text-sisal">{displayName ?? playerId}</div>
      <Numeral value={pointsWon} size="4xl" className="font-display leading-none block mt-1" />
      {isMatchPoint && (
        <div className="flex items-center gap-1.5 mt-2 text-treble">
          <Target className="w-3.5 h-3.5 shrink-0" />
          <span className="text-[10px] font-display font-bold uppercase tracking-wide">
            Match point — finish on a double
          </span>
        </div>
      )}
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
    </Panel>
  );
}
