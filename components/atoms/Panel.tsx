import type { ButtonHTMLAttributes, CSSProperties, ReactNode } from 'react';
import { Check } from 'lucide-react';

export type AccentToken = 'wire' | 'double' | 'treble' | 'sisal';
interface PanelOwnProps {
  as?: 'div' | 'button';
  accent?: AccentToken;
  accentBar?: boolean;
  accentTrace?: boolean;
  active?: boolean;
  activeBadge?: boolean;
  fill?: AccentToken;
  interactive?: boolean;
  /** Content layout; the outer surface owns the border and focus ring. */
  className?: string;
  children: ReactNode;
}
type PanelProps = PanelOwnProps & Omit<ButtonHTMLAttributes<HTMLButtonElement>, keyof PanelOwnProps>;

/** A plain rectangular surface shared by every screen. */
export function Panel({ as = 'div', accent = 'wire', accentBar = false, accentTrace = false,
  active = false, activeBadge = true, fill, interactive, className = '', children, style, ...rest }: PanelProps) {
  const shared = {
    className: 'oche-panel group relative',
    'data-active': active || undefined,
    'data-fill': fill,
    'data-trace': accentTrace || undefined,
    'data-interactive': (interactive ?? as === 'button') || undefined,
    style: { '--panel-accent': `var(--${accent})`, ...(fill ? { '--panel-fill': `var(--${fill})` } : {}), ...style } as CSSProperties,
  };
  const Surface = as === 'button' ? 'span' : 'div';
  const surface = <Surface className={`oche-panel-surface relative block h-full ${className}`}>
    {accentBar && <span className="panel-accent-bar" aria-hidden="true" />}
    {active && activeBadge && <span className="panel-active-badge" aria-hidden="true"><Check size={14} /></span>}
    {children}
  </Surface>;
  return as === 'button'
    ? <button type="button" {...shared} {...rest}>{surface}</button>
    : <div {...shared}>{surface}</div>;
}
