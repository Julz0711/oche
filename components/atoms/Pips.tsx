import React from 'react';
import type { AccentToken } from './Panel';

const accentBg: Record<AccentToken, string> = {
  wire: 'bg-wire',
  double: 'bg-double',
  treble: 'bg-treble',
  sisal: 'bg-sisal',
};

const accentVar: Record<AccentToken, string> = {
  wire: 'var(--wire)',
  double: 'var(--double)',
  treble: 'var(--treble)',
  sisal: 'var(--sisal)',
};

interface PipsProps {
  /** How many are won/filled. */
  value: number;
  /** How many total to win the race. */
  target: number;
  accent?: AccentToken;
  className?: string;
}

/** Flight-shaped pips for a race-to-N counter (legs, points) — the actual win condition, made
 *  readable at a glance instead of buried in a small text label next to a bar. A filled pip is
 *  solid in the accent colour with a soft glow; an unfilled one is just an outline. */
export function Pips({ value, target, accent = 'wire', className = '' }: PipsProps) {
  return (
    <div className={`flex items-center gap-1 ${className}`}>
      {Array.from({ length: target }, (_, i) => {
        const filled = i < value;
        return (
          <span
            key={i}
            className={`w-2.5 h-2.5 rotate-45 rounded-[2px] ${filled ? accentBg[accent] : 'border border-sisal/40'}`}
            style={filled ? { boxShadow: `0 0 6px ${accentVar[accent]}` } : undefined}
          />
        );
      })}
    </div>
  );
}
