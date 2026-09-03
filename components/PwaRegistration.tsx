'use client';
import { useEffect } from 'react';

/** Registers the no-op service worker (public/sw.js) on mount. Renders nothing — this is a
 *  side-effect-only component, not a visual one, which is why it doesn't live under
 *  atoms/molecules/organisms alongside this project's UI components. */
export function PwaRegistration() {
  useEffect(() => {
    if ('serviceWorker' in navigator) {
      navigator.serviceWorker.register('/sw.js').catch((err) => {
        console.error('Service worker registration failed:', err);
      });
    }
  }, []);

  return null;
}
