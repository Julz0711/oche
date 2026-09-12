import { CheckCircle2, AlertTriangle, Info } from 'lucide-react';
import type { ReactNode } from 'react';

type Tone = 'success' | 'error' | 'info';

const ICONS = { success: CheckCircle2, error: AlertTriangle, info: Info } as const;

/**
 * Inline confirmation or failure, shown next to the control that caused it rather than as a
 * floating toast — the user is already looking here, and the message stays attached to the
 * thing it is about.
 *
 * Each tone carries an icon as well as a colour, so it survives a greyscale render or a
 * red/green colour-vision deficiency, and the right live-region role so it is announced:
 * `alert` for failures (interrupts), `status` for confirmations (waits its turn).
 */
export function InlineFeedback({ tone, children }: { tone: Tone; children: ReactNode }) {
  const Icon = ICONS[tone];
  return (
    <p className="inline-feedback" data-tone={tone} role={tone === 'error' ? 'alert' : 'status'}>
      <Icon size={16} aria-hidden="true" />
      <span>{children}</span>
    </p>
  );
}
