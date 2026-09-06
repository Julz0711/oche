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

const accentVar: Record<AccentToken, string> = {
  wire: 'var(--wire)',
  double: 'var(--double)',
  treble: 'var(--treble)',
  sisal: 'var(--sisal)',
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

  // Every surface traces its own clipped silhouette at rest — including the diagonal cut
  // corner — so that corner never reads as bare, un-rendered background. Selection then
  // upgrades the same trace to a bold, unmistakable full-strength accent ring. Both are
  // inset box-shadows, not a `border`, since `clip-path` would cut a real border.
  const boxShadow = active
    ? `inset 0 1px 0 rgba(255,255,255,0.06), inset 0 0 0 2px ${accentVar[accent]}`
    : `inset 0 1px 0 rgba(255,255,255,0.06), inset 0 0 0 1px rgba(228,216,188,0.18)`;

  const surface = (
    <span
      className={`
        relative block overflow-hidden
        ${active ? 'bg-[#202B28]' : 'bg-slate'}
        ${lifts ? 'motion-lift' : ''}
        ${className}
      `}
      style={{
        clipPath: `polygon(0 0, 100% 0, 100% calc(100% - ${notchSize[notch]}), calc(100% - ${notchSize[notch]}) 100%, 0 100%)`,
        boxShadow,
      }}
    >
      {accentBar && (
        <span
          className={`notch-accent-bar block h-[5px] w-full ${accentBg[accent]} ${
            lifts ? 'transition-[height] duration-150 group-hover:h-[9px]' : ''
          }`}
        />
      )}
      {children}
    </span>
  );

  if (!isButton) {
    return (
      <div className="group relative" style={{ filter: 'drop-shadow(0 12px 14px rgba(0,0,0,0.55))' }}>
        {surface}
      </div>
    );
  }

  return (
    <button
      type="button"
      className="group relative block w-full text-left focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-wire disabled:opacity-50"
      style={{ filter: 'drop-shadow(0 12px 14px rgba(0,0,0,0.55))' }}
      {...rest}
    >
      {surface}
    </button>
  );
}
