// components/organisms/DartboardInput.tsx
'use client';
import { useState } from 'react';
import { Throw } from '@/lib/types';
import { CENTER, RADIUS, BOARD_ORDER, annularWedgePath, segmentAngles } from '@/lib/dartboard-geometry';

interface DartboardInputProps {
  onThrow: (throw_: Throw) => void;
  disabled?: boolean;
  /** How many darts have already landed in the current, still-open visit (0, 1, or 2). Used to tag the correct `order` on the next dart. Defaults to 0. */
  visitDartCount?: number;
  /** Hit-frequency map (key: `${ring}${sector}`) for the current player, used to shade the decorative board. Defaults to empty (uniform, unshaded board). */
  heatmap?: Record<string, number>;
}

type Modifier = 'S' | 'D' | 'T';

const KEYPAD_NUMBERS = Array.from({ length: 20 }, (_, i) => i + 1);

export function DartboardInput({ onThrow, disabled = false, visitDartCount = 0, heatmap = {} }: DartboardInputProps) {
  const [modifier, setModifier] = useState<Modifier>('S');
  const order = Math.min(visitDartCount, 2) as 0 | 1 | 2;
  const maxHeat = Math.max(1, ...Object.values(heatmap));
  const heatOpacity = (key: string) => {
    const count = heatmap[key] ?? 0;
    return 0.08 + (count / maxHeat) * 0.92; // 0.08 (unhit) to 1.0 (most-hit) — wide range so hot spots really pop
  };

  const throwSector = (sector: number) => {
    if (disabled) return;
    if (sector === 25 && modifier === 'T') return; // no such throw as a "triple bull" — the BULL button is disabled for this case below, but guard here too

    if (sector === 25) {
      // DOUBLE gives inner bull (50); anything else (only 'S' can reach here now) gives outer bull (25).
      const ring = modifier === 'D' ? 'IB' : 'OB';
      const points = ring === 'IB' ? 50 : 25;
      onThrow({ sector: 25 as any, ring, points, order });
    } else {
      const points = sector * (modifier === 'D' ? 2 : modifier === 'T' ? 3 : 1);
      onThrow({ sector: sector as any, ring: modifier, points, order });
    }

    setModifier('S');
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
      {/* Decorative dartboard — visual reference only, not interactive */}
      <svg viewBox="0 0 400 400" className="w-full max-w-md aspect-square">
        <circle cx={CENTER} cy={CENTER} r={RADIUS.boardEdge} fill="var(--oche)" stroke="var(--chalk)" strokeWidth="1" />

        {BOARD_ORDER.map((segment, i) => {
          const { startAngle, endAngle, midAngle } = segmentAngles(i);
          const labelPoint = {
            x: CENTER + ((RADIUS.doubleInner + RADIUS.boardEdge) / 2) * Math.cos(midAngle),
            y: CENTER + ((RADIUS.doubleInner + RADIUS.boardEdge) / 2) * Math.sin(midAngle),
          };

          return (
            <g key={segment}>
              <path
                d={annularWedgePath(RADIUS.doubleInner, RADIUS.boardEdge, startAngle, endAngle)}
                fill="var(--double)"
                fillOpacity={heatOpacity(`D${segment}`)}
                stroke="var(--oche)" strokeWidth="2"
              />
              <path
                d={annularWedgePath(RADIUS.outerSingleInner, RADIUS.doubleInner, startAngle, endAngle)}
                fill="var(--slate)"
                fillOpacity={heatOpacity(`S${segment}`)}
                stroke="var(--oche)" strokeWidth="2"
              />
              <path
                d={annularWedgePath(RADIUS.trebleInner, RADIUS.outerSingleInner, startAngle, endAngle)}
                fill="var(--treble)"
                fillOpacity={heatOpacity(`T${segment}`)}
                stroke="var(--oche)" strokeWidth="2"
              />
              <path
                d={annularWedgePath(RADIUS.innerSingleInner, RADIUS.trebleInner, startAngle, endAngle)}
                fill="var(--slate)"
                fillOpacity={heatOpacity(`S${segment}`)}
                stroke="var(--oche)" strokeWidth="2"
              />
              <text x={labelPoint.x} y={labelPoint.y} textAnchor="middle" className="text-xs fill-chalk" dy="0.3em">
                {segment}
              </text>
            </g>
          );
        })}

        <circle
          cx={CENTER}
          cy={CENTER}
          r={RADIUS.innerSingleInner}
          fill="var(--wire)"
          fillOpacity={heatOpacity('OB25')}
          stroke="var(--oche)"
          strokeWidth="2"
        />
        <circle
          cx={CENTER}
          cy={CENTER}
          r={RADIUS.innerSingleInner * 0.4}
          fill="var(--treble)"
          fillOpacity={heatOpacity('IB25')}
          stroke="var(--oche)"
          strokeWidth="2"
        />
      </svg>

      {/* Number keypad */}
      <div className="grid grid-cols-5 gap-3 max-w-md w-full">
        {KEYPAD_NUMBERS.map((n) => (
          <button
            key={n}
            onClick={() => throwSector(n)}
            disabled={disabled}
            className="min-h-14 min-w-14 rounded-full bg-slate text-chalk text-lg font-bold hover:opacity-80 disabled:opacity-50 transition-transform active:scale-95"
          >
            {n}
          </button>
        ))}
        <button
          onClick={() => throwSector(25)}
          disabled={disabled || modifier === 'T'}
          className="min-h-14 min-w-14 rounded-full bg-treble text-chalk text-lg font-bold hover:opacity-80 disabled:opacity-50 col-span-5 transition-transform active:scale-95"
        >
          BULL (25)
        </button>
      </div>

      {/* Modifiers + miss, grouped in one row below the keypad */}
      <div className="grid grid-cols-3 gap-3 max-w-md w-full">
        <button
          onClick={() => toggleModifier('D')}
          disabled={disabled}
          aria-pressed={modifier === 'D'}
          className={`min-h-14 px-2 rounded-full font-bold text-lg transition-colors ${
            modifier === 'D' ? 'bg-double text-chalk' : 'bg-double/15 text-double border border-double/40'
          } disabled:opacity-50`}
        >
          DOUBLE
        </button>
        <button
          onClick={() => toggleModifier('T')}
          disabled={disabled}
          aria-pressed={modifier === 'T'}
          className={`min-h-14 px-2 rounded-full font-bold text-lg transition-colors ${
            modifier === 'T' ? 'bg-treble text-chalk' : 'bg-treble/15 text-treble border border-treble/40'
          } disabled:opacity-50`}
        >
          TRIPLE
        </button>
        <button
          onClick={handleMiss}
          disabled={disabled}
          className="min-h-14 px-2 rounded-full font-bold text-lg bg-slate text-sisal border border-sisal/30 hover:opacity-80 disabled:opacity-50"
        >
          MISS
        </button>
      </div>
    </div>
  );
}
