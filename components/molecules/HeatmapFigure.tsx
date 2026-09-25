'use client';
import { useState, type ReactNode } from 'react';
import { HeatmapBoard } from '@/components/organisms/HeatmapBoard';


/** Splits a heatmap key ("T20", "OB25", "M0") into its ring and number. */
export function parseRegion(key: string): { ring: 'S' | 'D' | 'T' | 'OB' | 'IB' | 'M'; number: number } | null {
  const match = /^(IB|OB|[SDTM])(\d+)$/.exec(key);
  if (!match) return null;
  return { ring: match[1] as 'S' | 'D' | 'T' | 'OB' | 'IB' | 'M', number: Number(match[2]) };
}

/** What one dart in this region is worth. Needed for "score contribution", which is the
 *  number players actually care about — 30 darts in the 1s is a busy board and a bad night. */
export function regionScore(key: string): number {
  const parsed = parseRegion(key);
  if (!parsed) return 0;
  switch (parsed.ring) {
    case 'S': return parsed.number;
    case 'D': return parsed.number * 2;
    case 'T': return parsed.number * 3;
    case 'OB': return 25;
    case 'IB': return 50;
    case 'M': return 0;
  }
}

export function regionName(key: string): string {
  const parsed = parseRegion(key);
  if (!parsed) return key;
  if (parsed.ring === 'OB') return 'Outer bull';
  if (parsed.ring === 'IB') return 'Inner bull';
  if (parsed.ring === 'M') return 'Miss';
  return `${{ S: 'Single', D: 'Double', T: 'Treble' }[parsed.ring]} ${parsed.number}`;
}

export type Ring = 'S' | 'D' | 'T' | 'OB' | 'IB' | 'M';

export interface HeatmapSummary {
  darts: number;
  misses: number;
  topRegion: { key: string; count: number } | null;
  topNumber: { number: number; count: number } | null;
  topDouble: { key: string; count: number } | null;
  /** Darts per ring. What a board filtered to one kind of region can say about itself that
   *  the unfiltered board cannot. */
  byRing: Record<Ring, number>;
  totalScore: number;
}

/**
 * Everything the board itself can't say.
 *
 * Derived rather than stored, so the callouts and the screen-reader summary always describe
 * the same data the board just painted — the audit was explicit that this text must be
 * computed from real values, never written by hand.
 */
export function summarizeHeatmap(heatmap: Record<string, number>): HeatmapSummary {
  let darts = 0;
  let misses = 0;
  let totalScore = 0;
  let topRegion: { key: string; count: number } | null = null;
  let topDouble: { key: string; count: number } | null = null;
  const byNumber = new Map<number, number>();
  const byRing: Record<Ring, number> = { S: 0, D: 0, T: 0, OB: 0, IB: 0, M: 0 };

  for (const [key, count] of Object.entries(heatmap)) {
    if (!count) continue;
    const parsed = parseRegion(key);
    if (!parsed) continue;
    darts += count;
    byRing[parsed.ring] += count;
    if (parsed.ring === 'M') {
      misses += count;
      continue;
    }
    totalScore += regionScore(key) * count;
    if (!topRegion || count > topRegion.count) topRegion = { key, count };
    if (parsed.ring === 'D' && (!topDouble || count > topDouble.count)) topDouble = { key, count };
    byNumber.set(parsed.number, (byNumber.get(parsed.number) ?? 0) + count);
  }

  let topNumber: { number: number; count: number } | null = null;
  for (const [number, count] of byNumber) {
    if (!topNumber || count > topNumber.count) topNumber = { number, count };
  }
  return { darts, misses, topRegion, topNumber, topDouble, byRing, totalScore };
}

/** The sentence a screen reader hears instead of the board. */
export function heatmapDescription(title: string, summary: HeatmapSummary): string {
  if (summary.darts === 0) return `${title}: no darts recorded.`;
  const parts = [`${title}: ${summary.darts} darts recorded.`];
  if (summary.topRegion) parts.push(`Most-hit region: ${regionName(summary.topRegion.key)}, ${summary.topRegion.count} hits.`);
  if (summary.topNumber) parts.push(`Most-hit number: ${summary.topNumber.number}, ${summary.topNumber.count} hits across all rings.`);
  if (summary.topDouble) parts.push(`Strongest double: ${regionName(summary.topDouble.key)}, ${summary.topDouble.count} hits.`);
  if (summary.misses) parts.push(`${Math.round((summary.misses / summary.darts) * 100)}% of darts missed the board.`);
  return parts.join(' ');
}

