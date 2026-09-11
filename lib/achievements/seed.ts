// lib/achievements/seed.ts
import { Achievement, UserAchievement } from '../db/models';

interface AchievementDefinition {
  achievement_id: string;
  name: string;
  description: string;
  rarity: 'common' | 'rare' | 'epic' | 'legendary';
  icon: string;
  is_repeatable: boolean;
  category: string;
  display_order: number;
  trigger_condition: Record<string, unknown>;
}

export const ACHIEVEMENT_DEFINITIONS: AchievementDefinition[] = [
  // Legendary (4) - display_order 1-4
  {
    achievement_id: 'nine_dart_finish',
    name: '9-Dart Finish',
    description: 'Score a perfect 9-dart game (180 in 3 throws)',
    rarity: 'legendary',
    icon: 'Crown',
    is_repeatable: false,
    category: 'scoring',
    display_order: 1,
    trigger_condition: { event: 'match_win', darts_thrown: 9, score_sequence: ['180', '180', '180'] },
  },
  {
    achievement_id: 'unstoppable',
    name: 'Unstoppable',
    description: 'Win 10 consecutive matches',
    rarity: 'legendary',
    icon: 'Flame',
    is_repeatable: false,
    category: 'streaks',
    display_order: 2,
    trigger_condition: { event: 'win_streak', count: 10 },
  },
  {
    achievement_id: 'flawless_victory',
    name: 'Flawless Victory',
    description: 'Win 3 matches in a row without losing a leg',
    rarity: 'legendary',
    icon: 'Star',
    is_repeatable: false,
    category: 'streaks',
    display_order: 3,
    trigger_condition: { event: 'match_win_streak', consecutive_matches: 3, no_legs_lost: true },
  },
  {
    achievement_id: 'cricket_god',
    name: 'Cricket God',
    description: 'Win a Cricket leg by only hitting required numbers',
    rarity: 'legendary',
    icon: 'Trophy',
    is_repeatable: false,
    category: 'cricket',
    display_order: 4,
    trigger_condition: { event: 'cricket_leg_win', only_required_numbers: true },
  },

  // Epic (4) - display_order 5-8
  {
    achievement_id: 'five_win_streak',
    name: '5-Win Streak',
    description: 'Win 5 consecutive matches',
    rarity: 'epic',
    icon: 'Zap',
    is_repeatable: true,
    category: 'streaks',
    display_order: 5,
    trigger_condition: { event: 'win_streak', count: 5 },
  },
  {
    achievement_id: 'ten_dart_finish',
    name: '10-Dart Finish',
    description: 'Win an X01 match in 10 darts or fewer',
    rarity: 'epic',
    icon: 'Target',
    is_repeatable: true,
    category: 'x01',
    display_order: 6,
    trigger_condition: { event: 'match_win', game_type: 'x01', darts_thrown_max: 10 },
  },
  {
    achievement_id: 'grand_slam',
    name: 'Grand Slam',
    description: 'Win first match in all 3 game modes',
    rarity: 'epic',
    icon: 'Crown',
    is_repeatable: false,
    category: 'milestones',
    display_order: 7,
    trigger_condition: { event: 'first_win_all_modes', modes: ['x01', 'cricket', 'around_the_board'] },
  },
  {
    achievement_id: 'one_eighty',
    name: '180!',
    description: 'Score 180 points in a single round (three treble 20s)',
    rarity: 'epic',
    icon: 'Star',
    is_repeatable: true,
    category: 'scoring',
    display_order: 8,
    trigger_condition: { event: 'score_180', is_first: false },
  },

  // Rare (8) - display_order 9-16
  {
    achievement_id: 'twenty_five_plus_wins',
    name: '25+ Wins',
    description: 'Achieve 25 total match wins',
    rarity: 'rare',
    icon: 'Trophy',
    is_repeatable: false,
    category: 'milestones',
    display_order: 9,
    trigger_condition: { event: 'total_wins', count: 25 },
  },
  {
    achievement_id: 'comeback_kid',
    name: 'Comeback Kid',
    description: 'Win a match after being 100+ points behind',
    rarity: 'rare',
    icon: 'Rocket',
    is_repeatable: true,
    category: 'comebacks',
    display_order: 10,
    trigger_condition: { event: 'match_win', points_behind_min: 100 },
  },
  {
    achievement_id: 'hundred_point_round',
    name: '100-Point Round',
    description: 'Score 100+ points in a single round',
    rarity: 'rare',
    icon: 'Flame',
    is_repeatable: true,
    category: 'scoring',
    display_order: 11,
    trigger_condition: { event: 'round_score', points_min: 100 },
  },
  {
    achievement_id: 'triple_trouble',
    name: 'Triple Trouble',
    description: 'Score only with triples in a single round',
    rarity: 'rare',
    icon: 'Star',
    is_repeatable: true,
    category: 'technique',
    display_order: 12,
    trigger_condition: { event: 'round_score', only_triples: true },
  },
  {
    achievement_id: 'double_down',
    name: 'Double Down',
    description: 'Score only with doubles in a single round',
    rarity: 'rare',
    icon: 'Gem',
    is_repeatable: true,
    category: 'technique',
    display_order: 13,
    trigger_condition: { event: 'round_score', only_doubles: true },
  },
  {
    achievement_id: 'fifty_plus_average',
    name: '50+ Average',
    description: 'Score a 50+ average in a single leg',
    rarity: 'rare',
    icon: 'Medal',
    is_repeatable: true,
    category: 'averages',
    display_order: 14,
    trigger_condition: { event: 'leg_average', average_min: 50 },
  },
  {
    achievement_id: 'first_180',
    name: 'First 180',
    description: 'Score your first 180',
    rarity: 'rare',
    icon: 'Zap',
    is_repeatable: false,
    category: 'milestones',
    display_order: 15,
    trigger_condition: { event: 'score_180', is_first: true },
  },
  {
    achievement_id: 'bounce_back',
    name: 'Bounce Back',
    description: 'Lose first leg, then win the match',
    rarity: 'rare',
    icon: 'Shield',
    is_repeatable: true,
    category: 'comebacks',
    display_order: 16,
    trigger_condition: { event: 'match_win', lost_first_leg: true },
  },

  // Common (4) - display_order 17-20
  {
    achievement_id: 'first_win',
    name: 'First Win',
    description: 'Win your first match',
    rarity: 'common',
    icon: 'Trophy',
    is_repeatable: false,
    category: 'milestones',
    display_order: 17,
    trigger_condition: { event: 'match_win', count: 1 },
  },
  {
    achievement_id: 'first_20',
    name: 'First 20',
    description: 'Score a 20-point segment',
    rarity: 'common',
    icon: 'Target',
    is_repeatable: false,
    category: 'milestones',
    display_order: 18,
    trigger_condition: { event: 'segment_hit', segment: 20 },
  },
  {
    achievement_id: 'first_triple',
    name: 'First Triple',
    description: 'Hit a triple segment',
    rarity: 'common',
    icon: 'Star',
    is_repeatable: false,
    category: 'milestones',
    display_order: 19,
    trigger_condition: { event: 'triple_hit' },
  },
  {
    achievement_id: 'winning_streak',
    name: 'Winning Streak',
    description: 'Win 3 consecutive matches',
    rarity: 'common',
    icon: 'Flame',
    is_repeatable: true,
    category: 'streaks',
    display_order: 20,
    trigger_condition: { event: 'win_streak', count: 3 },
  },

  // Common (4 more) - display_order 21-24
  {
    achievement_id: 'first_double_bullseye',
    name: 'First Double Bulls-Eye',
    description: 'Score a double bull\'s-eye segment',
    rarity: 'common',
    icon: 'Target',
    is_repeatable: false,
    category: 'milestones',
    display_order: 21,
    trigger_condition: { event: 'bullseye_hit', is_double: true },
  },
  {
    achievement_id: 'practice_makes_perfect',
    name: 'Practice Makes Perfect',
    description: 'Play 10 matches total',
    rarity: 'common',
    icon: 'Repeat',
    is_repeatable: false,
    category: 'milestones',
    display_order: 22,
    trigger_condition: { event: 'total_matches_played', count: 10 },
  },
  {
    achievement_id: 'round_the_board',
    name: 'Round the Board',
    description: 'Hit 10 different numbered segments in a single leg',
    rarity: 'common',
    icon: 'Circle',
    is_repeatable: false,
    category: 'technique',
    display_order: 23,
    trigger_condition: { event: 'different_segments_hit', count: 10, per_leg: true },
  },
  {
    achievement_id: 'sharpshooter',
    name: 'Sharpshooter',
    description: 'Hit 10 bull\'s-eye segments total',
    rarity: 'common',
    icon: 'Crosshair',
    is_repeatable: false,
    category: 'technique',
    display_order: 24,
    trigger_condition: { event: 'bullseye_hit_count', count: 10 },
  },
];

export async function seedAchievements(): Promise<void> {
  try {
    for (const definition of ACHIEVEMENT_DEFINITIONS) {
      await Achievement.updateOne(
        { achievement_id: definition.achievement_id },
        { $set: definition },
        { upsert: true },
      );
    }
    // Retire definitions that no longer exist here, along with the unlocks pointing at them —
    // otherwise a removed achievement lingers in the collection forever and still counts towards
    // every player's "x of y unlocked" total.
    const live = ACHIEVEMENT_DEFINITIONS.map(definition => definition.achievement_id);
    await Achievement.deleteMany({ achievement_id: { $nin: live } });
    await UserAchievement.deleteMany({ achievement_id: { $nin: live } });
  } catch (error) {
    console.error('Failed to seed achievements:', error);
    throw error;
  }
}
