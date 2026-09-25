// components/organisms/HeatmapBoard.tsx
import React from 'react';
import { CENTER, RADIUS, BOARD_ORDER, annularWedgePath, segmentAngles } from '@/lib/dartboard-geometry';

interface HeatmapBoardProps {
  /** Hit-frequency map (key: `${ring}${sector}`, e.g. "D20", "T19", "IB25"). Defaults to empty — a neutral board with no heat anywhere. */
  heatmap?: Record<string, number>;
  /** Names the board for screen readers. */
  label?: string;
  /** Hides the board from assistive tech. Only for callers that render the same information
   *  in text right beside it (see HeatmapFigure) — otherwise the board's own number labels
   *  are the only thing a screen reader has to go on, and hiding them loses information. */
  decorative?: boolean;
  /** Makes each region tappable, reporting the region key ("T20", "IB25", ...). Regions
   *  become real buttons in the accessibility tree only when this is supplied. */
  onSelect?: (key: string) => void;
  /** The currently inspected region key, outlined on the board. */
  selected?: string | null;
}

/** Structural shades for the board. Mixed from `--sisal` rather than `--chalk` so the board
 *  sits in the club's warm palette instead of reading as neutral stock-chart grey, while
 *  staying desaturated enough that the heat overlay is the only thing carrying real hue. */
