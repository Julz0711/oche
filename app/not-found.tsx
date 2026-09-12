import { Compass } from 'lucide-react';
import { AppBar } from '@/components/molecules';
import { Panel } from '@/components/atoms/Panel';

export default function NotFound() {
  return (
    <main className="social-page page-gutters">
      <AppBar back={{ href: '/', label: 'Back to dashboard' }} eyebrow="Oche" title="Not found" />
      <Panel notch="card" className="p-6 flex flex-col items-center gap-3 text-center">
        <Compass className="w-10 h-10 text-wire" aria-hidden="true" />
        <p className="t-body max-w-sm">
          This page doesn&apos;t exist, or the link is out of date. Check the address, or head back to the dashboard.
        </p>
      </Panel>
    </main>
  );
}
