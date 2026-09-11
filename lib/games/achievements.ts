// lib/games/achievements.ts
/**
 * Achievement checking engine.
 *
 * Two entry points:
 *  - `evaluateAchievements(matchData, userId)` — run once when a match completes.
 *  - `evaluateVisitAchievements(visit, userId)` — run per completed visit during play.
 *
 * Both return only the achievements that were *newly* unlocked by this call, so the caller can
 * fire toast notifications for them. One-time achievements are returned once and never again;
 * repeatable achievements are returned every time they trigger (their `count` is incremented).
 *
 * Every check is conservative: if the data needed to judge a condition is missing from
 * `matchData`/`visit`, the check is skipped rather than guessed at.
 */
import {
  Achievement as AchievementModel,
  UserAchievement as UserAchievementModel,
  Match as MatchModel,
} from '@/lib/db/models';
import type {
  Achievement,
  MatchData,
  UserAchievement,
  VisitData,
  VisitThrowData,
} from '@/lib/achievements/types';

/** How far back match history is scanned when computing a win streak. */
const STREAK_LOOKBACK = 100;

/** MongoDB duplicate-key error code, used to make one-time unlocks race-safe. */
const DUPLICATE_KEY = 11000;

/** Matches count toward a user's record when they are the owner, host, or a listed player. */
function matchOwnershipFilter(userId: string): Record<string, unknown> {
  return {
    $or: [{ userId }, { hostId: userId }, { 'players.userId': userId }],
  };
}

// ---------------------------------------------------------------------------
// Definitions & user progress
// ---------------------------------------------------------------------------

export async function getAchievementDefinitions(): Promise<Achievement[]> {
  const docs = await AchievementModel.find({}).sort({ display_order: 1 }).lean();
  return docs as unknown as Achievement[];
}

export async function getUserAchievements(userId: string): Promise<UserAchievement[]> {
  const docs = await UserAchievementModel.find({ user_id: userId }).lean();
  return docs as unknown as UserAchievement[];
}

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

/** Whether the user already holds this achievement (any count). */
async function isAchievementUnlocked(userId: string, achievementId: string): Promise<boolean> {
  const userAchievement = await UserAchievementModel.findOne({
    user_id: userId,
    achievement_id: achievementId,
  }).lean();
  return !!userAchievement;
}

/**
 * Unlock an achievement, or increment it when it is repeatable.
 *
 * Repeatable: upserts and `$inc`s `count` — first award lands at 1. `setDefaultsOnInsert` is
 * disabled so the schema default for `count` cannot collide with the `$inc` on insert.
 * One-time: returns the existing record untouched if there is one.
 */
async function unlockAchievement(
  userId: string,
  achievementId: string,
  isRepeatable: boolean
): Promise<UserAchievement> {
  if (isRepeatable) {
    const userAchievement = await UserAchievementModel.findOneAndUpdate(
      { user_id: userId, achievement_id: achievementId },
      { $inc: { count: 1 }, $set: { last_unlocked_at: new Date() }, $setOnInsert: { unlocked_at: new Date() } },
      { upsert: true, new: true, setDefaultsOnInsert: false }
    ).lean();
    return userAchievement as unknown as UserAchievement;
  }

  const existing = await UserAchievementModel.findOne({
    user_id: userId,
    achievement_id: achievementId,
  }).lean();
  if (existing) return existing as unknown as UserAchievement;

  try {
    const created = await UserAchievementModel.create({
      user_id: userId,
      achievement_id: achievementId,
      count: 1,
    });
    return created.toObject() as unknown as UserAchievement;
  } catch (error) {
    // Concurrent unlock of the same one-time achievement — the unique index rejected the
    // second write, so read back the winner instead of failing the evaluation run.
    if ((error as { code?: number })?.code === DUPLICATE_KEY) {
      const winner = await UserAchievementModel.findOne({
        user_id: userId,
        achievement_id: achievementId,
      }).lean();
      if (winner) return winner as unknown as UserAchievement;
    }
    throw error;
  }
}

/** Total completed matches won by the user. */
async function getUserWinCount(userId: string): Promise<number> {
  return MatchModel.countDocuments({
    ...matchOwnershipFilter(userId),
    status: 'complete',
    winnerId: userId,
  });
}

/** Total completed matches the user took part in. */
async function getUserMatchCount(userId: string): Promise<number> {
  return MatchModel.countDocuments({
    ...matchOwnershipFilter(userId),
    status: 'complete',
  });
}

interface CompletedMatchSummary {
  gameId?: string;
  winnerId?: string | null;
}

/** The user's most recently completed matches, newest first. */
async function getRecentCompletedMatches(userId: string): Promise<CompletedMatchSummary[]> {
  const docs = await MatchModel.find({ ...matchOwnershipFilter(userId), status: 'complete' })
    .sort({ completedAt: -1, createdAt: -1 })
    .limit(STREAK_LOOKBACK)
    .select('gameId winnerId completedAt createdAt')
    .lean();
  return docs as unknown as CompletedMatchSummary[];
}

