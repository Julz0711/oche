// lib/games/settingsForm.ts
//
// One declarative description of the match settings a player is allowed to change, shared by
// every surface that shows them: the online waiting room, the local room, and the read-only
// view a guest sees while the host edits.
//
// The fields below are a deliberate subset of each game's settings schema. A schema also carries
// options that setup never exposed (X01's `checkIn`/`checkOut`/`firstThrow`, for instance); those
// keep their defaults and are simply carried through untouched, exactly as the old wizard did.
import { GameId } from './registry';

export interface SettingsOption {
  value: string | number;
  label: string;
}

export interface SettingsField {
  /** Key on the game's settings object. */
  key: string;
  label: string;
  options: readonly SettingsOption[];
  /** Extra line explaining what the current choice means. */
  hint?: (value: unknown) => string | undefined;
}

const LEG_OPTIONS: SettingsOption[] = [1, 3, 5, 7].map((n) => ({ value: n, label: String(n) }));

export const SETTINGS_FIELDS: Record<GameId, readonly SettingsField[]> = {
  x01: [
    {
      key: 'startingScore',
      label: 'Starting score',
      options: [301, 501, 701].map((n) => ({ value: n, label: String(n) })),
    },
    { key: 'firstTo', label: 'Legs (first to)', options: LEG_OPTIONS },
    {
      key: 'sets',
      label: 'Sets (first to)',
      options: [0, 2, 3, 4, 5].map((n) => ({ value: n, label: n === 0 ? 'Off' : String(n) })),
    },
  ],
  cricket: [
    { key: 'firstTo', label: 'Legs (first to)', options: LEG_OPTIONS },
    {
      key: 'scoring',
      label: 'Scoring',
      options: [
        { value: 'standard', label: 'Standard' },
        { value: 'no-points', label: 'No points' },
      ],
      hint: (value) =>
        value === 'standard'
          ? 'Extra hits score while an opponent has the number open. Close all numbers and lead or tie on points to win.'
          : 'First to close all seven numbers wins the leg. Extra hits do not score.',
    },
  ],
  copycat: [
    {
      key: 'firstTo',
      label: 'Points (first to)',
      options: [3, 5, 7, 9].map((n) => ({ value: n, label: String(n) })),
    },
  ],
};

/**
 * Puts a stored settings object back into the shape its own schema will accept.
 *
 * X01's `startingScore` is `z.enum(['301','501','701']).transform(Number)`: the schema's INPUT is
 * a string and its OUTPUT is a number. What the match document holds is the output, so feeding a
 * stored settings object straight back into `settingsSchema.safeParse` fails on the one field a
 * player is most likely to have changed. Every edit round-trips through here first.
 *
 * Written as a lookup rather than a special case so the next schema that transforms an input has
 * somewhere obvious to go.
 */
const SCHEMA_INPUT_COERCIONS: Partial<Record<GameId, Record<string, (value: unknown) => unknown>>> = {
  x01: { startingScore: (value) => (typeof value === 'number' ? String(value) : value) },
};

export function toSchemaInput(gameId: GameId, settings: Record<string, unknown>): Record<string, unknown> {
  const coercions = SCHEMA_INPUT_COERCIONS[gameId];
  if (!coercions) return { ...settings };
  const out = { ...settings };
  for (const [key, coerce] of Object.entries(coercions)) {
    if (key in out) out[key] = coerce(out[key]);
  }
  return out;
}

/** The value a control should show for `field`, falling back to its first option when the stored
 *  settings have nothing usable (an older match, a schema that has since gained the field). */
export function fieldValue(field: SettingsField, settings: Record<string, unknown>): string | number {
  const current = settings[field.key];
  const match = field.options.find((option) => option.value === current);
  return match ? match.value : field.options[0].value;
}

/** A one-line readout of the rules — `501 · First to 5 legs · First to 3 sets`.
 *
 *  Built from the same field definitions the editor renders, so the summary and the controls can
 *  never disagree about what the match is set to. */
export function describeSettings(gameId: GameId, settings: Record<string, unknown>): string {
  return SETTINGS_FIELDS[gameId]
    .map((field) => {
      const option = field.options.find((entry) => entry.value === settings[field.key]);
      const label = option?.label ?? String(settings[field.key] ?? '');
      if (field.key === 'startingScore') return label;
      if (field.key === 'sets') return label === 'Off' ? 'No sets' : `First to ${label} sets`;
      if (field.label.startsWith('Legs')) return `First to ${label} leg${label === '1' ? '' : 's'}`;
      if (field.label.startsWith('Points')) return `First to ${label} points`;
      return label;
    })
    .filter(Boolean)
    .join(' · ');
}
