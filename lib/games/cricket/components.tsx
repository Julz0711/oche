// lib/games/cricket/components.tsx
import { CricketState, CricketNumber, CRICKET_NUMBERS, Marks, marksForThrow } from './engine';
import { CricketSettings } from './schema';
import { PlayerId } from '@/lib/types';
import { Numeral } from '@/components/atoms/Numeral';
import { DartBadge } from '@/components/atoms/DartBadge';
import { Panel } from '@/components/atoms';
import { Crosshair, Target } from 'lucide-react';

const TOTAL_MARKS = CRICKET_NUMBERS.length * 3; // 7 numbers, 3 marks to close each = 21

function numberLabel(n: CricketNumber): string {
  return n === 'bull' ? 'BULL' : String(n);
}

/** Always-visible progress on phones, without opening the full score details. */
export function CricketMarksStrip({ state, playerId }: { state: CricketState; playerId: PlayerId }) {
  const recent = state.players[state.currentPlayerIndex] === playerId ? state.currentVisit :
    state.visitHistory.at(-1)?.playerId === playerId && state.visitHistory.at(-1)?.legNumberBefore === state.currentLegNumber ? state.visitHistory.at(-1)!.throws : [];
  return <div className="cricket-marks-strip" aria-label="Cricket marks">
    {CRICKET_NUMBERS.map(number => {
      const marks = state.marks[playerId][number];
      const hit = recent.some(dart => marksForThrow(dart.sector, dart.ring)?.number === number);
      return <span key={number} data-hit={hit} data-closed={marks === 3} aria-label={`${numberLabel(number)}: ${marks} of 3 marks${hit ? ', hit this visit' : ''}`}>
        <small>{number === 'bull' ? 'B' : number}</small><strong>{['·', '/', '×', '⊗'][marks]}</strong>
      </span>;
    })}
  </div>;
}

function MarkIndicator({ marks }: { marks: Marks }) {
  if (marks === 3) {
    return <span className="text-double font-bold text-2xl leading-none">⊗</span>;
  }
  return (
    <span className="flex gap-1">
      {[0, 1, 2].map((i) => (
        <span key={i} className={`w-3 h-3 rounded-full ${i < marks ? 'bg-wire' : 'bg-sisal/20'}`} />
      ))}
    </span>
  );
}

function MarksBar({ value, target }: { value: number; target: number }) {
  const pct = target > 0 ? Math.min(100, (value / target) * 100) : 0;
  return (
    <div className="w-full h-2 rounded-full bg-oche overflow-hidden border border-sisal/20">
      <div className="h-full rounded-full bg-wire transition-all duration-300" style={{ width: `${pct}%` }} />
    </div>
  );
}

function totalMarksFor(state: CricketState, playerId: PlayerId): number {
  return CRICKET_NUMBERS.reduce((sum, n) => sum + state.marks[playerId][n], 0);
}

/** This player's most recently completed visit, regardless of leg — mirrors what
 *  GameModule.lastCompletedVisit does generically, computed inline here since this component
 *  only receives `state`, not the module itself. */
function lastCompletedVisitFor(state: CricketState, playerId: PlayerId) {
  for (let i = state.visitHistory.length - 1; i >= 0; i--) {
    if (state.visitHistory[i].playerId === playerId) return state.visitHistory[i];
  }
  return null;
}

/** Compact score slot: Points (the primary "how am I doing" number, like X01's remaining
 *  score), a marks-closed progress bar, and the last 3 darts thrown. The detailed per-number
 *  marks breakdown lives in HistoryPanel below instead — it doesn't fit this slot's width. */
