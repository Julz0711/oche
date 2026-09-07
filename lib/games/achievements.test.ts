// lib/games/achievements.test.ts
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { ACHIEVEMENT_DEFINITIONS } from '@/lib/achievements/seed';
import type { Achievement, UserAchievement } from '@/lib/achievements/types';

/**
 * In-memory stand-ins for the three mongoose models the engine touches. They implement just
 * enough of the query surface the engine uses (`find`/`findOne`/`findOneAndUpdate`/`create`/
 * `countDocuments`, plus the `sort`/`limit`/`select`/`lean` chain) to exercise the real unlock
 * logic without a database.
 */
interface StoredMatch {
  gameId?: string;
  winnerId?: string | null;
  userId?: string;
  status: string;
}

const store: { userAchievements: UserAchievement[]; matches: StoredMatch[] } = {
  userAchievements: [],
  matches: [],
};

/** Chainable no-op query wrapper: every method returns `this`, `lean()` resolves the value. */
function query<T>(value: T) {
  const chain = {
    sort: () => chain,
    limit: () => chain,
    select: () => chain,
    lean: async () => value,
    then: (resolve: (v: T) => unknown) => Promise.resolve(value).then(resolve),
  };
  return chain;
}

function matchesUser(match: StoredMatch, userId: string): boolean {
  return match.userId === userId;
}

vi.mock('@/lib/db/models', () => {
  return {
    Achievement: {
      find: () => query(ACHIEVEMENT_DEFINITIONS),
    },
    UserAchievement: {
      find: (filter: { user_id: string }) =>
        query(store.userAchievements.filter((ua) => ua.user_id === filter.user_id)),
      findOne: (filter: { user_id: string; achievement_id: string }) =>
        query(
          store.userAchievements.find(
            (ua) => ua.user_id === filter.user_id && ua.achievement_id === filter.achievement_id
          ) ?? null
        ),
      findOneAndUpdate: (filter: { user_id: string; achievement_id: string }) => {
        const existing = store.userAchievements.find(
          (ua) => ua.user_id === filter.user_id && ua.achievement_id === filter.achievement_id
        );
        if (existing) {
          existing.count += 1;
          return query(existing);
        }
        const created: UserAchievement = {
          user_id: filter.user_id,
          achievement_id: filter.achievement_id,
          unlocked_at: new Date(),
          count: 1,
        };
        store.userAchievements.push(created);
        return query(created);
      },
      create: async (doc: { user_id: string; achievement_id: string; count: number }) => {
        const created: UserAchievement = { ...doc, unlocked_at: new Date() };
        store.userAchievements.push(created);
        return { toObject: () => created };
      },
    },
    Match: {
      countDocuments: async (filter: {
        status: string;
        winnerId?: string;
        $or?: { userId?: string }[];
      }) => {
        const userId = filter.$or?.[0]?.userId;
        return store.matches.filter(
          (m) =>
            m.status === filter.status &&
            (userId === undefined || matchesUser(m, userId)) &&
            (filter.winnerId === undefined || m.winnerId === filter.winnerId)
        ).length;
      },
      find: (filter: { status: string; $or?: { userId?: string }[] }) => {
        const userId = filter.$or?.[0]?.userId;
        return query(
          store.matches.filter(
            (m) => m.status === filter.status && (userId === undefined || matchesUser(m, userId))
          )
        );
      },
    },
  };
});

const {
  evaluateAchievements,
  evaluateVisitAchievements,
  getAchievementDefinitions,
  getUserAchievements,
} = await import('./achievements');

const USER = 'user-1';

function ids(achievements: Achievement[]): string[] {
  return achievements.map((a) => a.achievement_id);
}

/** Push `count` completed matches, newest first in the store's natural order. */
function seedMatches(wins: boolean[], gameId = 'x01'): void {
  store.matches = wins.map((won) => ({
    status: 'complete',
    gameId,
    userId: USER,
    winnerId: won ? USER : 'other',
  }));
}

