import Link from 'next/link';
import { ArrowRight, ArrowUpRight } from 'lucide-react';
import type { ComponentProps, ReactNode } from 'react';

/**
 * The app's one "go and see more" affordance.
 *
 * Before this existed the same idea was written five different ways — `Full statistics →`,
 * `Manage →`, `Show all achievements`, `View profile →`, `Head-to-head ↗` — at three
 * different sizes with three different icon conventions. A reader had to learn each one
 * separately. Now every such link is this component, and the only choice a caller makes is
 * which arrow the destination deserves:
 *
 *   `forward` (→)  stays inside the current context — another page of this app.
 *   `detail`  (↗)  opens a specific record's own page (a player, a match).
 *
 * Verbs are consistently `View …` / `Manage …` at the call sites; see the audit's copy table.
 */
export type TextLinkArrow = 'forward' | 'detail' | 'none';

function Arrow({ arrow }: { arrow: TextLinkArrow }) {
  if (arrow === 'none') return null;
  const Icon = arrow === 'detail' ? ArrowUpRight : ArrowRight;
  return <Icon size={15} aria-hidden="true" />;
}

export function TextLink({
  href,
  arrow = 'forward',
  children,
  className = '',
  ...rest
}: { href: string; arrow?: TextLinkArrow; children: ReactNode; className?: string } & Omit<
  ComponentProps<typeof Link>,
  'href' | 'children' | 'className'
>) {
  return (
    <Link href={href} className={`text-link ${className}`} {...rest}>
      {children}
      <Arrow arrow={arrow} />
    </Link>
  );
}

/** Same affordance, for an in-place action rather than a destination (e.g. "Show all"). */
export function TextButton({
  arrow = 'none',
  children,
  className = '',
  ...rest
}: { arrow?: TextLinkArrow; children: ReactNode } & ComponentProps<'button'>) {
  return (
    <button type="button" className={`text-link ${className}`} {...rest}>
      {children}
      <Arrow arrow={arrow} />
    </button>
  );
}