export function ScoreboardSlot({
  state,
  playerId,
  settings,
  displayName,
  compact = false,
}: {
  state: CricketState;
  playerId: PlayerId;
  settings: CricketSettings;
  displayName?: string;
  compact?: boolean;
}) {
  const isCurrentPlayer = state.players[state.currentPlayerIndex] === playerId;
  const totalMarks = totalMarksFor(state, playerId);
  const lastVisit = lastCompletedVisitFor(state, playerId);
  const lastThrows = isCurrentPlayer ? state.currentVisit : (lastVisit?.throws ?? []);

  // Closing all 7 numbers only wins the leg if you also lead (or tie) every opponent on points
  // (engine.ts's endVisit) — surfaced here so "closed out but still trailing" reads as a clear
  // status instead of "I closed everything, why didn't the game end?".
  const hasClosedAll = CRICKET_NUMBERS.every((n) => state.marks[playerId][n] === 3);
  const maxOpponentPoints = Math.max(
    0,
    ...state.players.filter((p) => p !== playerId).map((p) => state.points[p])
  );
  const pointsBehind = settings.scoring !== 'no-points' && hasClosedAll ? Math.max(0, maxOpponentPoints - state.points[playerId]) : 0;

  if (compact) return (
    <div className="compact-score">
      <div className="compact-player-name" title={displayName ?? playerId}>{displayName ?? playerId}</div>
      <span className="compact-score-value">{settings.scoring === 'no-points' ? totalMarks : state.points[playerId]}</span>
      <div className="compact-score-meta"><span>{totalMarks}/{TOTAL_MARKS} marks</span><span>L {state.legsWon[playerId]}</span></div>
      {pointsBehind > 0 && <div className="compact-score-hint text-treble">Need {pointsBehind} more points</div>}
    </div>
  );

  return (
    <Panel accent="wire" active={isCurrentPlayer} activeBadge={false} className="match-scorecard p-5">
      {isCurrentPlayer && (
        <Crosshair className="absolute top-4 right-4 w-4 h-4 text-wire" aria-label="On throw" />
      )}
      <div className="text-xs font-bold uppercase tracking-widest text-sisal">{displayName ?? playerId}</div>
      <Numeral value={settings.scoring === 'no-points' ? totalMarks : state.points[playerId]} size="4xl" className="font-display leading-none block mt-1" />
      {pointsBehind > 0 && (
        <div className="flex items-center gap-1.5 mt-2 text-treble">
          <Target className="w-3.5 h-3.5 shrink-0" />
          <span className="text-xs font-display font-bold uppercase tracking-wide">
            Closed out — need {pointsBehind} more point{pointsBehind === 1 ? '' : 's'}
          </span>
        </div>
      )}

      <div className="flex items-center justify-between mt-3 mb-1">
        <span className="text-[10px] font-bold uppercase tracking-widest text-sisal">Marks</span>
        <span className="text-[10px] font-bold text-wire">
          {totalMarks}/{TOTAL_MARKS}
        </span>
      </div>
      <MarksBar value={totalMarks} target={TOTAL_MARKS} />

      <div className="flex items-center gap-1.5 mt-3 min-h-[36px]">
        {lastThrows.length > 0 ? (
          lastThrows.map((t, i) => <DartBadge key={i} t={t} />)
        ) : (
          <span className="text-sisal/40 text-xs">No throws yet</span>
        )}
      </div>
    </Panel>
  );
}

/** The detailed per-number marks grid + legs — moved here from the score slot (too small a
 *  space for 7 rows of data) into the roomier history-panel slot, per-game override via
 *  GameModule.HistoryPanel. */
export function HistoryPanel({
  state,
  playerId,
  displayName,
}: {
  state: CricketState;
  playerId: PlayerId;
  settings: CricketSettings;
  displayName?: string;
}) {
  const legsWon = state.legsWon[playerId];

  return (
    <Panel className="p-4 flex flex-col gap-3 min-h-[240px]">
      <div className="text-xs font-bold uppercase tracking-widest text-sisal">{displayName ?? playerId}</div>

      <div className="flex flex-col gap-1.5">
        {CRICKET_NUMBERS.map((n) => {
          const recentThrows = state.players[state.currentPlayerIndex] === playerId ? state.currentVisit :
            state.visitHistory.at(-1)?.playerId === playerId && state.visitHistory.at(-1)?.legNumberBefore === state.currentLegNumber ? state.visitHistory.at(-1)!.throws : [];
          const hit = recentThrows.some(dart => marksForThrow(dart.sector, dart.ring)?.number === n);
          return <div key={n} className="cricket-mark-row flex items-center justify-between bg-oche border border-sisal/10 px-3 py-2" data-hit={hit} data-closed={state.marks[playerId][n] === 3}>
            <span className="font-display font-bold text-xl text-chalk w-12">{numberLabel(n)}</span>
            {hit && <span className="text-[10px] font-bold text-wire">HIT</span>}
            <MarkIndicator marks={state.marks[playerId][n]} />
          </div>;
        })}
      </div>

      <div className="mt-1 pt-2 border-t border-sisal/20 flex items-center gap-1.5 text-wire">
        <span className="text-xs font-bold uppercase tracking-widest">Legs: {legsWon}</span>
      </div>
    </Panel>
  );
}
