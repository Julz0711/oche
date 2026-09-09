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
