'use client';
import { SegmentedControl } from '@/components/molecules';
import { SETTINGS_FIELDS, fieldValue, type SettingsField } from '@/lib/games/settingsForm';
import type { GameId } from '@/lib/games/registry';

/**
 * The match rules, for whoever is looking at them.
 *
 * Given `onChange` it renders the editable controls; without one it renders the same values as a
 * plain readout. That is the whole difference between what a host sees in a waiting room and what
 * a guest sees — one component, so the two can't drift apart, and a guest is never shown a
 * disabled control they might keep pressing.
 */
export function MatchSettingsFields({
  gameId,
  settings,
  onChange,
  busy = false,
}: {
  gameId: GameId;
  settings: Record<string, unknown>;
  /** Omit for a read-only view. Receives the complete next settings object. */
  onChange?: (next: Record<string, unknown>) => void;
  busy?: boolean;
}) {
  const fields = SETTINGS_FIELDS[gameId] ?? [];
  if (fields.length === 0) return null;

  if (!onChange) {
    return (
      <dl className="settings-readout">
        {fields.map((field) => (
          <div key={field.key}>
            <dt>{field.label}</dt>
            <dd>{labelFor(field, settings)}</dd>
          </div>
        ))}
      </dl>
    );
  }

  return (
    <div className="match-settings">
      {fields.map((field) => {
        const value = fieldValue(field, settings);
        const hint = field.hint?.(value);
        return (
          <div className="match-setting" key={field.key}>
            <span className="t-label">{field.label}</span>
            <SegmentedControl
              even
              label={field.label}
              value={value}
              options={field.options.map((option) => ({ value: option.value, label: option.label }))}
              // The edit is written in the shape the settings are STORED in; converting to the
              // schema's input shape happens once, at the point of sending. See settingsForm.ts.
              onChange={(next) => onChange({ ...settings, [field.key]: next })}
            />
            {hint && <p className="t-meta max-w-prose">{hint}</p>}
            {busy && <span className="sr-only">Saving…</span>}
          </div>
        );
      })}
    </div>
  );
}

function labelFor(field: SettingsField, settings: Record<string, unknown>): string {
  const value = fieldValue(field, settings);
  return field.options.find((option) => option.value === value)?.label ?? String(value);
}
