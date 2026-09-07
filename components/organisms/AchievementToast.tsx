'use client';

import { X } from 'lucide-react';
import { tokens } from '@/lib/theme';
import type { AchievementRarity } from '@/lib/achievements/types';
import { getIconForAchievement } from '@/lib/achievements/icons';
import { useAchievementStore, type AchievementToast } from '@/lib/stores/achievementStore';

/**
 * Rarity palette for the toast. Legendary gets the wire (brand gold) surface plus a brighter
 * gold rule so it reads as distinct from the three tiers below it, which all sit on slate.
 */
const rarityColors: Record<AchievementRarity, { bg: string; border: string }> = {
  legendary: { bg: tokens.wire, border: '#FFD700' },
  epic: { bg: tokens.slate, border: '#A855F7' },
  rare: { bg: tokens.slate, border: '#3B82F6' },
  common: { bg: tokens.slate, border: tokens.double },
};

/**
 * Legendary sits on the gold `wire` surface, where chalk/sisal text has too little contrast —
 * it takes the dark `oche` ink instead.
 */
function inkFor(rarity: AchievementRarity): { primary: string; secondary: string } {
  if (rarity === 'legendary') {
    return { primary: tokens.oche, secondary: tokens.oche };
  }
  return { primary: tokens.chalk, secondary: tokens.sisal };
}

/**
 * Fixed top-right stack of achievement-unlock toasts. Mounted once, in the root layout.
 *
 * Renders nothing at all until a toast is queued, so it never intercepts pointer events over
 * the page (the wrapper is `pointer-events-none`; only the toasts themselves are clickable).
 */
export function AchievementToastContainer() {
  const pendingToasts = useAchievementStore((s) => s.pendingToasts);
  const dismissToast = useAchievementStore((s) => s.dismissToast);

  if (pendingToasts.length === 0) return null;

  return (
    <div
      className="fixed top-4 right-4 z-50 flex flex-col gap-2 pointer-events-none"
      role="status"
      aria-live="polite"
    >
      {pendingToasts.map((achievement, idx) => (
        <AchievementToastItem
          key={achievement.toastId}
          achievement={achievement}
          onClose={() => dismissToast(idx)}
        />
      ))}
    </div>
  );
}

interface AchievementToastItemProps {
  achievement: AchievementToast;
  onClose: () => void;
}

function AchievementToastItem({ achievement, onClose }: AchievementToastItemProps) {
  const rarity = achievement.rarity;
  const colors = rarityColors[rarity];
  const ink = inkFor(rarity);
  const isRepeatable = achievement.is_repeatable;
  const count = achievement.count ?? 1;

  return (
    <div
      className="pointer-events-auto flex items-center gap-3 p-4 rounded border-l-4 max-w-sm shadow-lg animate-slideIn"
      style={{
        backgroundColor: colors.bg,
        borderLeftColor: colors.border,
      }}
    >
      <div className="text-2xl shrink-0" aria-hidden="true">
        {getIconForAchievement(achievement.icon)}
      </div>

      <div className="flex-1 min-w-0">
        <div className="text-sm font-bold uppercase" style={{ color: ink.primary }}>
          {isRepeatable ? 'Achievement' : 'Achievement Unlocked'}
        </div>
        <div className="text-xs" style={{ color: ink.secondary }}>
          {achievement.name}
          {isRepeatable && count > 1 ? ` (×${count})` : ''}
        </div>
      </div>

      <button
        type="button"
        onClick={onClose}
        aria-label={`Dismiss ${achievement.name} notification`}
        className="shrink-0 hover:opacity-70"
        style={{ color: ink.secondary }}
      >
        <X size={16} />
      </button>
    </div>
  );
}