/** Length of the user's current run of consecutive wins (0 if the latest match was a loss). */
function currentWinStreak(matches: CompletedMatchSummary[], userId: string): number {
  let streak = 0;
  for (const match of matches) {
    if (match.winnerId !== userId) break;
    streak += 1;
  }
  return streak;
}

/** Distinct game ids the user has won at least one completed match in. */
function wonGameIds(matches: CompletedMatchSummary[], userId: string): Set<string> {
  const ids = new Set<string>();
  for (const match of matches) {
    if (match.winnerId === userId && match.gameId) ids.add(match.gameId);
  }
  return ids;
}

/** Read a numeric field out of a seeded `trigger_condition`, falling back when absent. */
function conditionNumber(
  definition: Achievement | undefined,
  key: string,
  fallback: number
): number {
  const value = definition?.trigger_condition?.[key];
  return typeof value === 'number' ? value : fallback;
}

/** Read a string-array field out of a seeded `trigger_condition`. */
function conditionStrings(definition: Achievement | undefined, key: string): string[] {
  const value = definition?.trigger_condition?.[key];
  return Array.isArray(value) ? value.filter((entry): entry is string => typeof entry === 'string') : [];
}

/**
 * Award `definition` to the user and record it in `unlocked` if this is a new unlock.
 * One-time achievements already held are silently skipped.
 */
async function award(
  userId: string,
  definition: Achievement,
  unlocked: Achievement[]
): Promise<void> {
  if (!definition.is_repeatable) {
    if (await isAchievementUnlocked(userId, definition.achievement_id)) return;
  }
  await unlockAchievement(userId, definition.achievement_id, definition.is_repeatable);
  unlocked.push(definition);
}

/** Index definitions by id for O(1) lookup during evaluation. */
function indexDefinitions(definitions: Achievement[]): Map<string, Achievement> {
  return new Map(definitions.map((definition) => [definition.achievement_id, definition]));
}

// ---------------------------------------------------------------------------
// Match-completion evaluation
// ---------------------------------------------------------------------------

/**
 * Evaluate every match-completion achievement for `userId`.
 *
 * Safe to call for losers as well as winners — win-gated checks test `matchData.winnerId`
 * themselves, and per-user milestones (matches played) apply either way.
 */
export async function evaluateAchievements(
  matchData: MatchData,
  userId: string
): Promise<Achievement[]> {
  const newAchievements: Achievement[] = [];
  const byId = indexDefinitions(await getAchievementDefinitions());
  const isWinner = matchData.winnerId === userId;

  // --- First win -----------------------------------------------------------
  const firstWin = byId.get('first_win');
  if (firstWin && isWinner) {
    await award(userId, firstWin, newAchievements);
  }

  // --- Win streaks (3 / 5 / 10 consecutive) --------------------------------
  // Repeatable streak awards re-trigger at every multiple of their threshold, so a run of six
  // wins awards the 3-win streak twice; one-time ones award on the first qualifying run.
  if (isWinner) {
    const recent = await getRecentCompletedMatches(userId);
    const streak = currentWinStreak(recent, userId);

    for (const id of ['winning_streak', 'five_win_streak', 'unstoppable']) {
      const definition = byId.get(id);
      if (!definition) continue;
      const required = conditionNumber(definition, 'count', 0);
      if (required <= 0 || streak <= 0) continue;
      const qualifies = definition.is_repeatable ? streak % required === 0 : streak >= required;
      if (qualifies) await award(userId, definition, newAchievements);
    }

    // --- Grand slam: a first win in every listed game mode ------------------
    const grandSlam = byId.get('grand_slam');
    if (grandSlam) {
      const requiredModes = conditionStrings(grandSlam, 'modes');
      const won = wonGameIds(recent, userId);
      if (requiredModes.length > 0 && requiredModes.every((mode) => won.has(mode))) {
        await award(userId, grandSlam, newAchievements);
      }
    }
  }

  // --- Total wins milestone ------------------------------------------------
  const totalWins = byId.get('twenty_five_plus_wins');
  if (totalWins) {
    const required = conditionNumber(totalWins, 'count', 25);
    if ((await getUserWinCount(userId)) >= required) {
      await award(userId, totalWins, newAchievements);
    }
  }

  // --- Total matches played milestone --------------------------------------
  const played = byId.get('practice_makes_perfect');
  if (played) {
    const required = conditionNumber(played, 'count', 10);
    if ((await getUserMatchCount(userId)) >= required) {
      await award(userId, played, newAchievements);
    }
  }

  // --- Dart-count finishes (X01) -------------------------------------------
  if (isWinner && typeof matchData.dartsThrown === 'number' && matchData.gameId === 'x01') {
    const nineDart = byId.get('nine_dart_finish');
    if (nineDart && matchData.dartsThrown <= conditionNumber(nineDart, 'darts_thrown', 9)) {
      await award(userId, nineDart, newAchievements);
    }
    const tenDart = byId.get('ten_dart_finish');
    if (tenDart && matchData.dartsThrown <= conditionNumber(tenDart, 'darts_thrown_max', 10)) {
      await award(userId, tenDart, newAchievements);
    }
  }

  // --- Comebacks -----------------------------------------------------------
  const comeback = byId.get('comeback_kid');
  if (comeback && isWinner && typeof matchData.maxPointsBehind === 'number') {
    if (matchData.maxPointsBehind >= conditionNumber(comeback, 'points_behind_min', 100)) {
      await award(userId, comeback, newAchievements);
    }
  }

  const bounceBack = byId.get('bounce_back');
  if (bounceBack && isWinner && matchData.lostFirstLeg === true) {
    await award(userId, bounceBack, newAchievements);
  }

  // --- Leg average ---------------------------------------------------------
  const legAverage = byId.get('fifty_plus_average');
  if (legAverage && typeof matchData.bestLegAverage === 'number') {
    if (matchData.bestLegAverage >= conditionNumber(legAverage, 'average_min', 50)) {
      await award(userId, legAverage, newAchievements);
    }
  }

  // --- Cricket god ---------------------------------------------------------
  const cricketGod = byId.get('cricket_god');
  if (
    cricketGod &&
    isWinner &&
    matchData.gameId === 'cricket' &&
    matchData.cricketOnlyRequiredNumbers === true
  ) {
    await award(userId, cricketGod, newAchievements);
  }

  return newAchievements;
}