/** Headline numbers for an unfiltered board: where the darts cluster, and how many missed. */
function defaultCallouts(summary: HeatmapSummary): { label: string; value: ReactNode }[] {
  const out: { label: string; value: ReactNode }[] = [];
  if (summary.topNumber) out.push({ label: 'Favourite number', value: summary.topNumber.number });
  if (summary.topDouble) out.push({ label: 'Strongest double', value: regionName(summary.topDouble.key).replace('Double ', 'D') });
  out.push({ label: 'Off the board', value: `${Math.round((summary.misses / summary.darts) * 100)}%` });
  return out;
}

/**
 * A dartboard heat map, plus the things that make one readable: a key for what the colours
 * mean, two or three plain-language callouts above it, tap-to-inspect for any region, and a
 * full breakdown in text.
 *
 * On its own the board was a pretty picture with no legend and no interpretation — the
 * audit's point being that a spatial chart is only insight if the reader can tell what
 * "hot" is relative to and what a given wedge actually contains.
 */
export function HeatmapFigure({
  title,
  caption,
  heatmap,
  callouts,
}: {
  title: string;
  caption: string;
  heatmap: Record<string, number>;
  /** Overrides the default headline numbers. A board that was filtered before it got here
   *  needs its own: the defaults below describe an unfiltered board, and on a filtered one
   *  they end up restating the filter (a doubles-only board always misses 0% of its darts)
   *  or repeating a figure the unfiltered board already showed. Pass `summarizeHeatmap` output
   *  to build them. */
  callouts?: readonly { label: string; value: ReactNode }[];
}) {
  const [selected, setSelected] = useState<string | null>(null);
  const summary = summarizeHeatmap(heatmap);
  const description = heatmapDescription(title, summary);

  const rows = Object.entries(heatmap)
    .filter(([key, count]) => count > 0 && parseRegion(key)?.ring !== 'M')
    .sort((a, b) => b[1] - a[1]);

  const selectedCount = selected ? (heatmap[selected] ?? 0) : 0;
  const share = summary.darts ? (selectedCount / summary.darts) * 100 : 0;

  return (
    <figure className="stats-heatmap-item">
      <div className="stats-heatmap-head">
        <h4>{title}</h4>
        <p>{caption}</p>
      </div>

      {summary.darts > 0 && (
        <dl className="chart-callouts">
          {(callouts ?? defaultCallouts(summary)).map((callout) => (
            <div className="chart-callout" key={callout.label}>
              <dt>{callout.label}</dt>
              <dd>{callout.value}</dd>
            </div>
          ))}
        </dl>
      )}

      {/* Hidden from assistive tech because the sr-only description below carries the same
          information in a form a screen reader can actually use. */}
      <HeatmapBoard
        heatmap={heatmap}
        decorative
        onSelect={(key) => setSelected(key === selected ? null : key)}
        selected={selected}
      />

      {/* The board is described in text either way; sighted users get the same facts from the
          callouts and this readout, so the colour is never the only carrier of meaning. */}
      <p className="sr-only">{description}</p>

      <p className="chart-readout" aria-live="polite">
        {selected ? (
          <>
            <strong>{regionName(selected)}</strong> · {selectedCount} {selectedCount === 1 ? 'hit' : 'hits'} ·{' '}
            {share.toFixed(1)}% of darts · {selectedCount * regionScore(selected)} pts
          </>
        ) : (
          'Select a region of the board for its detail.'
        )}
      </p>

      <div className="chart-legend">
        <span className="chart-legend-scale">
          <span>Fewer hits</span>
          <span className="chart-legend-bar" aria-hidden="true" />
          <span>More hits</span>
        </span>
        <span>Brightest = {Math.max(0, ...rows.map(([, count]) => count))} hits</span>
      </div>

      {rows.length > 0 && (
        <details className="chart-table">
          {/* A <details> rather than a TextButton: the summary element is already the
              disclosure control, and nesting a real button inside it would give the row two
              overlapping activation targets. */}
          <summary>View as a list</summary>
          <table>
            <caption className="sr-only">{title} — every region hit, most hits first</caption>
            <thead>
              <tr>
                <th scope="col">Region</th>
                <th scope="col">Hits</th>
                <th scope="col">Share</th>
                <th scope="col">Points</th>
              </tr>
            </thead>
            <tbody>
              {rows.map(([key, count]) => (
                <tr key={key}>
                  <th scope="row">{regionName(key)}</th>
                  <td>{count}</td>
                  <td>{summary.darts ? ((count / summary.darts) * 100).toFixed(1) : '0.0'}%</td>
                  <td>{count * regionScore(key)}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </details>
      )}
    </figure>
  );
}
