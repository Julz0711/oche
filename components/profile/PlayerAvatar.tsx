'use client';
import { useState } from 'react';
export function PlayerAvatar({ name, image, large = false }: { name: string; image?: string | null; large?: boolean }) {
  const [failed, setFailed] = useState<string | null>(null);
  return <span className={`player-avatar ${large ? 'player-avatar-large' : ''}`} aria-hidden="true">
    {image && failed !== image ? <img src={image} alt="" loading="lazy" referrerPolicy="no-referrer" onError={() => setFailed(image)} /> : name.trim().split(/\s+/).slice(0, 2).map(word => word[0]).join('').toUpperCase() || '?'}
  </span>;
}
