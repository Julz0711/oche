import React from 'react';
import { CENTER, RADIUS, BOARD_ORDER, segmentAngles, annularWedgePath } from '@/lib/dartboard-geometry';

/** Motifs implemented so far. Plan 2 adds 'spider' | 'flights' | 'reticle' for the match,
 *  stats and lobby surfaces; the switch below is exhaustive, so adding a name without
 *  drawing it is a type error rather than a blank render. */
export type MotifName = 'board' | 'scoresheet' | 'echo';

interface BoardMotifProps {
  name: MotifName;
  /** Positioning, sizing, colour and opacity all come from the parent. */
  className?: string;
  /** Used by consumers to set the resting opacity from the --motif-* tokens. */
  style?: React.CSSProperties;
}

const VIEWBOX = `0 0 ${CENTER * 2} ${CENTER * 2}`;
/** Matches how DartboardInput draws the inner bull, so the decorative board and the
 *  interactive board stay in proportion. */
const INNER_BULL = RADIUS.innerSingleInner * 0.4;

function polar(radius: number, angle: number) {
  return { x: CENTER + radius * Math.cos(angle), y: CENTER + radius * Math.sin(angle) };
}

/** The full board: rings, all 20 wires, with T20 lit in the treble band and D20 faint at
 *  the rim. Every angle and radius is derived from lib/dartboard-geometry so this can never
 *  drift out of alignment with the real board (a hand-authored version put a wire up the
 *  12 o'clock centreline, which made the lit segment straddle it). */
function Board() {
  // BOARD_ORDER[0] is 20, and segmentAngles(0) centres it on 12 o'clock.
  const twenty = segmentAngles(0);
  const wires = BOARD_ORDER.map((_, index) => {
    const { startAngle } = segmentAngles(index);
    const inner = polar(RADIUS.innerSingleInner, startAngle);
    const outer = polar(RADIUS.boardEdge, startAngle);
    return { key: index, x1: inner.x, y1: inner.y, x2: outer.x, y2: outer.y };
  });

  return (
    <>
      <g stroke="currentColor" strokeWidth={2.2} fill="none">
        <circle cx={CENTER} cy={CENTER} r={RADIUS.boardEdge} />
        <circle cx={CENTER} cy={CENTER} r={RADIUS.doubleInner} />
        <circle cx={CENTER} cy={CENTER} r={RADIUS.outerSingleInner} />
        <circle cx={CENTER} cy={CENTER} r={RADIUS.trebleInner} />
        <circle cx={CENTER} cy={CENTER} r={RADIUS.innerSingleInner} />
      </g>
      <g stroke="currentColor" strokeWidth={1.7}>
        {wires.map((w) => (
          <line key={w.key} x1={w.x1} y1={w.y1} x2={w.x2} y2={w.y2} />
        ))}
      </g>
      <circle cx={CENTER} cy={CENTER} r={INNER_BULL} fill="currentColor" />
      <path
        d={annularWedgePath(RADIUS.trebleInner, RADIUS.outerSingleInner, twenty.startAngle, twenty.endAngle)}
        fill="currentColor"
      />
      <path
        d={annularWedgePath(RADIUS.doubleInner, RADIUS.boardEdge, twenty.startAngle, twenty.endAngle)}
        fill="currentColor"
        opacity={0.45}
      />
    </>
  );
}

/** How Cricket is actually scored: tally rows, closed numbers struck through, points bars. */
function Scoresheet() {
  const rows = [0, 1, 2, 3, 4, 5];
  const marks = [2, 2, 2, 1, 2, 0];
  const bars = [44, 44, 28, 44, 16, 44];
  return (
    <g stroke="currentColor" fill="none">
      <g strokeWidth={3.2}>
        {rows.map((r) => (
          <line key={`t${r}`} x1={60} y1={68 + r * 52} x2={172} y2={68 + r * 52} />
        ))}
      </g>
      <g strokeWidth={4.8}>
        {rows.map((r) =>
          marks[r] === 0 ? null : (
            <g key={`x${r}`}>
              <line x1={208} y1={52 + r * 52} x2={240} y2={84 + r * 52} />
              {marks[r] === 2 && <line x1={240} y1={52 + r * 52} x2={208} y2={84 + r * 52} />}
            </g>
          )
        )}
      </g>
      <line x1={280} y1={40} x2={280} y2={328} strokeWidth={2.8} />
      <g strokeWidth={4.4}>
        {rows.map((r) => (
          <line key={`b${r}`} x1={304} y1={68 + r * 52} x2={304 + bars[r]} y2={68 + r * 52} />
        ))}
      </g>
    </g>
  );
}

/** Two bullseyes, one solid and one dashed — Copycat is the echo. */
function Echo() {
  const rings = [32, 64, 96, 128];
  return (
    <g stroke="currentColor" strokeWidth={3} fill="none">
      {rings.map((r) => (
        <circle key={`a${r}`} cx={148} cy={CENTER} r={r} />
      ))}
      <circle cx={148} cy={CENTER} r={10} fill="currentColor" />
      {rings.map((r) => (
        <circle key={`b${r}`} cx={292} cy={CENTER} r={r} strokeDasharray="8 8" />
      ))}
      <circle cx={292} cy={CENTER} r={10} fill="currentColor" />
    </g>
  );
}

/** A darts-derived background graphic. Drawn in currentColor with crisp edges — never
 *  masked or faded; it is cropped by whatever surface it sits inside. */
export function BoardMotif({ name, className = '', style }: BoardMotifProps) {
  return (
    <svg
      viewBox={VIEWBOX}
      aria-hidden="true"
      focusable="false"
      /* `board-motif` is the hook the global hover rule targets. It must stay on every
         motif — targeting a generic selector like svg[aria-hidden] instead would also
         catch every lucide icon inside a hovered card. */
      className={`board-motif ${className}`}
      style={style}
    >
      {name === 'board' && <Board />}
      {name === 'scoresheet' && <Scoresheet />}
      {name === 'echo' && <Echo />}
    </svg>
  );
}
