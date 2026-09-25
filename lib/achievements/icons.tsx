// lib/achievements/icons.tsx
/**
 * Achievement definitions carry a lucide-react icon *name* (they are seeded as plain data, so
 * they cannot reference a component). This maps that name to the icon itself.
 *
 * These used to render as emoji. Emoji are full-colour raster glyphs that follow the platform,
 * not the palette — a yellow trophy and a pink dart next to brass-and-green club chrome read as
 * a different product, and two different seeded achievements both landed on the same trophy.
 * The set is fourteen icons; bundling fourteen lucide components costs almost nothing and they
 * inherit `currentColor`, so every surface tints them with its own ink.
 */
import {
  Trophy, Zap, Target, Star, Flame, Crown, Lock, Medal, Gem, Rocket, Shield, Crosshair, Repeat,
  Circle, HelpCircle, type LucideIcon,
} from 'lucide-react';

const ACHIEVEMENT_ICONS: Record<string, LucideIcon> = {
  Trophy, Zap, Target, Star, Flame, Crown, Lock, Medal, Gem, Rocket, Shield, Crosshair, Repeat,
  Circle,
};

export function getIconForAchievement(iconName: string): LucideIcon {
  return ACHIEVEMENT_ICONS[iconName] ?? HelpCircle;
}

/** Renders the icon for a seeded achievement at the given size, inheriting `currentColor`. */
export function AchievementIcon({ icon, size = 20 }: { icon: string; size?: number }) {
  const Icon = getIconForAchievement(icon);
  return <Icon size={size} aria-hidden="true" />;
}
