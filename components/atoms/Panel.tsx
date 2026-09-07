import React from 'react';
import { Check } from 'lucide-react';

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
  /** Raised background plus a bold accent ring and a checkmark badge — "this is the one
   *  selected/chosen". */
  active?: boolean;
  /** Suppress the checkmark badge while keeping `active`'s raised background and ring — for
   *  consumers where "active" means something other than "selected" (e.g. a scoreboard slot's
   *  "current player's turn", which already has its own on-throw indicator). Defaults to true. */
  activeBadge?: boolean;
  /** Fill the surface solid with this accent instead of the default slate background — for
   *  filled CTAs (e.g. "Play Online") that still want the exact same notch/border/shadow
   *  geometry as every other Panel, rather than a parallel, hand-rolled implementation. */
  fill?: AccentToken;
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

function clipPathFor(notchExpr: string): string {
  return `polygon(0 0, 100% 0, 100% calc(100% - ${notchExpr}), calc(100% - ${notchExpr}) 100%, 0 100%)`;
}

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
  activeBadge = true,
  fill,
  interactive,
  className = '',
  children,
  ...rest
}: PanelProps) {
  const isButton = as === 'button';
  const lifts = interactive ?? isButton;
  const notchExpr = notchSize[notch];

  // Selection upgrades the trace to a bold, unmistakable full-strength accent border.
  const borderWidth = active ? 2.5 : 1.5;
  const borderColor = active ? accentVar[accent] : 'rgba(228,216,188,0.28)';

  // A real `border` (or box-shadow used as a border substitute) can't trace an arbitrary
  // clip-path polygon — box-shadow is computed from the element's plain rectangular
  // border-box and then clipped away along with everything else, so it never actually
  // reaches the diagonal cut in the first place; it just stops short. The only way to get a
  // border that genuinely continues along the whole clipped outline, corner included, is two
  // stacked layers using the SAME clip-path shape: an outer layer filled with the border
  // colour, and an inner layer — inset by the border width, with a correspondingly smaller
  // notch — filled with the real background. The border colour then peeks out as an evenly
  // thick sliver on every edge, the diagonal included, because both layers were clipped with
  // the same formula rather than one of them being a rectangle-based shadow.
  const surface = (
    <span
      className={`relative block h-full ${lifts ? 'motion-lift' : ''}`}
      style={{
        clipPath: clipPathFor(notchExpr),
        backgroundColor: borderColor,
        padding: borderWidth,
      }}
    >
      <span
        className={`
          relative block h-full overflow-hidden
          ${fill ? accentBg[fill] : active ? 'bg-[#202B28]' : 'bg-slate'}
          ${className}
        `}
        style={{
          clipPath: clipPathFor(`calc(${notchExpr} - ${borderWidth}px)`),
          boxShadow: 'inset 0 1px 0 rgba(255,255,255,0.06)',
        }}
      >
        {accentBar && (
          <span
            className={`notch-accent-bar block h-[5px] w-full ${accentBg[accent]} ${
              lifts ? 'transition-[height] duration-150 group-hover:h-[9px]' : ''
            }`}
          />
        )}
        {active && activeBadge && (
          <span
            className={`absolute top-0 right-0 flex items-center justify-center w-6 h-6 ${accentBg[accent]}`}
          >
            <Check className="w-3.5 h-3.5 text-oche" strokeWidth={3} />
          </span>
        )}
        {children}
      </span>
    </span>
  );

  // filter: drop-shadow(), not box-shadow — and specifically with a y-offset >= the largest
  // notch size (16px). Two different failure modes were tried and ruled out here:
  //  - A plain box-shadow is computed from the element's own rectangular border-box, which
  //    is always slightly LARGER than the visible notched shape at the cut corner — so it
  //    protrudes past the notch as a visible dark wedge sticking out beyond the card.
  //  - drop-shadow() correctly follows the exact rendered (notched) silhouette instead, so it
  //    never protrudes — but with too SMALL a y-offset, the shifted shadow copy's own notch
  //    hasn't kicked in yet where it overlaps the original's notch void, so it bleeds solid
  //    colour INTO the gap instead of receding with it.
  // An offset >= the notch depth avoids both: the shadow's own cutoff is reached at or before
  // the original's, so there's neither a protrusion past the shape nor a bleed into its notch.
  const dropShadow = { filter: 'drop-shadow(0 16px 14px rgba(0,0,0,0.5))' };

  // Deliberately no h-full here: this outer element is the grid/flex item itself, and its own
  // height must stay whatever its layout context gives it — stretched by a `stretch`-aligned
  // parent, content-sized under `items-start` (e.g. the score row's shorter middle info panel).
  // Setting height:100% here would hard-code "stretch" and override a parent's `items-start`,
  // which is exactly the bug this comment replaced. The two inner spans carry h-full instead, so
  // they fill whatever height this outer element ends up with, without dictating it themselves.
  if (!isButton) {
    return (
      <div className="group relative" style={dropShadow}>
        {surface}
      </div>
    );
  }

  return (
    <button
      type="button"
      className="group relative block w-full text-left focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-wire disabled:opacity-50"
      style={dropShadow}
      {...rest}
    >
      {surface}
    </button>
  );
}
