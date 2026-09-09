'use client';
import { CricketMarksStrip } from '@/lib/games/cricket/components';

import { useEffect, useRef } from 'react';
import type { GameModule, PlayerId, Throw } from '@/lib/types';
import { DartboardInput } from './DartboardInput';
import { Panel } from '@/components/atoms';
import { DartBadge } from '@/components/atoms/DartBadge';

interface MobileMatchProps {
  gameModule: GameModule;
  state: any;
  settings: any;
  displayNames: Map<string, string>;
  disabled: boolean;
  onThrow: (dart: Throw) => void;
  onUndo: () => void;
  error: string | null;
  onDismissError: () => void;
}

/** The score list owns scrolling; the input dock remains in the viewport's grid flow. */
export function MobileMatch({ gameModule: game, state, settings, displayNames, disabled, onThrow, onUndo, error, onDismissError }: MobileMatchProps) {
  const scroller = useRef<HTMLDivElement>(null);
  const active = game.currentPlayer(state);
  const visit = game.visitProgress(state);
  const players = game.players(state);
  const name = (id: PlayerId) => displayNames.get(id) ?? id.replace(/^player(\d+)$/, 'Player $1');

  useEffect(() => {
    const list = scroller.current;
    const row = list?.querySelector<HTMLElement>('[data-active="true"]');
    if (!list || !row) return;
    // Scroll only this region, never the document or the scoring dock.
    const top = row.offsetTop - list.offsetTop;
    if (top < list.scrollTop || top + row.offsetHeight > list.scrollTop + list.clientHeight) {
      list.scrollTo({ top: Math.max(0, top - 8), behavior: window.matchMedia('(prefers-reduced-motion: reduce)').matches ? 'instant' : 'smooth' });
    }
  }, [active]);

  return (
    <section className="mobile-match" aria-label="Live match">
      <div className="mobile-match-meta">
        {game.id === 'x01' && <span>{settings.startingScore} · {settings.checkOut} out · </span>}
        {game.matchInfo(state, settings).map(entry => <span key={entry.label} className={entry.emphasis === 'hero' ? 'text-wire font-bold' : ''}>{entry.label} {entry.value} · </span>)}
        <span>First to {settings.firstTo}</span>
      </div>
      <div ref={scroller} className="mobile-score-list" tabIndex={0} aria-label="Player scores and history">
        {players.map(player => {
          const isActive = player === active;
          const last = game.lastCompletedVisit(state, player);
          const darts = isActive ? visit.throws : last?.throws ?? [];
          return (
            <article key={player} className="mobile-player-shell" data-active={isActive} aria-label={`${name(player)}${isActive ? ', on throw' : ''}`}>
              <Panel notch="panel" accent="wire" active={isActive} activeBadge={false} className="mobile-player">
              <div className={`mobile-score mobile-score-${game.id}`}>
                <game.ScoreboardSlot compact state={state} settings={settings} playerId={player} displayName={name(player)} />
              </div>
              <div className="mobile-visit">
                <div className="mobile-darts">
                  {Array.from({ length: visit.max }, (_, i) => <span className="mobile-dart" key={i}>{darts[i] ? <DartBadge t={darts[i]} /> : '—'}</span>)}
                </div>
                <span className="text-xs text-sisal/70">{isActive ? 'This visit' : last?.busted ? 'Bust' : 'Last visit'} <strong className="text-chalk tabular-nums">{!isActive && last?.busted ? 0 : darts.reduce((sum, dart) => sum + dart.points, 0)}</strong></span>
              </div>
              {game.id === 'cricket' && <CricketMarksStrip state={state} playerId={player} />}
              <details className="mobile-player-details" data-history-only={!game.HistoryPanel}>
                <summary aria-label={`${game.HistoryPanel ? 'Score details' : 'Visit history'} for ${name(player)}`}><span className="sr-only">{game.HistoryPanel ? 'Score details' : 'Visit history'}</span></summary>
                {game.HistoryPanel ? <game.HistoryPanel state={state} settings={settings} playerId={player} displayName={name(player)} /> : (
                  <div className="flex flex-col gap-2 py-2">
                    {game.visitHistory(state, player).length === 0 && <p className="text-xs text-sisal/60">No completed visits yet</p>}
                    {game.visitHistory(state, player).map((entry, i) => <div key={i} className="flex items-center gap-2">
                      {entry.throws.map((dart, j) => <DartBadge key={j} t={dart} />)}
                      <span className="ml-auto text-sm tabular-nums">{entry.busted ? 'Bust' : Math.abs(entry.scoreBefore - entry.scoreAfter)}</span>
                    </div>)}
                  </div>
                )}
              </details>
              </Panel>
            </article>
          );
        })}
      </div>
      <div className="mobile-input-dock">
        {error && <div role="alert" className="flex items-center justify-between gap-2 text-sm text-chalk bg-treble/30 p-2">{error}<button onClick={onDismissError} className="underline min-h-11">Dismiss</button></div>}
        <div className="mobile-turn" role="status"><span className="truncate">{disabled ? `Waiting for ${name(active)}` : `${name(active)} to throw`}</span><span className="shrink-0 text-sisal/60">{visit.darts} / {visit.max} darts</span></div>
        <DartboardInput key={active} compact onThrow={onThrow} onUndo={onUndo} disabled={disabled} visitDartCount={visit.darts} />
      </div>
    </section>
  );
}
