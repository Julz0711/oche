import type { ReactNode } from 'react';
import { AppBar } from './AppBar';

/** Shared presentation for a page-level error, confirmation or missing resource. */
export function PageMessage({ title, eyebrow = 'Oche', children, actions }: {
  title: string;
  eyebrow?: string;
  children: ReactNode;
  actions?: ReactNode;
}) {
  return <main className="message-page page-gutters">
    <AppBar eyebrow={eyebrow} title={title} />
    <div className="message-body">{children}</div>
    {actions && <div className="message-actions">{actions}</div>}
  </main>;
}
