import { Compass } from 'lucide-react';
import { BackLink } from '@/components/atoms/BackLink';
import { Panel } from '@/components/atoms/Panel';

export default function NotFound() {
  return (
    <main className="social-page page-gutters">
      <BackLink />
      <Panel notch="card" className="p-6 flex flex-col items-center gap-3 text-center">
        <Compass className="w-10 h-10 text-wire" aria-hidden="true" />
        <h1 className="page-title">Not found</h1>
        <p className="text-sisal text-sm max-w-sm">
          This page doesn&apos;t exist, or the link is out of date. Check the address, or head back to the dashboard.
        </p>
      </Panel>
    </main>
  );
}
