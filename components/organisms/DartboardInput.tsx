// components/organisms/DartboardInput.tsx
'use client';
import { Throw } from '@/lib/types';

interface DartboardInputProps {
  onThrow: (throw_: Throw) => void;
  disabled?: boolean;
  /** How many darts have already landed in the current, still-open visit (0, 1, or 2). Used to tag the correct `order` on the next dart. Defaults to 0. */
  visitDartCount?: number;
}

const CENTER = 200;

/** Builds an SVG path for one non-overlapping annular wedge (a ring "slice"): the actual shape of one dartboard scoring band for one segment. */
function annularWedgePath(innerRadius: number, outerRadius: number, startAngle: number, endAngle: number): string {
  const point = (r: number, angle: number) => ({
    x: CENTER + r * Math.cos(angle),
    y: CENTER + r * Math.sin(angle),
  });
  const largeArc = endAngle - startAngle > Math.PI ? 1 : 0;

  const outerStart = point(outerRadius, startAngle);
  const outerEnd = point(outerRadius, endAngle);
  const innerEnd = point(innerRadius, endAngle);
  const innerStart = point(innerRadius, startAngle);

  return [
    `M ${outerStart.x} ${outerStart.y}`,
    `A ${outerRadius} ${outerRadius} 0 ${largeArc} 1 ${outerEnd.x} ${outerEnd.y}`,
    `L ${innerEnd.x} ${innerEnd.y}`,
    `A ${innerRadius} ${innerRadius} 0 ${largeArc} 0 ${innerStart.x} ${innerStart.y}`,
    'Z',
  ].join(' ');
}

// Radial bands, outer edge to center. Widened well beyond a real dartboard's proportions
// (where double/treble rings are only ~2% of the radius) so double and treble are actually
// tappable — dartboard segments are the plan's documented exception to the 44px touch-target
// rule, but "smaller than 44px" isn't the same as "a few physical pixels wide."
const RADIUS = {
  boardEdge: 190,
  doubleInner: 160,
  outerSingleInner: 115,
  trebleInner: 92,
  innerSingleInner: 25,
  outerBullInner: 12,
};

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
      <svg viewBox="0 0 400 400" className="w-80 h-80">
        <circle cx={CENTER} cy={CENTER} r={RADIUS.boardEdge} fill="var(--oche)" stroke="var(--chalk)" strokeWidth="1" />

        {segments.map((segment) => {
          const midAngle = (segment - 6) * 18 * (Math.PI / 180);
          const startAngle = midAngle - 9 * (Math.PI / 180);
          const endAngle = midAngle + 9 * (Math.PI / 180);
          const labelPoint = {
            x: CENTER + ((RADIUS.doubleInner + RADIUS.boardEdge) / 2) * Math.cos(midAngle),
            y: CENTER + ((RADIUS.doubleInner + RADIUS.boardEdge) / 2) * Math.sin(midAngle),
          };

          return (
            <g key={segment}>
              <path
                d={annularWedgePath(RADIUS.doubleInner, RADIUS.boardEdge, startAngle, endAngle)}
                fill="var(--double)"
                opacity="0.5"
                onClick={() => handleSegmentClick(segment, 'D')}
                className="cursor-pointer hover:opacity-80"
              />
              <path
                d={annularWedgePath(RADIUS.outerSingleInner, RADIUS.doubleInner, startAngle, endAngle)}
                fill="var(--slate)"
                opacity="0.5"
                onClick={() => handleSegmentClick(segment, 'S')}
                className="cursor-pointer hover:opacity-80"
              />
              <path
                d={annularWedgePath(RADIUS.trebleInner, RADIUS.outerSingleInner, startAngle, endAngle)}
                fill="var(--wire)"
                opacity="0.5"
                onClick={() => handleSegmentClick(segment, 'T')}
                className="cursor-pointer hover:opacity-80"
              />
              <path
                d={annularWedgePath(RADIUS.innerSingleInner, RADIUS.trebleInner, startAngle, endAngle)}
                fill="var(--slate)"
                opacity="0.5"
                onClick={() => handleSegmentClick(segment, 'S')}
                className="cursor-pointer hover:opacity-80"
              />
              <text x={labelPoint.x} y={labelPoint.y} textAnchor="middle" className="text-xs fill-chalk pointer-events-none" dy="0.3em">
                {segment}
              </text>
            </g>
          );
        })}

        {/* Bulls: outer bull drawn first as the larger circle, inner bull drawn on top as the
            smaller circle — so the visually and interactively innermost target (highest value,
            50pts) really is the one you hit by tapping dead center. */}
        <circle
          cx={CENTER}
          cy={CENTER}
          r={RADIUS.outerBullInner}
          fill="var(--wire)"
          onClick={() => handleSegmentClick(25, 'OB')}
          className="cursor-pointer hover:opacity-80"
        />
        <circle
          cx={CENTER}
          cy={CENTER}
          r={RADIUS.outerBullInner * 0.45}
          fill="var(--treble)"
          onClick={() => handleSegmentClick(25, 'IB')}
          className="cursor-pointer hover:opacity-80"
        />
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