beforeEach(() => {
  store.userAchievements = [];
  store.matches = [];
});

describe('getAchievementDefinitions / getUserAchievements', () => {
  it('returns all seeded definitions', async () => {
    const definitions = await getAchievementDefinitions();
    expect(definitions).toHaveLength(ACHIEVEMENT_DEFINITIONS.length);
  });

  it('returns only the requested user progress', async () => {
    store.userAchievements = [
      { user_id: USER, achievement_id: 'first_win', unlocked_at: new Date(), count: 1 },
      { user_id: 'other', achievement_id: 'first_win', unlocked_at: new Date(), count: 1 },
    ];
    const progress = await getUserAchievements(USER);
    expect(progress).toHaveLength(1);
    expect(progress[0].user_id).toBe(USER);
  });
});

describe('evaluateAchievements — match completion', () => {
  it('awards first_win to the winner exactly once', async () => {
    seedMatches([true]);
    const first = await evaluateAchievements({ winnerId: USER, gameId: 'x01' }, USER);
    expect(ids(first)).toContain('first_win');

    const second = await evaluateAchievements({ winnerId: USER, gameId: 'x01' }, USER);
    expect(ids(second)).not.toContain('first_win');
  });

  it('awards nothing win-gated to a loser', async () => {
    seedMatches([false]);
    const unlocked = await evaluateAchievements({ winnerId: 'other', gameId: 'x01' }, USER);
    expect(ids(unlocked)).not.toContain('first_win');
    expect(ids(unlocked)).not.toContain('winning_streak');
  });

  it('awards the 3-win streak at 3 consecutive wins but not at 4', async () => {
    seedMatches([true, true, true, false]);
    expect(ids(await evaluateAchievements({ winnerId: USER }, USER))).toContain('winning_streak');

    store.userAchievements = [];
    seedMatches([true, true, true, true, false]);
    expect(ids(await evaluateAchievements({ winnerId: USER }, USER))).not.toContain(
      'winning_streak'
    );
  });

  it('re-awards the repeatable 3-win streak at 6 consecutive wins', async () => {
    seedMatches([true, true, true, true, true, true, false]);
    const unlocked = await evaluateAchievements({ winnerId: USER }, USER);
    expect(ids(unlocked)).toContain('winning_streak');
    // 6 is not a multiple of 5, so the 5-win streak does not re-trigger here.
    expect(ids(unlocked)).not.toContain('five_win_streak');
  });

  it('awards the 25-win milestone once the threshold is reached', async () => {
    seedMatches(Array.from({ length: 25 }, () => true));
    const unlocked = await evaluateAchievements({ winnerId: USER }, USER);
    expect(ids(unlocked)).toContain('twenty_five_plus_wins');
    expect(ids(unlocked)).toContain('practice_makes_perfect');
  });

  it('awards a 9-dart finish only for an x01 win in 9 darts', async () => {
    seedMatches([true]);
    const unlocked = await evaluateAchievements(
      { winnerId: USER, gameId: 'x01', dartsThrown: 9 },
      USER
    );
    expect(ids(unlocked)).toContain('nine_dart_finish');
    expect(ids(unlocked)).toContain('ten_dart_finish');

    store.userAchievements = [];
    const cricket = await evaluateAchievements(
      { winnerId: USER, gameId: 'cricket', dartsThrown: 9 },
      USER
    );
    expect(ids(cricket)).not.toContain('nine_dart_finish');
  });

  it('awards comeback and bounce-back achievements from match signals', async () => {
    seedMatches([true]);
    const unlocked = await evaluateAchievements(
      { winnerId: USER, gameId: 'x01', maxPointsBehind: 140, lostFirstLeg: true },
      USER
    );
    expect(ids(unlocked)).toContain('comeback_kid');
    expect(ids(unlocked)).toContain('bounce_back');
  });

  it('skips checks whose signals are absent', async () => {
    seedMatches([true]);
    const unlocked = await evaluateAchievements({ winnerId: USER, gameId: 'x01' }, USER);
    expect(ids(unlocked)).not.toContain('comeback_kid');
    expect(ids(unlocked)).not.toContain('bounce_back');
    expect(ids(unlocked)).not.toContain('fifty_plus_average');
    expect(ids(unlocked)).not.toContain('nine_dart_finish');
  });
});

