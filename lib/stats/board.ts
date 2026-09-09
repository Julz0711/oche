import type { Db, Document } from 'mongodb';

export type StatsPeriod = 'day' | 'week' | 'month' | 'all';
export interface PeriodStats {
  totalMatches: number; wins: number; losses: number; winRate: number;
  games: { gameId: string; totalMatches: number; wins: number; winRate: number }[];
}
export type StatsBoard = Record<StatsPeriod, PeriodStats>;

/** Calendar periods in UTC; weeks start on Monday. The UI labels this explicitly. */
export function periodStarts(now: Date) {
  const day = new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), now.getUTCDate()));
  const week = new Date(day);
  week.setUTCDate(week.getUTCDate() - (week.getUTCDay() + 6) % 7);
  return { day, week, month: new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), 1)) };
}

export async function getStatsBoard(db: Db, userId: string, now = new Date()): Promise<StatsBoard> {
  const starts = periodStarts(now);
  const facets: Record<string, Document[]> = {};
  for (const period of ['day', 'week', 'month', 'all'] as const) {
    facets[period] = [
      ...(period === 'all' ? [] : [{ $match: { completedAt: { $gte: starts[period], $lte: now } } }]),
      { $group: { _id: '$gameId', totalMatches: { $sum: 1 }, wins: { $sum: { $cond: ['$won', 1, 0] } } } },
      { $sort: { _id: 1 } },
    ];
  }
  const [result] = await db.collection('matches').aggregate([
    { $match: { status: 'complete', $or: [{ mode: 'local', userId }, { mode: 'remote', 'players.userId': userId }] } },
    { $project: { gameId: 1, completedAt: 1, won: { $eq: ['$winnerId', { $cond: [{ $eq: ['$mode', 'local'] }, 'player1', userId] }] } } },
    { $facet: facets },
  ]).toArray();
  const board = {} as StatsBoard;
  for (const period of ['day', 'week', 'month', 'all'] as const) {
    const games = (result?.[period] ?? []).map((g: { _id: string; totalMatches: number; wins: number }) => ({
      gameId: g._id, totalMatches: g.totalMatches, wins: g.wins, winRate: Math.round(g.wins / g.totalMatches * 100),
    }));
    const totalMatches = games.reduce((sum: number, g: { totalMatches: number }) => sum + g.totalMatches, 0);
    const wins = games.reduce((sum: number, g: { wins: number }) => sum + g.wins, 0);
    board[period] = { totalMatches, wins, losses: totalMatches - wins, winRate: totalMatches ? Math.round(wins / totalMatches * 100) : 0, games };
  }
  return board;
}
