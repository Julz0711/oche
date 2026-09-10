'use client';

import { useEffect, useState } from 'react';
import { Crosshair } from 'lucide-react';
import type { GameModule } from '@/lib/types';

export function TurnToast({ game, state, settings, name, enabled }: {
  game: GameModule; state: unknown; settings: unknown; name: string; enabled: boolean;
}) {
  const active = game.currentPlayer(state);
  // Includes successive visits by the same player after a leg/point win.
  const history = (state as { visitHistory?: unknown[] }).visitHistory?.length ?? 0;
  const turnKey = `${active}:${history}`;
  const [visible, setVisible] = useState(false);
  useEffect(() => {
    setVisible(enabled);
    if (!enabled) return;
    const timer = window.setTimeout(() => setVisible(false), 3500);
    return () => window.clearTimeout(timer);
  }, [turnKey, enabled]);

  const target = game.id === 'copycat' ? game.matchInfo(state, settings).find(entry => entry.label === 'Target')?.value : null;
  const prompt = target ? target === 'Set a target' ? 'Set the target with three darts.' : `Match ${target} with three darts.` : 'Your turn. Throw when ready.';
  return <div role="status" aria-live="polite" aria-atomic="true" className="turn-toast-region">
    {visible && <div key={turnKey} className="turn-toast"><Crosshair size={21} aria-hidden="true" /><div><strong>{name}</strong><span>{prompt}</span></div></div>}
  </div>;
}
