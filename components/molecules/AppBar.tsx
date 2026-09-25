import Link from 'next/link';
import { ChevronLeft } from 'lucide-react';
import type { ReactNode } from 'react';

/**
 * The page header: a short chrome row (back chevron, eyebrow, one optional action) above the
 * page title. The back chevron and eyebrow form one link with a 44px touch target.
 *
 * It replaces the 44×44 bordered square that used to sit on a row of its own — that control
 * read as a detached widget and bought nothing with the row it cost. The row here earns its
 * height by also carrying the eyebrow and the page's trailing action.
 *
 * The title deliberately sits on the row BELOW rather than beside the chevron: inline, it
 * started ~40px inboard of every other thing on the page, which is exactly the drifting
 * content column the audit flagged. Here the title, the section headings and the cards all
 * begin on the same left edge.
 */
export function AppBar({
  back,
  eyebrow,
  title,
  action,
}: {
  /** Omit on top-level destinations — those are reached from the tab bar, not from a parent. */
  back?: { href: string; label: string };
  eyebrow?: string;
  title: ReactNode;
  action?: ReactNode;
}) {
  return (
    <header className="app-bar">
      {(back || eyebrow || action) && (
        <div className="app-bar-top">
          {back ? (
            <Link href={back.href} aria-label={eyebrow ? `${eyebrow}: ${back.label}` : back.label} className="app-bar-back">
              <ChevronLeft size={18} aria-hidden="true" />
              {eyebrow && <span className="eyebrow">{eyebrow}</span>}
            </Link>
          ) : eyebrow && <p className="eyebrow">{eyebrow}</p>}
          {action}
        </div>
      )}
      <h1>{title}</h1>
    </header>
  );
}
