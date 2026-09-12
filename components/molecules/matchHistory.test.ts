import { describe, it, expect } from 'vitest';
import { groupMatchesByDay } from './MatchHistoryRow';

const at = (iso: string) => ({ completedAt: iso, id: iso });

describe('groupMatchesByDay', () => {
  const now = new Date('2026-09-12T18:00:00');

  it('labels the current day "Today"', () => {
    const groups = groupMatchesByDay([at('2026-09-12T09:30:00')], now);
    expect(groups.map(group => group.label)).toEqual(['Today']);
  });

  it('labels the previous day "Yesterday"', () => {
    const groups = groupMatchesByDay([at('2026-09-11T23:59:00')], now);
    expect(groups.map(group => group.label)).toEqual(['Yesterday']);
  });

  it('keeps the incoming order of both groups and their matches', () => {
    const groups = groupMatchesByDay(
      [at('2026-09-12T18:00:00'), at('2026-09-12T08:00:00'), at('2026-09-10T12:00:00')],
      now
    );
    expect(groups).toHaveLength(2);
    expect(groups[0].label).toBe('Today');
    expect(groups[0].matches.map(match => match.id)).toEqual(['2026-09-12T18:00:00', '2026-09-12T08:00:00']);
    expect(groups[1].matches.map(match => match.id)).toEqual(['2026-09-10T12:00:00']);
  });

  it('groups two matches from the same older day together under one heading', () => {
    const groups = groupMatchesByDay([at('2026-09-07T10:00:00'), at('2026-09-07T20:00:00')], now);
    expect(groups).toHaveLength(1);
    expect(groups[0].matches).toHaveLength(2);
    expect(groups[0].label).not.toBe('Today');
    expect(groups[0].label).not.toBe('Yesterday');
  });

  it('names the year only once a match is from a different one', () => {
    const [thisYear] = groupMatchesByDay([at('2026-03-02T10:00:00')], now);
    const [lastYear] = groupMatchesByDay([at('2025-03-02T10:00:00')], now);
    expect(thisYear.label).not.toMatch(/2026/);
    expect(lastYear.label).toMatch(/2025/);
  });

  it('returns nothing for an empty history', () => {
    expect(groupMatchesByDay([], now)).toEqual([]);
  });
});
