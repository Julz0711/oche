import { describe, it, expect } from 'vitest';
import { heatmapDescription, parseRegion, regionName, regionScore, summarizeHeatmap } from './HeatmapFigure';

describe('parseRegion', () => {
  it('reads each ring prefix, longest first', () => {
    expect(parseRegion('S20')).toEqual({ ring: 'S', number: 20 });
    expect(parseRegion('T19')).toEqual({ ring: 'T', number: 19 });
    expect(parseRegion('D16')).toEqual({ ring: 'D', number: 16 });
    // "IB"/"OB" must not be mistaken for a single-letter ring.
    expect(parseRegion('IB25')).toEqual({ ring: 'IB', number: 25 });
    expect(parseRegion('OB25')).toEqual({ ring: 'OB', number: 25 });
    expect(parseRegion('M0')).toEqual({ ring: 'M', number: 0 });
  });

  it('rejects anything that is not a region key', () => {
    expect(parseRegion('')).toBeNull();
    expect(parseRegion('X20')).toBeNull();
    expect(parseRegion('20')).toBeNull();
  });
});

describe('regionScore', () => {
  it('scores each ring as darts actually score', () => {
    expect(regionScore('S20')).toBe(20);
    expect(regionScore('D20')).toBe(40);
    expect(regionScore('T20')).toBe(60);
    expect(regionScore('OB25')).toBe(25);
    expect(regionScore('IB25')).toBe(50);
    expect(regionScore('M0')).toBe(0);
    expect(regionScore('nonsense')).toBe(0);
  });
});

describe('regionName', () => {
  it('spells regions out for screen readers', () => {
    expect(regionName('T19')).toBe('Treble 19');
    expect(regionName('D16')).toBe('Double 16');
    expect(regionName('S5')).toBe('Single 5');
    expect(regionName('IB25')).toBe('Inner bull');
    expect(regionName('OB25')).toBe('Outer bull');
  });
});

describe('summarizeHeatmap', () => {
  const heatmap = { T20: 10, S20: 4, D20: 3, D16: 5, S1: 2, IB25: 1, M0: 6 };

  it('counts every dart, misses included', () => {
    expect(summarizeHeatmap(heatmap).darts).toBe(31);
    expect(summarizeHeatmap(heatmap).misses).toBe(6);
  });

  it('finds the most-hit single region', () => {
    expect(summarizeHeatmap(heatmap).topRegion).toEqual({ key: 'T20', count: 10 });
  });

  it('finds the most-hit number by summing its rings', () => {
    // 20 is hit 17 times across treble, single and double; 16 only 5 times in one ring.
    expect(summarizeHeatmap(heatmap).topNumber).toEqual({ number: 20, count: 17 });
  });

  it('finds the strongest double independently of the hottest region', () => {
    expect(summarizeHeatmap(heatmap).topDouble).toEqual({ key: 'D16', count: 5 });
  });

  it('leaves misses out of the score total', () => {
    // 10*60 + 4*20 + 3*40 + 5*32 + 2*1 + 1*50
    expect(summarizeHeatmap(heatmap).totalScore).toBe(600 + 80 + 120 + 160 + 2 + 50);
  });

  it('reports an empty board as empty rather than throwing', () => {
    const summary = summarizeHeatmap({});
    expect(summary).toEqual({
      darts: 0,
      misses: 0,
      topRegion: null,
      topNumber: null,
      topDouble: null,
      byRing: { S: 0, D: 0, T: 0, OB: 0, IB: 0, M: 0 },
      totalScore: 0,
    });
    expect(heatmapDescription('All throws', summary)).toBe('All throws: no darts recorded.');
  });

  it('ignores zero-count entries', () => {
    expect(summarizeHeatmap({ T20: 0, S5: 3 }).topRegion).toEqual({ key: 'S5', count: 3 });
  });
});

describe('heatmapDescription', () => {
  it('is built from the real values, never fixed text', () => {
    const description = heatmapDescription('All throws', summarizeHeatmap({ T19: 8, D10: 2, M0: 5 }));
    expect(description).toContain('15 darts recorded');
    expect(description).toContain('Treble 19');
    expect(description).toContain('Double 10');
    expect(description).toContain('33% of darts missed the board');
  });

  it('says nothing about misses when there were none', () => {
    expect(heatmapDescription('Doubles, trebles & bulls', summarizeHeatmap({ D20: 4 }))).not.toContain('missed');
  });
});

describe('summarizeHeatmap ring totals', () => {
  it('counts darts per ring, misses included', () => {
    const { byRing } = summarizeHeatmap({ T20: 10, T19: 2, S20: 4, D20: 3, D16: 5, OB25: 7, IB25: 1, M0: 6 });
    expect(byRing).toEqual({ S: 4, D: 8, T: 12, OB: 7, IB: 1, M: 6 });
  });

  it('reports zero for rings a filtered board no longer contains', () => {
    // What the doubles/trebles/bulls board is handed: every single and every miss removed.
    const { byRing, misses } = summarizeHeatmap({ T20: 10, D16: 5, IB25: 1 });
    expect(byRing.S).toBe(0);
    expect(byRing.M).toBe(0);
    expect(misses).toBe(0);
  });
});
