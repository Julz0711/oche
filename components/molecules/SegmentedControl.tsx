'use client';
import type { ReactNode } from 'react';

export interface SegmentOption<T extends string | number> {
  value: T;
  label: ReactNode;
  /** Announced instead of `label` when the visible label is an abbreviation. */
  srLabel?: string;
  disabled?: boolean;
}

/**
 * One control for picking one value from a small fixed set — stats periods, game filters,
 * match settings.
 *
 * Two variants, because filtering a view and choosing a value are different acts. `tabs` (the
 * default) is a strip with a shared baseline, for filters. `choice` is a row of bounded,
 * pressable cells, for settings — where an option that is merely text on a baseline does not
 * read as something you can press. Neither uses a solid gold fill: that is reserved for the
 * single highest-priority action on a screen.
 *
 * `aria-pressed` (not `role="tablist"`) because these filter content in place rather than
 * switching between panels.
 */
export function SegmentedControl<T extends string | number>({
  options,
  value,
  onChange,
  label,
  variant = 'tabs',
  className = '',
}: {
  options: readonly SegmentOption<T>[];
  value: T;
  onChange: (value: T) => void;
  /** Names the group for screen readers — required, since the options alone rarely say what
   *  is being filtered. */
  label: string;
  /** `tabs` filters a view in place: options sit on a shared baseline and the chosen one
   *  thickens its segment of it. `choice` picks a value in a form: each option is a bounded,
   *  obviously pressable cell and the chosen one is ringed. Filters are read; values are
   *  pressed, and they should not look alike. */
  variant?: 'tabs' | 'choice';
  className?: string;
}) {
  return (
    <div role="group" aria-label={label} className={`segmented ${variant === 'choice' ? 'segmented-choice' : ''} ${className}`}>
      {options.map((option) => (
        <button
          key={String(option.value)}
          type="button"
          disabled={option.disabled}
          aria-pressed={option.value === value}
          onClick={() => onChange(option.value)}
        >
          {option.srLabel ? <span aria-hidden="true">{option.label}</span> : option.label}
          {option.srLabel && <span className="sr-only">{option.srLabel}</span>}
        </button>
      ))}
    </div>
  );
}