describe('evaluateVisitAchievements', () => {
  it('awards 180 achievements and increments the repeatable count', async () => {
    const visit = {
      throws: [
        { sector: 20, ring: 'T', points: 60 },
        { sector: 20, ring: 'T', points: 60 },
        { sector: 20, ring: 'T', points: 60 },
      ],
    };
    const first = await evaluateVisitAchievements(visit, USER);
    expect(ids(first)).toEqual(
      expect.arrayContaining(['triple_20', 'one_eighty', 'first_180', 'hundred_point_round'])
    );

    const second = await evaluateVisitAchievements(visit, USER);
    expect(ids(second)).toContain('triple_20');
    expect(ids(second)).not.toContain('first_180'); // one-time

    const triple20 = store.userAchievements.find((ua) => ua.achievement_id === 'triple_20');
    expect(triple20?.count).toBe(2);
  });

  it('awards the 100-point round without a 180', async () => {
    const unlocked = await evaluateVisitAchievements({ score: 100, throws: [] }, USER);
    expect(ids(unlocked)).toContain('hundred_point_round');
    expect(ids(unlocked)).not.toContain('triple_20');
  });

  it('prefers an explicit score over the summed throws', async () => {
    const unlocked = await evaluateVisitAchievements(
      { score: 45, throws: [{ sector: 20, ring: 'T', points: 60 }] },
      USER
    );
    expect(ids(unlocked)).not.toContain('hundred_point_round');
  });

  it('skips score achievements on a busted visit but keeps segment milestones', async () => {
    const unlocked = await evaluateVisitAchievements(
      {
        busted: true,
        throws: [
          { sector: 20, ring: 'T', points: 60 },
          { sector: 20, ring: 'T', points: 60 },
          { sector: 20, ring: 'T', points: 60 },
        ],
      },
      USER
    );
    expect(ids(unlocked)).not.toContain('triple_20');
    expect(ids(unlocked)).toContain('first_triple');
  });

  it('awards triple-only and double-only rounds', async () => {
    const triples = await evaluateVisitAchievements(
      {
        throws: [
          { sector: 5, ring: 'T', points: 15 },
          { sector: 1, ring: 'T', points: 3 },
        ],
      },
      USER
    );
    expect(ids(triples)).toContain('triple_trouble');

    store.userAchievements = [];
    const doubles = await evaluateVisitAchievements(
      {
        throws: [
          { sector: 5, ring: 'D', points: 10 },
          { sector: 1, ring: 'D', points: 2 },
        ],
      },
      USER
    );
    expect(ids(doubles)).toContain('double_down');
    expect(ids(doubles)).not.toContain('triple_trouble');
  });

  it('awards single-dart milestones once each', async () => {
    const visit = {
      throws: [
        { sector: 20, ring: 'S', points: 20 },
        { sector: 25, ring: 'IB', points: 50 },
      ],
    };
    const first = await evaluateVisitAchievements(visit, USER);
    expect(ids(first)).toEqual(
      expect.arrayContaining(['first_20', 'first_double_bullseye'])
    );

    const second = await evaluateVisitAchievements(visit, USER);
    expect(ids(second)).not.toContain('first_20');
    expect(ids(second)).not.toContain('first_double_bullseye');
  });

  it('ignores misses when judging segment milestones', async () => {
    const unlocked = await evaluateVisitAchievements(
      { throws: [{ sector: 20, ring: 'M', points: 0 }] },
      USER
    );
    expect(ids(unlocked)).toHaveLength(0);
  });
});
