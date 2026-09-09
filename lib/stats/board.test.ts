import { describe, expect, it } from 'vitest';
import { periodStarts } from './board';
describe('UTC statistics periods', () => {
  it('starts the week on Monday across month and year boundaries', () => {
    expect(periodStarts(new Date('2027-01-01T19:00:00Z'))).toEqual({ day: new Date('2027-01-01T00:00:00Z'), week: new Date('2026-12-28T00:00:00Z'), month: new Date('2027-01-01T00:00:00Z') });
  });
  it('keeps Sunday in the preceding week and advances at Monday midnight', () => {
    expect(periodStarts(new Date('2026-09-06T23:59:59Z')).week.toISOString()).toBe('2026-08-31T00:00:00.000Z');
    expect(periodStarts(new Date('2026-09-07T00:00:00Z')).week.toISOString()).toBe('2026-09-07T00:00:00.000Z');
  });
});
