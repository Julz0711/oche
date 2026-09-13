import { describe, it, expect } from 'vitest';
import { SETTINGS_FIELDS, describeSettings, fieldValue, toSchemaInput } from './settingsForm';
import { X01SettingsSchema, X01DefaultSettings } from './x01/schema';
import { CricketSettingsSchema, CricketDefaultSettings } from './cricket/schema';
import { CopycatSettingsSchema, CopycatDefaultSettings } from './copycat/schema';

describe('toSchemaInput', () => {
  // The regression this exists for: X01's schema takes '501' and yields 501, so the value stored
  // on the match document is not something the schema will accept back.
  it('lets stored X01 settings validate against their own schema again', () => {
    const stored = X01SettingsSchema.parse({ ...X01DefaultSettings, startingScore: '501' });
    expect(stored.startingScore).toBe(501);
    expect(X01SettingsSchema.safeParse(stored).success).toBe(false);
    expect(X01SettingsSchema.safeParse(toSchemaInput('x01', stored)).success).toBe(true);
  });

  it('round-trips an edited X01 starting score', () => {
    const stored = X01SettingsSchema.parse({ ...X01DefaultSettings, startingScore: '501' });
    const edited = { ...toSchemaInput('x01', stored), startingScore: '301' };
    expect(X01SettingsSchema.parse(edited).startingScore).toBe(301);
  });

  it('leaves games with no transforming fields untouched', () => {
    expect(toSchemaInput('cricket', { firstTo: 3, scoring: 'no-points' })).toEqual({ firstTo: 3, scoring: 'no-points' });
    expect(CricketSettingsSchema.safeParse(toSchemaInput('cricket', { ...CricketDefaultSettings })).success).toBe(true);
    expect(CopycatSettingsSchema.safeParse(toSchemaInput('copycat', { ...CopycatDefaultSettings })).success).toBe(true);
  });

  it('copies rather than mutating the settings it is given', () => {
    const stored = { startingScore: 501, firstTo: 1 };
    const out = toSchemaInput('x01', stored);
    expect(stored.startingScore).toBe(501);
    expect(out.startingScore).toBe('501');
  });

  it('passes through a field the stored settings do not have', () => {
    expect(toSchemaInput('x01', { firstTo: 3 })).toEqual({ firstTo: 3 });
  });
});

describe('SETTINGS_FIELDS', () => {
  // Mirrors the real sequence: an edit is applied to the settings object in the shape it is
  // STORED in (a number, for X01's starting score), and only then converted to schema input.
  // Doing those two the other way round silently re-breaks the round-trip.
  it('only offers values each game schema actually accepts', () => {
    const cases = [
      { gameId: 'x01' as const, schema: X01SettingsSchema, defaults: X01DefaultSettings },
      { gameId: 'cricket' as const, schema: CricketSettingsSchema, defaults: CricketDefaultSettings },
      { gameId: 'copycat' as const, schema: CopycatSettingsSchema, defaults: CopycatDefaultSettings },
    ];
    for (const { gameId, schema, defaults } of cases) {
      for (const field of SETTINGS_FIELDS[gameId]) {
        for (const option of field.options) {
          const edited = { ...(defaults as Record<string, unknown>), [field.key]: option.value };
          const candidate = toSchemaInput(gameId, edited);
          const result = schema.safeParse(candidate);
          expect(result.success, `${gameId}.${field.key} = ${option.value}`).toBe(true);
        }
      }
    }
  });
});

describe('fieldValue', () => {
  const [startingScore] = SETTINGS_FIELDS.x01;

  it('reads the stored value when it is still an offered option', () => {
    expect(fieldValue(startingScore, { startingScore: 301 })).toBe(301);
  });

  it('falls back to the first option for a value no longer offered', () => {
    expect(fieldValue(startingScore, { startingScore: 999 })).toBe(301);
  });

  it('falls back when the settings have no such field at all', () => {
    expect(fieldValue(startingScore, {})).toBe(301);
  });
});

describe('describeSettings', () => {
  it('reads X01 rules as a sentence', () => {
    expect(describeSettings('x01', { startingScore: 501, firstTo: 1, sets: 0 })).toBe('501 · First to 1 leg · No sets');
    expect(describeSettings('x01', { startingScore: 301, firstTo: 5, sets: 3 })).toBe('301 · First to 5 legs · First to 3 sets');
  });

  it('reads Cricket and Copycat by their own rules', () => {
    expect(describeSettings('cricket', { firstTo: 3, scoring: 'no-points' })).toBe('First to 3 legs · No points');
    expect(describeSettings('copycat', { firstTo: 7 })).toBe('First to 7 points');
  });
});