// ---------------------------------------------------------------------------
// Per-visit evaluation
// ---------------------------------------------------------------------------

/** Total points scored in a visit: the caller's `score` if given, else summed from throws. */
function visitScore(visit: VisitData): number {
  if (typeof visit.score === 'number') return visit.score;
  return (visit.throws ?? []).reduce(
    (sum, dart) => sum + (typeof dart.points === 'number' ? dart.points : 0),
    0
  );
}

/** Darts that actually landed on a scoring bed (misses excluded). */
function scoringThrows(visit: VisitData): VisitThrowData[] {
  return (visit.throws ?? []).filter((dart) => dart.ring !== undefined && dart.ring !== 'M');
}

/**
 * Evaluate per-visit achievements — round scores and single-dart milestones.
 *
 * Score-based checks are skipped on a busted visit (those points never counted), while
 * segment-hit milestones still apply: the dart landed regardless of what the bust did to the
 * score.
 */
export async function evaluateVisitAchievements(
  visit: VisitData,
  userId: string
): Promise<Achievement[]> {
  const newAchievements: Achievement[] = [];
  const byId = indexDefinitions(await getAchievementDefinitions());
  const throws = visit.throws ?? [];
  const landed = scoringThrows(visit);
  const roundScore = visitScore(visit);
  const busted = visit.busted === true;

  // --- Score-based round achievements --------------------------------------
  if (!busted) {
    const oneEighty = byId.get('one_eighty');
    const oneEightyPoints = conditionNumber(oneEighty, 'points', 180);

    if (roundScore >= oneEightyPoints) {
      if (oneEighty) await award(userId, oneEighty, newAchievements);

      const first180 = byId.get('first_180');
      if (first180) await award(userId, first180, newAchievements);
    }

    const hundred = byId.get('hundred_point_round');
    if (hundred && roundScore >= conditionNumber(hundred, 'points_min', 100)) {
      await award(userId, hundred, newAchievements);
    }

    // Rounds thrown entirely with triples / doubles (misses count against it: the dart has to
    // land on the named ring for the round to be "only triples").
    if (throws.length > 0) {
      const tripleTrouble = byId.get('triple_trouble');
      if (tripleTrouble && throws.every((dart) => dart.ring === 'T')) {
        await award(userId, tripleTrouble, newAchievements);
      }

      const doubleDown = byId.get('double_down');
      if (doubleDown && throws.every((dart) => dart.ring === 'D')) {
        await award(userId, doubleDown, newAchievements);
      }
    }
  }

  // --- Single-dart milestones (count even on a bust) -----------------------
  const first20 = byId.get('first_20');
  if (first20 && landed.some((dart) => dart.ring === 'S' && dart.sector === 20)) {
    await award(userId, first20, newAchievements);
  }

  const firstTriple = byId.get('first_triple');
  if (firstTriple && landed.some((dart) => dart.ring === 'T')) {
    await award(userId, firstTriple, newAchievements);
  }

  const doubleBull = byId.get('first_double_bullseye');
  if (doubleBull && landed.some((dart) => dart.ring === 'IB')) {
    await award(userId, doubleBull, newAchievements);
  }

  return newAchievements;
}
