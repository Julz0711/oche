// components/organisms/HeatmapBoard.tsx
import { CENTER, RADIUS, BOARD_ORDER, annularWedgePath, segmentAngles } from '@/lib/dartboard-geometry';

interface HeatmapBoardProps {
  /** Hit-frequency map (key: `${ring}${sector}`, e.g. "D20", "T19", "IB25"). Defaults to empty — a neutral board with no heat anywhere. */
  heatmap?: Record<string, number>;
}

/** Structural grey shades, derived from the existing chalk/oche tokens via color-mix — the board's shape stays legible without competing with the heat overlay for attention. */
const GREY = {
  ringBand: 'color-mix(in srgb, var(--chalk) 30%, var(--oche))', // double + treble rings
  singleBand: 'color-mix(in srgb, var(--chalk) 12%, var(--oche))', // both single bands
  outerBull: 'color-mix(in srgb, var(--chalk) 40%, var(--oche))',
  innerBull: 'color-mix(in srgb, var(--chalk) 55%, var(--oche))',
};

/** Interpolates a 3-stop blue -> yellow -> red heat color for a 0..1 density ratio. A naive 2-color blue-to-red blend produces a muddy purple in the middle, so this mixes blue->yellow for the first half and yellow->red for the second. */
function heatColor(ratio: number): string {
  if (ratio <= 0.5) {
    const pct = ratio * 200;
    return `color-mix(in srgb, var(--heat-mid) ${pct}%, var(--heat-cold))`;
  }
  const pct = (ratio - 0.5) * 200;
  return `color-mix(in srgb, var(--heat-hot) ${pct}%, var(--heat-mid))`;
}

/** Unhit cells (ratio 0) show no heat overlay at all (fully transparent, letting the grey structure show through); any hit at all becomes visibly tinted, scaling up to a strong, mostly-opaque color at the current match's peak. */
function heatOpacity(ratio: number): number {
  return ratio <= 0 ? 0 : 0.35 + ratio * 0.55;
}

export function HeatmapBoard({ heatmap = {} }: HeatmapBoardProps) {
  // Misses ("M0") are never rendered, so they must not count toward the normalization ceiling —
  // otherwise a heavy-miss match caps every hit well below red.
  const maxHeat = Math.max(1, ...Object.entries(heatmap).filter(([key]) => !key.startsWith('M')).map(([, v]) => v));
  const ratioOf = (key: string) => (heatmap[key] ?? 0) / maxHeat;

  return (
    <svg viewBox="0 0 400 400" className="w-full max-w-md aspect-square">
      <circle cx={CENTER} cy={CENTER} r={RADIUS.boardEdge} fill="var(--oche)" stroke="var(--chalk)" strokeWidth="1" />

      {BOARD_ORDER.map((segment, i) => {
        const { startAngle, endAngle, midAngle } = segmentAngles(i);
        const labelPoint = {
          x: CENTER + ((RADIUS.doubleInner + RADIUS.boardEdge) / 2) * Math.cos(midAngle),
          y: CENTER + ((RADIUS.doubleInner + RADIUS.boardEdge) / 2) * Math.sin(midAngle),
        };

        const doubleRatio = ratioOf(`D${segment}`);
        const outerSingleRatio = ratioOf(`S${segment}`);
        const trebleRatio = ratioOf(`T${segment}`);
        const innerSingleRatio = ratioOf(`S${segment}`);

        return (
          <g key={segment}>
            <path d={annularWedgePath(RADIUS.doubleInner, RADIUS.boardEdge, startAngle, endAngle)} fill={GREY.ringBand} stroke="var(--oche)" strokeWidth="2" />
            <path
              d={annularWedgePath(RADIUS.doubleInner, RADIUS.boardEdge, startAngle, endAngle)}
              style={{ fill: heatColor(doubleRatio), fillOpacity: heatOpacity(doubleRatio) }}
            />

            <path d={annularWedgePath(RADIUS.outerSingleInner, RADIUS.doubleInner, startAngle, endAngle)} fill={GREY.singleBand} stroke="var(--oche)" strokeWidth="2" />
            <path
              d={annularWedgePath(RADIUS.outerSingleInner, RADIUS.doubleInner, startAngle, endAngle)}
              style={{ fill: heatColor(outerSingleRatio), fillOpacity: heatOpacity(outerSingleRatio) }}
            />

            <path d={annularWedgePath(RADIUS.trebleInner, RADIUS.outerSingleInner, startAngle, endAngle)} fill={GREY.ringBand} stroke="var(--oche)" strokeWidth="2" />
            <path
              d={annularWedgePath(RADIUS.trebleInner, RADIUS.outerSingleInner, startAngle, endAngle)}
              style={{ fill: heatColor(trebleRatio), fillOpacity: heatOpacity(trebleRatio) }}
            />

            <path d={annularWedgePath(RADIUS.innerSingleInner, RADIUS.trebleInner, startAngle, endAngle)} fill={GREY.singleBand} stroke="var(--oche)" strokeWidth="2" />
            <path
              d={annularWedgePath(RADIUS.innerSingleInner, RADIUS.trebleInner, startAngle, endAngle)}
              style={{ fill: heatColor(innerSingleRatio), fillOpacity: heatOpacity(innerSingleRatio) }}
            />

            <text x={labelPoint.x} y={labelPoint.y} textAnchor="middle" className="text-xs fill-chalk" dy="0.3em">
              {segment}
            </text>
          </g>
        );
      })}

      <circle cx={CENTER} cy={CENTER} r={RADIUS.innerSingleInner} fill={GREY.outerBull} stroke="var(--oche)" strokeWidth="2" />
      <circle
        cx={CENTER}
        cy={CENTER}
        r={RADIUS.innerSingleInner}
        style={{ fill: heatColor(ratioOf('OB25')), fillOpacity: heatOpacity(ratioOf('OB25')) }}
      />

      <circle cx={CENTER} cy={CENTER} r={RADIUS.innerSingleInner * 0.4} fill={GREY.innerBull} stroke="var(--oche)" strokeWidth="2" />
      <circle
        cx={CENTER}
        cy={CENTER}
        r={RADIUS.innerSingleInner * 0.4}
        style={{ fill: heatColor(ratioOf('IB25')), fillOpacity: heatOpacity(ratioOf('IB25')) }}
      />
    </svg>
  );
}
