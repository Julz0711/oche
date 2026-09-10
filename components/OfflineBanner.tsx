// components/OfflineBanner.tsx
'use client';
import { useEffect, useState } from 'react';

/** A small banner shown whenever the browser reports no network connection. Local matches keep
 *  working regardless (see lib/localMatchStorage.ts and the match page's mount effect) — this is
 *  purely informational. */
export function OfflineBanner() {
  const [isOffline, setIsOffline] = useState(false);

  useEffect(() => {
    setIsOffline(!navigator.onLine);
    const goOffline = () => setIsOffline(true);
    const goOnline = () => setIsOffline(false);
    window.addEventListener('offline', goOffline);
    window.addEventListener('online', goOnline);
    return () => {
      window.removeEventListener('offline', goOffline);
      window.removeEventListener('online', goOnline);
    };
  }, []);

  if (!isOffline) return null;

  return (
    <div
      role="status"
      className="fixed top-0 inset-x-0 z-50 bg-wire text-oche text-center text-xs font-bold uppercase tracking-widest py-1.5"
    >
      You are offline. Local matches keep working.
    </div>
  );
}
