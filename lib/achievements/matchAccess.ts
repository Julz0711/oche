// lib/achievements/matchAccess.ts
/**
 * Shared plumbing for the two achievement-evaluation routes (match completion and per-visit).
 *
 * Both need the same two things: a check that the caller actually took part in the match they are
 * claiming achievements from, and the per-user unlock count attached to each newly unlocked
 * achievement so a repeatable one's toast can render "(xN)".
 */
import { getUserAchievements } from '@/lib/games/achievements';
import type { Achievement } from './types';

/** An unlocked achievement plus the user's running count for it (1 for one-time achievements). */
export interface UnlockedAchievement extends Achievement {
  count: number;
}

/** The subset of a persisted Match document these helpers read. */
export interface MatchDoc {
  _id: unknown;
  gameId?: string;
  mode?: string;
  status?: string;
  userId?: string;
  hostId?: string;
  winnerId?: string | null;
  players?: { userId?: string }[];
}

/** Whether `userId` took part in this match and may therefore earn achievements from it. */
export function isParticipant(match: MatchDoc, userId: string): boolean {
  if (match.userId === userId || match.hostId === userId) return true;
  return (match.players ?? []).some((player) => player.userId === userId);
}

/** Attach each unlocked achievement's current per-user count for the toast's "(xN)" suffix. */
export async function withCounts(
  unlocked: Achievement[],
  userId: string
): Promise<UnlockedAchievement[]> {
  if (unlocked.length === 0) return [];
  const userAchievements = await getUserAchievements(userId);
  return unlocked.map((achievement) => ({
    ...achievement,
    count:
      userAchievements.find((entry) => entry.achievement_id === achievement.achievement_id)?.count ??
      1,
  }));
}
