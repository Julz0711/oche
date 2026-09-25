// lib/games/x01/components.tsx
import { X01State, computeVisitTotal } from './engine';
import { X01Settings } from './schema';
import { suggestCheckout } from './checkoutSuggestion';
import { PlayerId } from '@/lib/types';
import { Numeral } from '@/components/atoms/Numeral';
import { Panel } from '@/components/atoms';
import { Trophy, Crosshair, Medal, Target } from 'lucide-react';

export function ScoreboardSlot({
  state,
  playerId,
  settings,
  displayName,
  compact = false,
}: {
  state: X01State;
  playerId: PlayerId;
  settings: X01Settings;
  displayName?: string;
  compact?: boolean;
}) {
  const isCurrentPlayer = state.players[state.currentPlayerIndex] === playerId;
  const startedOn = settings.checkIn === 'straight' ? true : state.isOnDouble[playerId];
  const pending = isCurrentPlayer ? computeVisitTotal(state.currentVisit, startedOn).total : 0;
  const score = state.playerScores[playerId] - pending;
  const legsWon = state.legsWon[playerId];
  const setsWon = state.setsWon[playerId];
  const setsEnabled = settings.sets > 0;

  // Live 3-dart average for the current leg only — same visits HistoryPanel shows (filtered to
  // this leg), plus this player's own in-progress visit if it's their turn, so it updates dart
  // by dart rather than only once a visit completes.
  const legVisits = state.visitHistory.filter(
    (entry) => entry.playerId === playerId && entry.legNumberBefore === state.currentLegNumber
  );
  let legDarts = legVisits.reduce((sum, entry) => sum + entry.throws.length, 0);
  let legScored = legVisits.reduce((sum, entry) => sum + Math.abs(entry.scoreAfter - entry.scoreBefore), 0);
  if (isCurrentPlayer) {
    legDarts += state.currentVisit.length;
    legScored += pending;
  }
  const legAvg3Dart = legDarts > 0 ? (legScored / legDarts) * 3 : 0;

  // A "possible closer" suggestion — the standard checkout-chart convention of a fresh 3-dart
  // route to zero, independent of how many darts are actually left in the current visit. Shown
  // only for the player on throw, since it's meant as an in-the-moment prompt, not a running fact.
  const checkout = isCurrentPlayer ? suggestCheckout(score, settings.checkOut) : null;

  if (compact) return (
    <div className="compact-score">
      <div className="compact-player-name" title={displayName ?? playerId}>{displayName ?? playerId}</div>
      <span className="compact-score-value">{score}</span>
      <div className="compact-score-meta"><span>Avg {legAvg3Dart.toFixed(1)}</span><span>Legs {legsWon}{setsEnabled ? ` · Sets ${setsWon}` : ''}</span></div>
      {checkout && <div className="compact-score-hint text-wire">{checkout.join(' · ')}</div>}
    </div>
  );

  return (
    <Panel accent="wire" active={isCurrentPlayer} activeBadge={false} className="match-scorecard p-5">
      {isCurrentPlayer && (
        <Crosshair className="absolute top-4 right-4 w-4 h-4 text-wire" aria-label="On throw" />
      )}
      <div className="text-xs font-bold uppercase tracking-widest text-sisal">{displayName ?? playerId}</div>
      <Numeral value={score} size="4xl" className="font-display leading-none block mt-1" />
      <div className="text-[10px] font-bold uppercase tracking-widest text-sisal/70 mt-1">
        Avg (leg) <span className="text-chalk">{legAvg3Dart.toFixed(1)}</span>
      </div>
      {checkout && (
        <div className="flex items-center gap-1.5 mt-2 text-wire">
          <Target className="w-3.5 h-3.5 shrink-0" />
          <span className="text-xs font-display font-bold uppercase tracking-wide">{checkout.join(' · ')}</span>
        </div>
      )}
      <div className="flex items-center gap-3 mt-2">
        {setsEnabled && (
          <div className="flex items-center gap-1.5 text-sisal">
            <Medal className="w-4 h-4" fill="currentColor" />
            <span className="text-sm font-bold">{setsWon}</span>
          </div>
        )}
        <div className="flex items-center gap-1.5 text-wire">
          <Trophy className="w-4 h-4" fill="currentColor" />
          <span className="text-sm font-bold">{legsWon}</span>
        </div>
      </div>
    </Panel>
  );
}
