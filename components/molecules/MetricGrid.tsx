import type { ReactNode } from 'react';

export interface Metric {
  label: string;
  value: ReactNode;
}

/**
 * A grid of label/value pairs, with no boxes.
 *
 * The screens this replaces drew a border around every single statistic and then another
 * border around the group — the audit's "wireframe that became production". Grouping here
 * comes from alignment and a consistent rhythm instead, which leaves the numbers as the only
 * thing on the card carrying visual weight.
 *
 * `cols` is the widescreen column count; every grid is two columns on a narrow phone so the
 * numbers stay at a readable size rather than shrinking to fit.
 */
export function MetricGrid({
  metrics,
  cols = 4,
  size = 'md',
  className = '',
  ...rest
}: {
  metrics: readonly Metric[];
  cols?: 2 | 3 | 4 | 'auto';
  size?: 'sm' | 'md';
  className?: string;
} & Omit<React.HTMLAttributes<HTMLDListElement>, 'className'>) {
  return (
    <dl className={`metric-grid ${className}`} data-cols={cols} data-size={size} {...rest}>
      {metrics.map((metric) => (
        <div key={metric.label}>
          <dt>{metric.label}</dt>
          <dd>{metric.value}</dd>
        </div>
      ))}
    </dl>
  );
}
