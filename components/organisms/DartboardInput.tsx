// components/organisms/DartboardInput.tsx
'use client';
import { Throw } from '@/lib/types';

interface DartboardInputProps {
  onThrow: (throw_: Throw) => void;
  disabled?: boolean;
  /** How many darts have already landed in the current, still-open visit (0, 1, or 2). Used to tag the correct `order` on the next dart. Defaults to 0. */
  visitDartCount?: number;
}

export function DartboardInput({ onThrow, disabled = false, visitDartCount = 0 }: DartboardInputProps) {
  const segments = Array.from({ length: 20 }, (_, i) => i + 1);
  const order = Math.min(visitDartCount, 2) as 0 | 1 | 2;

  const handleSegmentClick = (sector: number, ring: 'S' | 'D' | 'T' | 'OB' | 'IB') => {
    if (disabled) return;
    const points = calculatePoints(sector, ring);
    onThrow({
      sector: sector as any,
      ring,
      points,
      order,
    });
  };

  const handleMiss = () => {
    if (disabled) return;
    onThrow({
      sector: 0 as any,
      ring: 'M',
      points: 0,
      order,
    });
  };

  return (
    <div className="flex flex-col items-center gap-4">
      <svg viewBox="0 0 400 400" className="w-64 h-64">
        {/* Dartboard circles and segments */}
        <circle cx="200" cy="200" r="190" fill="var(--oche)" stroke="var(--chalk)" strokeWidth="1" />

        {segments.map((segment) => {
          const angle = ((segment - 6) * 18) * (Math.PI / 180);
          const x = 200 + Math.cos(angle) * 150;
          const y = 200 + Math.sin(angle) * 150;
          return (
            <g key={segment}>
              {/* Treble ring */}
              <circle
                cx={x}
                cy={y}
                r="20"
                fill="var(--wire)"
                opacity="0.3"
                onClick={() => handleSegmentClick(segment, 'T')}
                className="cursor-pointer hover:opacity-60"
              />
              {/* Double ring */}
              <circle
                cx={x}
                cy={y}
                r="15"
                fill="var(--double)"
                opacity="0.3"
                onClick={() => handleSegmentClick(segment, 'D')}
                className="cursor-pointer hover:opacity-60"
              />
              {/* Single */}
              <circle
                cx={x}
                cy={y}
                r="10"
                fill="var(--slate)"
                opacity="0.3"
                onClick={() => handleSegmentClick(segment, 'S')}
                className="cursor-pointer hover:opacity-60"
              />
              <text x={x} y={y} textAnchor="middle" className="text-xs fill-chalk" dy="0.3em">
                {segment}
              </text>
            </g>
          );
        })}

        {/* Bulls */}
        <circle cx="200" cy="200" r="12" fill="var(--treble)" onClick={() => handleSegmentClick(25, 'IB')} className="cursor-pointer" />
        <circle cx="200" cy="200" r="8" fill="var(--wire)" onClick={() => handleSegmentClick(25, 'OB')} className="cursor-pointer" />
      </svg>

      <div className="flex gap-2">
        <button
          onClick={handleMiss}
          disabled={disabled}
          className="min-h-11 min-w-11 px-4 py-2 bg-slate text-chalk rounded hover:opacity-80"
        >
          MISS
        </button>
      </div>
    </div>
  );
}

function calculatePoints(sector: number, ring: string): number {
  const ringValues = { S: 1, D: 2, T: 3, OB: 1, IB: 2 };
  const ringMultiplier = ringValues[ring as keyof typeof ringValues] || 1;
  return sector * ringMultiplier;
}
