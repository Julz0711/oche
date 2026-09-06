import React from 'react';

export type PanelNotch = 'card' | 'panel' | 'inset' | 'none';
export type AccentToken = 'wire' | 'double' | 'treble' | 'sisal';

interface PanelOwnProps {
  as?: 'div' | 'button';
  /** Size of the cut bottom-right corner. */
  notch?: PanelNotch;
  /** Colours the accent bar and the left edge when active. */
  accent?: AccentToken;
  /** Draw the accent bar across the top of the surface. */
  accentBar?: boolean;
  /** Raised background plus a left accent edge — "this is the one in play". */
  active?: boolean;
  /** Hover lift. Implied when `as="button"`; set explicitly for hoverable non-buttons. */
  interactive?: boolean;
  /** Applied to the inner (clipped) surface. */
  className?: string;
  children: React.ReactNode;
}

type PanelProps = PanelOwnProps &
  Omit<React.ButtonHTMLAttributes<HTMLButtonElement>, keyof PanelOwnProps>;

const notchSize: Record<PanelNotch, string> = {
  card: 'var(--notch-card)',
  panel: 'var(--notch-panel)',
  inset: 'var(--notch-inset)',
  none: '0px',
};

const accentBg: Record<AccentToken, string> = {
  wire: 'bg-wire',
  double: 'bg-double',
  treble: 'bg-treble',
  sisal: 'bg-sisal',
};

/**
 * The app's surface primitive: a cut-corner panel with a lit top edge and a drop shadow.
 *
 * Why the two-element structure: `clip-path` clips borders, outlines and focus rings, so a
 * focus ring drawn on the clipped element would be visually cut off — an accessibility
 * regression. The outer element is therefore never clipped and carries the focus ring; the
 * inner element carries the clipped surface. Consumers get correct focus for free and must
 * not apply `clip-path` themselves.
 *
 * Edges come from background + inset top highlight + shadow, never from a `border`, which
 * the clip would cut.
 */
export function Panel({
  as = 'div',
  notch = 'panel',
  accent = 'wire',
  accentBar = false,
  active = false,
  interactive,
  className = '',
  children,
  ...rest
}: PanelProps) {
  const isButton = as === 'button';
  const lifts = interactive ?? isButton;

  const surface = (
    <span
      className={`
        relative block overflow-hidden
        ${active ? 'bg-[#202B28]' : 'bg-slate'}
        shadow-[0_16px_30px_-16px_rgba(0,0,0,0.9),inset_0_1px_0_rgba(255,255,255,0.06)]
        ${lifts ? 'motion-lift' : ''}
        ${className}
      `}
      style={{
        clipPath: `polygon(0 0, 100% 0, 100% calc(100% - ${notchSize[notch]}), calc(100% - ${notchSize[notch]}) 100%, 0 100%)`,
      }}
    >
      {accentBar && (
        <span
          className={`block h-[5px] w-full ${accentBg[accent]} ${
            lifts ? 'transition-[height] duration-150 group-hover:h-[9px]' : ''
          }`}
        />
      )}
      {active && <span className={`absolute left-0 top-0 bottom-0 w-1 ${accentBg[accent]}`} />}
      {children}
    </span>
  );

  if (!isButton) {
    return <div className="group relative">{surface}</div>;
  }

  return (
    <button
      type="button"
      className="group relative block w-full text-left focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-wire disabled:opacity-50"
      {...rest}
    >
      {surface}
    </button>
  );
}
