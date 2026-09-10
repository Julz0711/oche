'use client';
import { useEffect, useState } from 'react';

/** Waits `delayMs` before showing anything at all — a fetch that resolves within that window
 *  (most client-side navigations and cache-warm reads) never flashes a spinner; only a load
 *  that's actually slow (initial page load, a real network round trip) gets one. */
export function LoadingIndicator({ label = 'Loading…', fullPage = false, delayMs = 300 }: { label?: string; fullPage?: boolean; delayMs?: number }) {
  const [visible, setVisible] = useState(delayMs <= 0);
  useEffect(() => {
    if (delayMs <= 0) return;
    const timer = window.setTimeout(() => setVisible(true), delayMs);
    return () => window.clearTimeout(timer);
  }, [delayMs]);

  if (!visible) return null;

  return <div role="status" aria-live="polite" className={`oche-loading${fullPage ? ' oche-loading-page' : ''}`}>
    <svg className="oche-loading-board" viewBox="0 0 64 64" fill="none" aria-hidden="true">
      <circle cx="32" cy="32" r="27" stroke="currentColor" opacity=".25" />
      <circle cx="32" cy="32" r="18" stroke="currentColor" opacity=".35" />
      <circle className="oche-loading-ring" cx="32" cy="32" r="27" stroke="currentColor" strokeWidth="3" strokeDasharray="35 135" />
      <circle cx="32" cy="32" r="5" fill="currentColor" />
      <path d="M32 5v9M59 32h-9M32 59v-9M5 32h9" stroke="currentColor" />
    </svg>
    <span>{label}</span>
  </div>;
}
