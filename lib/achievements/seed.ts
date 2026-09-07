// lib/achievements/seed.ts
import { Achievement } from '../db/models';

interface AchievementDefinition {
  achievement_id: string;
  name: string;
  description: string;
  rarity: 'common' | 'rare' | 'epic' | 'legendary';
  icon: string;
  is_repeatable: boolean;
  category: string;
  display_order: number;
}

export const ACHIEVEMENT_DEFINITIONS: AchievementDefinition[] = [
  // Legendary (4) - display_order 1-4
  {
    achievement_id: 'first_win',
    name: '9-Dart Finish',
    description: 'Score a perfect 9-dart game (180 in 3 throws)',
    rarity: 'legendary',
    icon: 'Crown',
    is_repeatable: true,
    category: 'scoring',
    display_order: 1,
  },
  {
    achievement_id: 'unstoppable',
    name: 'Unstoppable',
    description: 'Win 10 consecutive matches',
    rarity: 'legendary',
    icon: 'Fire',
    is_repeatable: true,
    category: 'streaks',
    display_order: 2,
  },
  {
    achievement_id: 'flawless_victory',
    name: 'Flawless Victory',
    description: 'Win 3 matches in a row without losing a leg',
    rarity: 'legendary',
    icon: 'Star',
    is_repeatable: true,
    category: 'streaks',
    display_order: 3,
  },
  {
    achievement_id: 'cricket_god',
    name: 'Cricket God',
    description: 'Win a Cricket leg by only hitting required numbers',
    rarity: 'legendary',
    icon: 'Trophy',
    is_repeatable: true,
    category: 'cricket',
    display_order: 4,
  },

  // Epic (5) - display_order 5-9
  {
    achievement_id: 'triple_20',
    name: 'Triple 20',
    description: 'Score 180 points in a single round',
    rarity: 'epic',
    icon: 'Flame',
    is_repeatable: true,
    category: 'scoring',
    display_order: 5,
  },
  {
    achievement_id: 'five_win_streak',
    name: '5-Win Streak',
    description: 'Win 5 consecutive matches',
    rarity: 'epic',
    icon: 'Lightning',
    is_repeatable: true,
    category: 'streaks',
    display_order: 6,
  },
  {
    achievement_id: 'ten_dart_finish',
    name: '10-Dart Finish',
    description: 'Win an X01 match in 10 darts or fewer',
    rarity: 'epic',
    icon: 'Target',
    is_repeatable: true,
    category: 'x01',
    display_order: 7,
  },
  {
    achievement_id: 'grand_slam',
    name: 'Grand Slam',
    description: 'Win first match in all 3 game modes',
    rarity: 'epic',
    icon: 'Crown',
    is_repeatable: false,
    category: 'milestones',
    display_order: 8,
  },
  {
    achievement_id: 'one_eighty',
    name: '180!',
    description: 'Score a 180',
    rarity: 'epic',
    icon: 'Star',
    is_repeatable: true,
    category: 'scoring',
    display_order: 9,
  },

  // Rare (8) - display_order 10-17
  {
    achievement_id: 'twenty_five_plus_wins',
    name: '25+ Wins',
    description: 'Achieve 25 total match wins',
    rarity: 'rare',
    icon: 'Trophy',
    is_repeatable: false,
    category: 'milestones',
    display_order: 10,
  },
  {
    achievement_id: 'comeback_kid',
    name: 'Comeback Kid',
    description: 'Win a match after being 100+ points behind',
    rarity: 'rare',
    icon: 'Rocket',
    is_repeatable: true,
    category: 'comebacks',
    display_order: 11,
  },
  {
    achievement_id: 'hundred_point_round',
    name: '100-Point Round',
    description: 'Score 100+ points in a single round',
    rarity: 'rare',
    icon: 'Flame',
    is_repeatable: true,
    category: 'scoring',
    display_order: 12,
  },
  {
    achievement_id: 'triple_trouble',
    name: 'Triple Trouble',
    description: 'Score only with triples in a single round',
    rarity: 'rare',
    icon: 'Star',
    is_repeatable: true,
    category: 'technique',
    display_order: 13,
  },
  {
    achievement_id: 'double_down',
    name: 'Double Down',
    description: 'Score only with doubles in a single round',
    rarity: 'rare',
    icon: 'Gem',
    is_repeatable: true,
    category: 'technique',
    display_order: 14,
  },
  {
    achievement_id: 'fifty_plus_average',
    name: '50+ Average',
    description: 'Score a 50+ average in a single leg',
    rarity: 'rare',
    icon: 'Medal',
    is_repeatable: true,
    category: 'averages',
    display_order: 15,
  },
  {
    achievement_id: 'first_180',
    name: 'First 180',
    description: 'Score your first 180',
    rarity: 'rare',
    icon: 'Lightning',
    is_repeatable: false,
    category: 'milestones',
    display_order: 16,
  },
  {
    achievement_id: 'bounce_back',
    name: 'Bounce Back',
    description: 'Lose first leg, then win the match',
    rarity: 'rare',
    icon: 'Shield',
    is_repeatable: true,
    category: 'comebacks',
    display_order: 17,
  },

  // Common (4) - display_order 18-21
  {
    achievement_id: 'first_win_common',
    name: 'First Win',
    description: 'Win your first match',
    rarity: 'common',
    icon: 'Trophy',
    is_repeatable: false,
    category: 'milestones',
    display_order: 18,
  },
  {
    achievement_id: 'first_20',
    name: 'First 20',
    description: 'Score a 20-point segment',
    rarity: 'common',
    icon: 'Target',
    is_repeatable: false,
    category: 'milestones',
    display_order: 19,
  },
  {
    achievement_id: 'first_triple',
    name: 'First Triple',
    description: 'Hit a triple segment',
    rarity: 'common',
    icon: 'Star',
    is_repeatable: false,
    category: 'milestones',
    display_order: 20,
  },
  {
    achievement_id: 'winning_streak',
    name: 'Winning Streak',
    description: 'Win 3 consecutive matches',
    rarity: 'common',
    icon: 'Flame',
    is_repeatable: true,
    category: 'streaks',
    display_order: 21,
  },
];

export async function seedAchievements(): Promise<void> {
  try {
    const operations = ACHIEVEMENT_DEFINITIONS.map((definition) => ({
      updateOne: {
        filter: { achievement_id: definition.achievement_id },
        update: { $set: definition },
        upsert: true,
      },
    }));

    if (operations.length > 0) {
      await (Achievement as any).bulkWrite(operations);
    }
  } catch (error) {
    console.error('Failed to seed achievements:', error);
    throw error;
  }
}
