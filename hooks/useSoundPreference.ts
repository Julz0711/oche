'use client';
import { useEffect, useState } from 'react';
import { toggleSound } from '@/lib/sounds';

export function useSoundPreference() {
  const [enabled, setEnabled] = useState(true);
  useEffect(() => {
    const sync = () => setEnabled(localStorage.getItem('soundEnabled') !== 'false');
    sync();
    window.addEventListener('storage', sync);
    window.addEventListener('oche-sound-change', sync);
    window.addEventListener('focus', sync);
    return () => {
      window.removeEventListener('storage', sync);
      window.removeEventListener('oche-sound-change', sync);
      window.removeEventListener('focus', sync);
    };
  }, []);
  return { enabled, toggle: () => setEnabled(toggleSound()) };
}
