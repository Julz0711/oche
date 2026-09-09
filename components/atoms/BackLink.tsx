import Link from 'next/link';
import { ArrowLeft } from 'lucide-react';

/** A small, consistent way back to the dashboard for every page that isn't the dashboard
 *  itself — matches the flat bordered-button style already used for the match screen's
 *  Stats/Undo controls, so it reads as part of the same UI language rather than a bolted-on
 *  navbar. */
export function BackLink({ href = '/', label = 'Back to dashboard' }: { href?: string; label?: string }) {
  return (
    <Link
      href={href}
      aria-label={label}
      className="flex items-center justify-center w-11 h-11 md:w-8 md:h-8 shrink-0 border-2 border-sisal/30 bg-slate text-sisal hover:border-wire hover:text-chalk transition-colors"
    >
      <ArrowLeft className="w-4 h-4" />
    </Link>
  );
}
