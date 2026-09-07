// lib/achievements/icons.ts
/**
 * Achievement definitions carry a lucide-react icon *name* (they are seeded as plain data, so
 * they cannot reference a component). Rendering emoji keeps every achievement surface a pure
 * data render — no dynamic icon-component lookup, and no bundling of every lucide icon that
 * might be seeded.
 *
 * Shared by the profile grid (app/profile/page.tsx) and the unlock toast
 * (components/organisms/AchievementToast.tsx) so both render the same glyph for a given
 * achievement.
 */
const ACHIEVEMENT_ICONS: Record<string, string> = {
  Trophy: '🏆',
  Zap: '⚡',
  Target: '🎯',
  Star: '⭐',
  Flame: '🔥',
  Crown: '👑',
  Lock: '🔒',
  Medal: '🏅',
  Gem: '💎',
  Rocket: '🚀',
  Shield: '🛡️',
  Crosshair: '🎯',
  Repeat: '🔁',
  Circle: '⚪',
};

export function getIconForAchievement(iconName: string): string {
  return ACHIEVEMENT_ICONS[iconName] || '❓';
}
