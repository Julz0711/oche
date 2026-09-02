export const CENTER = 200;

export const RADIUS = {
  boardEdge: 190,
  doubleInner: 160,
  outerSingleInner: 115,
  trebleInner: 92,
  innerSingleInner: 25,
};

/** A real dartboard's segment order, clockwise starting from the top (12 o'clock). */
export const BOARD_ORDER = [20, 1, 18, 4, 13, 6, 10, 15, 2, 17, 3, 19, 7, 16, 8, 11, 14, 9, 12, 5];

/** Builds an SVG path for one non-overlapping annular wedge (a ring "slice"): the actual shape of one dartboard scoring band for one segment. */
export function annularWedgePath(innerRadius: number, outerRadius: number, startAngle: number, endAngle: number): string {
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

/** The angular span (radians) for the segment at BOARD_ORDER index i, matching a real board's clockwise layout starting from the top. */
export function segmentAngles(index: number): { startAngle: number; endAngle: number; midAngle: number } {
  const midAngle = (index * 18 - 90) * (Math.PI / 180);
  return {
    startAngle: midAngle - 9 * (Math.PI / 180),
    endAngle: midAngle + 9 * (Math.PI / 180),
    midAngle,
  };
}
