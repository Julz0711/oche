// app/(dashboard)/SetupControls.tsx
'use client';
import type { ReactNode } from 'react';
import type { LucideIcon } from 'lucide-react';
import { Panel, BoardMotif } from '@/components/atoms';
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

/** Picking a game opens its room, so a card is a way forward rather than a toggle — no selected
 *  state, and no `aria-pressed` claiming otherwise. Each card instead wears its game's colour
 *  permanently, which is what actually tells them apart. */
export function GameCard({
  game,
  index,
  onSelect,
  opening = false,
  disabled = false,
}: {
  game: GameOption;
  index: number;
  onSelect: () => void;
  /** This card's room is being opened — the tap has been registered and a request is in flight. */
  opening?: boolean;
  disabled?: boolean;
}) {
  const { accent, motif } = GAME_IDENTITY[game.id];

  return (
    <Panel
      as="button"
      notch="card"
      accent={accent}
      accentBar
      accentTrace
      onClick={onSelect}
      disabled={disabled || opening}
      aria-busy={opening}
      className="dashboard-game min-h-[68px] sm:min-h-[140px]"
    >
      {/* Quieter than the resting motif elsewhere: three of these side by side, each with a
          full-strength illustration, was the visual noise the audit called out. */}
      <BoardMotif
        name={motif}
        className={`pointer-events-none absolute -right-11 -bottom-14 w-[150px] h-[150px] ${ACCENT_TEXT[accent]} transition-transform duration-300 group-hover:rotate-[3deg]`}
        style={{ opacity: 'var(--motif-quiet)' }}
      />
      <span className="game-card-content relative block px-3 py-2.5 sm:p-4">
        <span className={`game-card-index block font-display font-bold text-[10px] tracking-[0.2em] ${ACCENT_TEXT[accent]}`}>
          {String(index + 1).padStart(2, '0')}
        </span>
        <span className="block font-display font-bold uppercase text-[22px] sm:text-[26px] leading-none text-chalk sm:mt-8 mb-1">
          {game.name}
        </span>
        <span className="block text-xs sm:text-[11px] leading-[1.4] text-[color:var(--text-muted)]">
          {opening ? 'Opening room…' : `${game.playerRange[0]}–${game.playerRange[1]} players · ${game.description}`}
        </span>
      </span>
    </Panel>
  );
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
