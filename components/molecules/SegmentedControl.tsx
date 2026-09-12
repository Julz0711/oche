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
 * The selected segment is a raised surface plus a gold underline plus heavier weight, not a
 * solid gold fill. Solid gold is reserved for the single highest-priority control on a
 * screen (the primary CTA); used for every filter row as well, it made the filters compete
 * with the data they filter. The weight change also means selection is still visible without
 * colour, which the filled version did not guarantee.
 *
 * `aria-pressed` (not `role="tablist"`) because these filter content in place rather than
 * switching between panels.
 */
export function SegmentedControl<T extends string | number>({
  options,
  value,
  onChange,
  label,
  wrap = false,
  className = '',
}: {
  options: readonly SegmentOption<T>[];
  value: T;
  onChange: (value: T) => void;
  /** Names the group for screen readers — required, since the options alone rarely say what
   *  is being filtered. */
  label: string;
  /** Let options flow onto more than one row instead of squeezing into equal columns. Use
   *  when there are more than ~4 options or the labels are long. */
  wrap?: boolean;
  className?: string;
}) {
  return (
    <div role="group" aria-label={label} className={`segmented ${wrap ? 'segmented-wrap' : ''} ${className}`}>
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
