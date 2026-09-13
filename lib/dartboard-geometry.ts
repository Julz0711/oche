export const CENTER = 200;

/** Scaled down from the board's previous full-viewBox size (boardEdge was 190) to open a real
 *  margin outside the board for the sector-number labels, which used to sit on top of the
 *  double ring itself. All radii keep the same proportions to each other, just smaller overall. */
export const RADIUS = {
  boardEdge: 165,
  doubleInner: 139,
  outerSingleInner: 100,
  trebleInner: 80,
  innerSingleInner: 22,
};

/** A real dartboard's segment order, clockwise starting from the top (12 o'clock). */
export const BOARD_ORDER = [20, 1, 18, 4, 13, 6, 10, 15, 2, 17, 3, 19, 7, 16, 8, 11, 14, 9, 12, 5];

/** Trig is not required to be bit-identical between JavaScript engines, and Node's and the
 *  browser's disagree in the last digit or two — `125.0915675429748` server-side against
 *  `125.09156754297479` in the browser. React compares the rendered strings, finds them
 *  different, and reports a hydration mismatch for the whole board, at which point it stops
 *  patching that subtree. Three decimals is far finer than a pixel on a 400-unit viewBox and
 *  makes both engines produce the same string. */
function round(value: number): number {
  return Math.round(value * 1000) / 1000;
}

/** Builds an SVG path for one non-overlapping annular wedge (a ring "slice"): the actual shape of one dartboard scoring band for one segment. */
export function annularWedgePath(innerRadius: number, outerRadius: number, startAngle: number, endAngle: number): string {
  const point = (r: number, angle: number) => ({
    x: round(CENTER + r * Math.cos(angle)),
    y: round(CENTER + r * Math.sin(angle)),
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

/** The angular span (radians) for the segment at BOARD_ORDER index i, matching a real board's clockwise layout starting from the top. */
export function segmentAngles(index: number): { startAngle: number; endAngle: number; midAngle: number } {
  const midAngle = (index * 18 - 90) * (Math.PI / 180);
  return {
    startAngle: midAngle - 9 * (Math.PI / 180),
    endAngle: midAngle + 9 * (Math.PI / 180),
    midAngle,
  };
}
