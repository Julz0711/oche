// app/(dashboard)/SetupControls.tsx
'use client';
import type { ReactNode } from 'react';
import type { LucideIcon } from 'lucide-react';
import { BoardMotif } from '@/components/atoms';
import { ArrowUpRight } from 'lucide-react';
import styles from './dashboard.module.css';
import type { AccentToken, MotifName } from '@/components/atoms';
import type { GameId } from '@/lib/games/registry';

export interface GameOption {
  id: GameId;
  name: string;
  description: string;
  icon: LucideIcon;
  playerRange: [number, number];
  status?: 'stable' | 'beta' | 'comingSoon';
  defaultSettings: Record<string, unknown>;
}

/** Each game's identity: its accent token and the motif that says something true about how
 *  it's played. Copycat uses `treble` for identity only — never for state — per the spec. */
export const GAME_IDENTITY: Record<GameId, { accent: AccentToken; motif: MotifName }> = {
  x01: { accent: 'wire', motif: 'board' },
  cricket: { accent: 'double', motif: 'scoresheet' },
  copycat: { accent: 'treble', motif: 'echo' },
};

const ACCENT_TEXT: Record<AccentToken, string> = {
  wire: 'text-wire',
  double: 'text-double',
  treble: 'text-treble',
  sisal: 'text-sisal',
};

const GAME_COPY: Record<GameId, { category: string; detail: string }> = {
  x01: { category: 'The classic', detail: 'Count down. Find your finish.' },
  cricket: { category: 'The strategist', detail: 'Close your numbers. Own the board.' },
  copycat: { category: 'The challenger', detail: 'Set the pace. Match your rival.' },
};

export function GameCard({ game, index, onSelect, opening = false, disabled = false }: {
  game: GameOption; index: number; onSelect: () => void; opening?: boolean; disabled?: boolean;
}) {
  const { accent, motif } = GAME_IDENTITY[game.id];
  const copy = GAME_COPY[game.id];
  return <button type="button" className={styles.gameCard} data-game={game.id} onClick={onSelect}
    disabled={disabled || opening} aria-busy={opening} aria-label={`Play ${game.name}`}>
    <span className={styles.cardTop}><span>No. {String(index + 1).padStart(2, '0')}</span><span>{copy.category}</span></span>
    <BoardMotif name={motif} className={`${styles.cardMotif} ${ACCENT_TEXT[accent]}`} />
    <span className={styles.cardName}>{game.name}</span>
    <span className={styles.cardDetail}>{copy.detail}</span>
    <span className={styles.cardFoot}><span>{opening ? 'Opening room…' : `${game.playerRange[0]}–${game.playerRange[1]} players`}</span><span>{opening ? 'Please wait' : 'Play'} <ArrowUpRight size={18} aria-hidden="true" /></span></span>
  </button>;
}

export function SettingLabel({ children }: { children: ReactNode }) {
  return <span className="t-label">{children}</span>;
}

/** One match setting: its name, its choices, and optionally a line explaining what the
 *  choice means. Keeps the label and the control's accessible name in one place, so they
 *  can't drift apart. */
export function Setting({
  label,
  hint,
  children,
}: {
  label: string;
  hint?: ReactNode;
  children: ReactNode;
}) {
  return (
    <div className="dashboard-setting">
      <SettingLabel>{label}</SettingLabel>
      {children}
      {hint && <p className="t-meta max-w-prose">{hint}</p>}
    </div>
  );
}
