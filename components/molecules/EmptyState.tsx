import type { LucideIcon } from 'lucide-react';
import type { ReactNode } from 'react';

/**
 * What a list says when it has nothing in it.
 *
 * Always names the thing that would be here and the one action that would make it appear —
 * "No completed matches yet" plus a way to start one, never a bare "no data". The action is
 * optional only where there genuinely isn't one from this screen.
 */
export function EmptyState({
  icon: Icon,
  title,
  body,
  action,
}: {
  icon?: LucideIcon;
  title: string;
  body?: ReactNode;
  action?: ReactNode;
}) {
  return (
    <div className="empty-state">
      {Icon && <Icon size={28} aria-hidden="true" />}
      <h3>{title}</h3>
      {body && <p>{body}</p>}
      {action}
    </div>
  );
}