const GREY = {
  ringBand: 'color-mix(in srgb, var(--sisal) 34%, var(--oche))', // double + treble rings
  singleBand: 'color-mix(in srgb, var(--sisal) 13%, var(--oche))', // both single bands
  outerBull: 'color-mix(in srgb, var(--sisal) 42%, var(--oche))',
  innerBull: 'color-mix(in srgb, var(--sisal) 58%, var(--oche))',
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

export function HeatmapBoard({ heatmap = {}, label, decorative = false, onSelect, selected = null }: HeatmapBoardProps) {
  const overlay = (ratio: number) => ({ fill: heatColor(ratio), fillOpacity: heatOpacity(ratio) });
  const singleFill = () => GREY.singleBand;
  const ringFill = () => GREY.ringBand;
  // Misses ("M0") are never rendered, so they must not count toward the normalization ceiling —
  // otherwise a heavy-miss match caps every hit well below red.
  const maxHeat = Math.max(1, ...Object.entries(heatmap).filter(([key]) => !key.startsWith('M')).map(([, v]) => v));
  const ratioOf = (key: string) => (heatmap[key] ?? 0) / maxHeat;

  // Every heat overlay is wrapped in this. Without `onSelect` it stays exactly what it was —
  // an inert painted path — so the non-interactive uses (a live match's board) pay nothing for
  // the inspectable variant on the statistics screen.
  //
  // When the board is `decorative`, the regions are pointer conveniences only: no role, no tab
  // stop, nothing in the accessibility tree. A focusable control inside an aria-hidden subtree
  // is a trap — focus lands somewhere a screen reader cannot describe — and twenty focusable
  // wedges per board would be a miserable tab order even if it weren't. The accessible
  // equivalent is the text summary and the full breakdown table the caller renders instead.
  const region = (reactKey: string, key: string, name: string, node: React.ReactElement<{ style?: React.CSSProperties }>) => {
    if (!onSelect) return node;
    const select = () => onSelect(key);
    return (
      <g
        key={reactKey}
        className="heatmap-region"
        style={{ cursor: 'pointer' }}
        onClick={select}
        {...(decorative
          ? {}
          : {
              role: 'button' as const,
              tabIndex: 0,
              'aria-label': `${name}: ${heatmap[key] ?? 0} hits`,
              'aria-pressed': selected === key,
              onKeyDown: (event: React.KeyboardEvent) => {
                if (event.key !== 'Enter' && event.key !== ' ') return;
                event.preventDefault();
                select();
              },
            })}
      >
        {node}
        {selected === key && React.cloneElement(node, { style: { fill: 'none', stroke: 'var(--chalk)', strokeWidth: 3 } })}
      </g>
    );
  };

  return (
    <svg
      viewBox="0 0 400 400"
      className="w-full max-w-md aspect-square"
      {...(label ? { role: 'img' as const, 'aria-label': label } : decorative ? { 'aria-hidden': true as const } : {})}
    >
      <circle cx={CENTER} cy={CENTER} r={RADIUS.boardEdge} fill="var(--oche)" stroke="var(--club-edge)" strokeWidth="1" />

      {BOARD_ORDER.map((segment, i) => {
        const { startAngle, endAngle, midAngle } = segmentAngles(i);
        // Outside the board's outer edge (not on the double ring, where it used to compete
        // with the heat overlay's color for legibility).
        // Rounded for the same reason the wedge paths are — see lib/dartboard-geometry.ts.
        const labelPoint = {
          x: Math.round((CENTER + (RADIUS.boardEdge + 18) * Math.cos(midAngle)) * 1000) / 1000,
          y: Math.round((CENTER + (RADIUS.boardEdge + 18) * Math.sin(midAngle)) * 1000) / 1000,
        };

        const doubleRatio = ratioOf(`D${segment}`);
        const outerSingleRatio = ratioOf(`S${segment}`);
        const trebleRatio = ratioOf(`T${segment}`);
        const innerSingleRatio = ratioOf(`S${segment}`);

        return (
          <g key={segment}>
            <path d={annularWedgePath(RADIUS.doubleInner, RADIUS.boardEdge, startAngle, endAngle)} fill={ringFill()} stroke="var(--oche)" strokeWidth="2" />
            {region(`D${segment}`, `D${segment}`, `Double ${segment}`,
              <path
                d={annularWedgePath(RADIUS.doubleInner, RADIUS.boardEdge, startAngle, endAngle)}
                style={overlay(doubleRatio)}
              />)}

            <path d={annularWedgePath(RADIUS.outerSingleInner, RADIUS.doubleInner, startAngle, endAngle)} fill={singleFill()} stroke="var(--oche)" strokeWidth="2" />
            {region(`S${segment}-outer`, `S${segment}`, `Single ${segment}`,
              <path
                d={annularWedgePath(RADIUS.outerSingleInner, RADIUS.doubleInner, startAngle, endAngle)}
                style={overlay(outerSingleRatio)}
              />)}

            <path d={annularWedgePath(RADIUS.trebleInner, RADIUS.outerSingleInner, startAngle, endAngle)} fill={ringFill()} stroke="var(--oche)" strokeWidth="2" />
            {region(`T${segment}`, `T${segment}`, `Treble ${segment}`,
              <path
                d={annularWedgePath(RADIUS.trebleInner, RADIUS.outerSingleInner, startAngle, endAngle)}
                style={overlay(trebleRatio)}
              />)}

            <path d={annularWedgePath(RADIUS.innerSingleInner, RADIUS.trebleInner, startAngle, endAngle)} fill={singleFill()} stroke="var(--oche)" strokeWidth="2" />
            {region(`S${segment}-inner`, `S${segment}`, `Single ${segment}`,
              <path
                d={annularWedgePath(RADIUS.innerSingleInner, RADIUS.trebleInner, startAngle, endAngle)}
                style={overlay(innerSingleRatio)}
              />)}

            <text x={labelPoint.x} y={labelPoint.y} textAnchor="middle" className="text-xs fill-sisal" dy="0.3em">
              {segment}
            </text>
          </g>
        );
      })}

      <circle cx={CENTER} cy={CENTER} r={RADIUS.innerSingleInner} fill={GREY.outerBull} stroke="var(--oche)" strokeWidth="2" />
      {region('OB25', 'OB25', 'Outer bull',
        <circle
          cx={CENTER}
          cy={CENTER}
          r={RADIUS.innerSingleInner}
          style={overlay(ratioOf('OB25'))}
        />)}

      <circle cx={CENTER} cy={CENTER} r={RADIUS.innerSingleInner * 0.4} fill={GREY.innerBull} stroke="var(--oche)" strokeWidth="2" />
      {region('IB25', 'IB25', 'Inner bull',
        <circle
          cx={CENTER}
          cy={CENTER}
          r={RADIUS.innerSingleInner * 0.4}
          style={overlay(ratioOf('IB25'))}
        />)}
    </svg>
  );
}
