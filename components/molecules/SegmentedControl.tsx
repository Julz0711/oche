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
 * Rendered as a tab strip: a baseline runs under every option, and the selected one thickens
 * its own segment of that baseline in gold and brightens its label. No solid gold fill —
 * that is reserved for the single highest-priority action on a screen, and using it here as
 * well made filters compete with the data they filter. The weight change means selection is
 * still visible in greyscale.
 *
 * `aria-pressed` (not `role="tablist"`) because these filter content in place rather than
 * switching between panels.
 */
export function SegmentedControl<T extends string | number>({
  options,
  value,
  onChange,
  label,
  even = false,
  className = '',
}: {
  options: readonly SegmentOption<T>[];
  value: T;
  onChange: (value: T) => void;
  /** Names the group for screen readers — required, since the options alone rarely say what
   *  is being filtered. */
  label: string;
  /** Fill the available width with equal columns instead of sizing each option to its label.
   *  For closed numeric sets (match settings), where an even rhythm reads better than a
   *  ragged row of tabs. */
  even?: boolean;
  className?: string;
}) {
  return (
    <div role="group" aria-label={label} className={`segmented ${even ? 'segmented-even' : ''} ${className}`}>
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
