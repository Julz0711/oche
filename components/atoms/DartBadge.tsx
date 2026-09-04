// components/atoms/DartBadge.tsx
import { Throw } from '@/lib/types';

/** A single dart, rendered as a small colored circle rather than a text label. Shared by the
 *  match page's history panels and any per-game component that needs to render recent throws
 *  (e.g. Cricket's compact score-slot "last 3 darts" readout). */
export function DartBadge({ t }: { t: Throw }) {
  if (t.ring === 'M') {
    return (
      <span className="w-9 h-9 flex items-center justify-center rounded-full bg-oche border border-sisal/30 text-sisal text-xs font-bold">
        ×
      </span>
    );
  }
  if (t.ring === 'IB') {
    return (
      <span className="w-9 h-9 flex items-center justify-center rounded-full bg-double text-chalk text-xs font-bold ring-2 ring-wire">
        50
      </span>
    );
  }
  if (t.ring === 'OB') {
    return (
      <span className="w-9 h-9 flex items-center justify-center rounded-full bg-wire text-oche text-xs font-bold">
        25
      </span>
    );
  }
  const colorClass =
    t.ring === 'D'
      ? 'bg-double text-chalk'
      : t.ring === 'T'
        ? 'bg-treble text-chalk'
        : 'bg-oche text-chalk border border-sisal/30';
  return (
    <span className={`w-9 h-9 flex items-center justify-center rounded-full text-sm font-bold ${colorClass}`}>
      {t.sector}
    </span>
  );
}
