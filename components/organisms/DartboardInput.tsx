// components/organisms/DartboardInput.tsx
'use client';
import { useState } from 'react';
import { Throw } from '@/lib/types';
import { CENTER, RADIUS, BOARD_ORDER, annularWedgePath, segmentAngles } from '@/lib/dartboard-geometry';
import { HeatmapBoard } from './HeatmapBoard';
import { Panel } from '@/components/atoms';

interface DartboardInputProps {
  onThrow: (throw_: Throw) => void;
  disabled?: boolean;
  /** How many darts have already landed in the current, still-open visit (0, 1, or 2). Used to tag the correct `order` on the next dart. Defaults to 0. */
  visitDartCount?: number;
  /** Hit-frequency map (key: `${ring}${sector}`) for the current player, used to shade the decorative board. Defaults to empty (uniform, unshaded board). */
  heatmap?: Record<string, number>;
}

type Modifier = 'S' | 'D' | 'T';
type BoardRing = 'S' | 'D' | 'T';

const KEYPAD_NUMBERS = Array.from({ length: 20 }, (_, i) => i + 1);

const HIGHLIGHT_CLASS = 'fill-transparent hover:fill-wire/20 active:fill-wire/50 transition-colors cursor-pointer';

export function DartboardInput({ onThrow, disabled = false, visitDartCount = 0, heatmap = {} }: DartboardInputProps) {
  const [modifier, setModifier] = useState<Modifier>('S');
  const order = Math.min(visitDartCount, 2) as 0 | 1 | 2;

  // Briefly highlights the board region a keypad press corresponds to, so keypad throws get the
  // same "where did that land" board feedback a direct board click already gives via its own
  // hover/active states. 'S' matches both physical single-band wedges (inner and outer single),
  // since a keypad press doesn't disambiguate which one — lighting up both is the honest answer.
  const [flash, setFlash] = useState<{ sector: number; ring: BoardRing | 'OB' | 'IB' } | null>(null);
  const flashRegion = (sector: number, ring: BoardRing | 'OB' | 'IB') => {
    setFlash({ sector, ring });
    setTimeout(() => setFlash(null), 220);
  };

  const throwSector = (sector: number) => {
    if (disabled) return;
    if (sector === 25 && modifier === 'T') return; // no such throw as a "triple bull" — the BULL button is disabled for this case below, but guard here too

    if (sector === 25) {
      // DOUBLE gives inner bull (50); anything else (only 'S' can reach here now) gives outer bull (25).
      const ring = modifier === 'D' ? 'IB' : 'OB';
      onThrow({ sector: 25 as any, ring, points: 0, order });
      flashRegion(25, ring);
    } else {
      onThrow({ sector: sector as any, ring: modifier, points: 0, order });
      flashRegion(sector, modifier);
    }

    setModifier('S');
  };

  /** Board clicks detect the ring from where on the segment was clicked, independent of the DOUBLE/TRIPLE toggle (which only drives the keypad). */
  const throwAt = (sector: number, ring: BoardRing | 'OB' | 'IB') => {
    if (disabled) return;
    onThrow({ sector: sector as any, ring, points: 0, order });
  };

  const handleMiss = () => {
    if (disabled) return;
    onThrow({ sector: 0 as any, ring: 'M', points: 0, order });
    setModifier('S');
  };

  const toggleModifier = (target: Modifier) => {
    if (disabled) return;
    setModifier((current) => (current === target ? 'S' : target));
  };

  return (
    <div className="flex flex-col items-center gap-4 w-full">
      {/* Dartboard: HeatmapBoard renders the visual (grey structure + heat), a transparent
          overlay on top makes it clickable — an alternative to the keypad below, not a
          replacement for it. */}
      <div className="relative w-full max-w-md">
        <HeatmapBoard heatmap={heatmap} />
        <svg viewBox="0 0 400 400" className="absolute inset-0 w-full h-full">
          {BOARD_ORDER.map((segment, i) => {
            const { startAngle, endAngle } = segmentAngles(i);
            const bands: { ring: BoardRing; inner: number; outer: number }[] = [
              { ring: 'S', inner: RADIUS.innerSingleInner, outer: RADIUS.trebleInner },
              { ring: 'T', inner: RADIUS.trebleInner, outer: RADIUS.outerSingleInner },
              { ring: 'S', inner: RADIUS.outerSingleInner, outer: RADIUS.doubleInner },
              { ring: 'D', inner: RADIUS.doubleInner, outer: RADIUS.boardEdge },
            ];
            return (
              <g key={segment}>
                {bands.map((band, bi) => (
                  <g key={bi}>
                    <path
                      d={annularWedgePath(band.inner, band.outer, startAngle, endAngle)}
                      className={disabled ? 'fill-transparent' : HIGHLIGHT_CLASS}
                      onClick={() => throwAt(segment, band.ring)}
                    />
                    {flash && flash.sector === segment && flash.ring === band.ring && (
                      <path
                        d={annularWedgePath(band.inner, band.outer, startAngle, endAngle)}
                        className="fill-wire/60 pointer-events-none"
                      />
                    )}
                  </g>
                ))}
              </g>
            );
          })}
          {/* Outer bull (25) drawn first, inner bull (50) drawn on top so it captures its own clicks */}
          <circle
            cx={CENTER}
            cy={CENTER}
            r={RADIUS.innerSingleInner}
            className={disabled ? 'fill-transparent' : HIGHLIGHT_CLASS}
            onClick={() => throwAt(25, 'OB')}
          />
          {flash && flash.sector === 25 && flash.ring === 'OB' && (
            <circle cx={CENTER} cy={CENTER} r={RADIUS.innerSingleInner} className="fill-wire/60 pointer-events-none" />
          )}
          <circle
            cx={CENTER}
            cy={CENTER}
            r={RADIUS.innerSingleInner * 0.4}
            className={disabled ? 'fill-transparent' : HIGHLIGHT_CLASS}
            onClick={() => throwAt(25, 'IB')}
          />
          {flash && flash.sector === 25 && flash.ring === 'IB' && (
            <circle
              cx={CENTER}
              cy={CENTER}
              r={RADIUS.innerSingleInner * 0.4}
              className="fill-wire/60 pointer-events-none"
            />
          )}
        </svg>
      </div>

      {/* Number keypad */}
      <div className="grid grid-cols-5 gap-3 max-w-md w-full">
        {KEYPAD_NUMBERS.map((n) => (
          <Panel
            key={n}
            as="button"
            notch="inset"
            onClick={() => throwSector(n)}
            disabled={disabled}
            className="min-h-14 min-w-14 flex items-center justify-center text-lg font-bold"
          >
            {n}
          </Panel>
        ))}
        <div className="col-span-5">
          <Panel
            as="button"
            notch="inset"
            fill="treble"
            onClick={() => throwSector(25)}
            disabled={disabled || modifier === 'T'}
            className="min-h-14 flex items-center justify-center text-lg font-bold"
          >
            BULL (25)
          </Panel>
        </div>
      </div>

      {/* Modifiers + miss, grouped in one row below the keypad */}
      <div className="grid grid-cols-3 gap-3 max-w-md w-full">
        <Panel
          as="button"
          notch="inset"
          accent="double"
          active={modifier === 'D'}
          activeBadge={false}
          onClick={() => toggleModifier('D')}
          disabled={disabled}
          aria-pressed={modifier === 'D'}
          className="min-h-14 px-2 flex items-center justify-center font-bold text-lg"
        >
          DOUBLE
        </Panel>
        <Panel
          as="button"
          notch="inset"
          accent="treble"
          active={modifier === 'T'}
          activeBadge={false}
          onClick={() => toggleModifier('T')}
          disabled={disabled}
          aria-pressed={modifier === 'T'}
          className="min-h-14 px-2 flex items-center justify-center font-bold text-lg"
        >
          TRIPLE
        </Panel>
        <Panel
          as="button"
          notch="inset"
          onClick={handleMiss}
          disabled={disabled}
          className="min-h-14 px-2 flex items-center justify-center font-bold text-lg text-sisal"
        >
          MISS
        </Panel>
      </div>
    </div>
  );
}
