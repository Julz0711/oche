// lib/achievements/types.ts
/**
 * Shared types for the achievement system.
 *
 * The mongoose models in `lib/db/models.ts` are untyped (they are created with
 * `mongoose.model(...)` and carry no document generics), so these interfaces are the
 * authoritative shapes for anything the achievement engine reads or returns.
 */

/** Rarity tiers, mirroring the enum on the Achievement schema. */
export type AchievementRarity = 'common' | 'rare' | 'epic' | 'legendary';

/** An achievement definition, as seeded into the `achievements` collection. */
export interface Achievement {
  achievement_id: string;
  name: string;
  description: string;
  rarity: AchievementRarity;
  icon: string;
  is_repeatable: boolean;
  category: string;
  display_order: number;
  trigger_condition: Record<string, unknown>;
  created_at?: Date;
}

/** A user's progress against a single achievement. */
export interface UserAchievement {
  user_id: string;
  achievement_id: string;
  unlocked_at: Date;
  last_unlocked_at?: Date;
  count: number;
  progress_data?: Record<string, unknown> | null;
}

/**
 * Data describing one completed match, passed to `evaluateAchievements`.
 *
 * Only `winnerId` and `gameId` come straight off the persisted Match document; the remaining
 * fields are optional signals the caller may compute from match state. An absent field simply
 * means "unknown", and every check that depends on it is skipped — no achievement is ever
 * awarded on missing data.
 */
export interface MatchData {
  /** Match document id, when known. */
  matchId?: string;
  /** Registry game id: 'x01' | 'cricket' | 'copycat'. */
  gameId?: string;
  /** Winner of the match, or null for an abandoned/drawn match. */
  winnerId?: string | null;
  /** Total darts thrown by `userId` across the match. */
  dartsThrown?: number;
  /** Largest deficit `userId` came back from, in points. */
  maxPointsBehind?: number;
  /** Whether `userId` lost the opening leg of the match. */
  lostFirstLeg?: boolean;
  /** Number of legs `userId` conceded during the match. */
  legsLost?: number;
  /** `userId`'s best single-leg three-dart average in the match. */
  bestLegAverage?: number;
  /** Cricket only: the leg was won hitting nothing but still-required numbers. */
  cricketOnlyRequiredNumbers?: boolean;
}

/** One dart within a visit, as the achievement engine needs to see it. */
export interface VisitThrowData {
  sector?: number;
  /** 'S' | 'D' | 'T' | 'OB' | 'IB' | 'M' */
  ring?: string;
  points: number;
  order?: number;
}

/**
 * A single completed visit (turn), passed to `evaluateVisitAchievements`.
 *
 * `score` wins when supplied; otherwise the visit total is summed from `throws`.
 */
export interface VisitData {
  throws?: VisitThrowData[];
  score?: number;
  busted?: boolean;
  isCheckout?: boolean;
}
