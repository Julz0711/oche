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

/** Picking a game moves straight on to its settings, so a card is a way forward rather than a
 *  toggle — no selected state, and no `aria-pressed` claiming otherwise. Each card instead wears
 *  its game's colour permanently, which is what actually tells them apart. */
export function GameCard({
  game,
  index,
  onSelect,
}: {
  game: GameOption;
  index: number;
  onSelect: () => void;
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
      className="dashboard-game min-h-[72px] sm:min-h-[172px]"
    >
      <BoardMotif
        name={motif}
        className={`pointer-events-none absolute -right-11 -bottom-14 w-[168px] h-[168px] ${ACCENT_TEXT[accent]} transition-transform duration-300 group-hover:rotate-[3deg]`}
        style={{ opacity: 'var(--motif-rest)' }}
      />
      <span className="game-card-content relative block px-3 py-2 sm:p-[18px]">
        <span className={`game-card-index block font-display font-bold text-[10px] tracking-[0.2em] ${ACCENT_TEXT[accent]}`}>
          {String(index + 1).padStart(2, '0')}
        </span>
        <span className="block font-display font-bold uppercase text-[22px] sm:text-[30px] leading-none text-chalk sm:mt-12 mb-1">
          {game.name}
        </span>
        <span className="block text-xs sm:text-[10px] leading-[1.4] text-sisal/60">
          {game.playerRange[0]} to {game.playerRange[1]} players · {game.description}
        </span>
      </span>
    </Panel>
  );
}

/** A row of pressable pills for picking one value from a small fixed set — used for every
 *  match-settings control. `format` renders the label; defaults to the raw value. */
export function Pills<T extends string | number>({
  options,
  value,
  onChange,
  format,
}: {
  options: readonly T[];
  value: T;
  onChange: (value: T) => void;
  format?: (value: T) => string;
}) {
  return (
    <div className="flex gap-1.5 sm:gap-2 flex-wrap">
      {options.map((option) => (
        <button
          key={String(option)}
          type="button"
          onClick={() => onChange(option)}
          aria-pressed={option === value}
          className={`min-h-11 min-w-11 px-3 sm:px-4 py-2 rounded-none text-sm font-bold transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-wire focus-visible:ring-offset-2 focus-visible:ring-offset-oche ${
            option === value ? 'bg-wire text-oche' : 'bg-oche text-sisal border border-sisal/30 hover:opacity-80'
          }`}
        >
          {format ? format(option) : option}
        </button>
      ))}
    </div>
  );
}

export function SettingLabel({ children }: { children: ReactNode }) {
  return <span className="text-[11px] font-bold uppercase tracking-widest text-sisal">{children}</span>;
}
