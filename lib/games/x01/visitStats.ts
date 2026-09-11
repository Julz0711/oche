/** Scoring bands use credited visit scores, so busts and pre-double-in darts
 * never inflate high visits. Bands are exclusive to avoid double-counting. */
export function scoringVisitStats(visits: readonly { scoreBefore?: number; scoreAfter?: number; busted?: boolean }[]) {
  let bestVisit = 0;
  let visits100 = 0;
  let visits140 = 0;
  let visits180 = 0;
  let busts = 0;
  for (const visit of visits) {
    if (visit.busted) { busts++; continue; }
    if (visit.scoreBefore === undefined || visit.scoreAfter === undefined) continue;
    const score = Math.max(0, visit.scoreBefore - visit.scoreAfter);
    bestVisit = Math.max(bestVisit, score);
    if (score === 180) visits180++;
    else if (score >= 140) visits140++;
    else if (score >= 100) visits100++;
  }
  return { bestVisit, visits100, visits140, visits180, busts };
}

interface DoubleTrebleThrow {
  ring: string;
  points: number;
  order: number;
}

/** A dart is a "double attempt" if it's thrown while the score remaining before it is within
 * one-dart finishing range of a double (<=50) under a checkout rule that requires one; every
 * other scoring dart is treated as a "treble attempt" (the default scoring target). This can't
 * know a player's actual intent, but unlike counting a hit as its own attempt (the bug this
 * replaces), it makes misses count too, so the resulting rate is meaningful instead of always
 * 100%. Under 'straight' checkout there's no double requirement, so every dart is a treble
 * attempt. */
export function doublesAndTreblesStats(
  visits: readonly { scoreBefore?: number; throws: readonly DoubleTrebleThrow[] }[],
  checkOut: 'double' | 'straight' | 'master'
) {
  let doublesHit = 0;
  let doublesAttempts = 0;
  let treblesHit = 0;
  let treblesAttempts = 0;

  for (const visit of visits) {
    const throwsInOrder = [...visit.throws].sort((a, b) => a.order - b.order);
    let remaining = visit.scoreBefore;
    for (const t of throwsInOrder) {
      const onFinish = checkOut !== 'straight' && remaining !== undefined && remaining <= 50;
      if (onFinish) {
        doublesAttempts++;
        if (t.ring === 'D' || t.ring === 'IB') doublesHit++;
      } else {
        treblesAttempts++;
        if (t.ring === 'T') treblesHit++;
      }
      if (remaining !== undefined) remaining -= t.points;
    }
  }

  return { doublesHit, doublesAttempts, treblesHit, treblesAttempts };
}
