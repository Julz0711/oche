import type { Db, Document } from 'mongodb';

export type StatsPeriod = 'day' | 'week' | 'month' | 'all';
export interface PeriodStats {
  totalMatches: number; wins: number; losses: number; winRate: number;
  games: { gameId: string; totalMatches: number; wins: number; winRate: number }[];
  heatmap: Record<string, number>;
  dartsThrown: number;
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
  const periods = ['day', 'week', 'month', 'all'] as const;
  const matches = await db.collection('matches').find(
    { status: 'complete', $or: [{ mode: 'local', userId }, { mode: 'remote', 'players.userId': userId }] },
    { projection: { gameId: 1, mode: 1, winnerId: 1, completedAt: 1 } }
  ).toArray();
  const localIds = matches.filter(match => match.mode === 'local').map(match => match._id.toString());
  const remoteIds = matches.filter(match => match.mode === 'remote').map(match => match._id.toString());
  const visitFilters: Document[] = [];
  if (localIds.length) visitFilters.push({ matchId: { $in: localIds }, playerId: 'player1' });
  if (remoteIds.length) visitFilters.push({ matchId: { $in: remoteIds }, playerId: userId });
  const hits = visitFilters.length ? await db.collection('visits').aggregate([
    { $match: { $or: visitFilters } },
    { $unwind: '$throws' },
    { $match: { 'throws.ring': { $in: ['S', 'D', 'T', 'OB', 'IB', 'M'] } } },
    { $group: { _id: { matchId: '$matchId', ring: '$throws.ring', sector: '$throws.sector' }, count: { $sum: 1 } } },
  ]).toArray() : [];
  const board = {} as StatsBoard;
  for (const period of periods) {
    const included = matches.filter(match => {
      if (period === 'all') return true;
      const completedAt = match.completedAt instanceof Date ? match.completedAt : new Date(match.completedAt);
      return completedAt >= starts[period] && completedAt <= now;
    });
    const includedIds = new Set(included.map(match => match._id.toString()));
    const gameTotals = new Map<string, { totalMatches: number; wins: number }>();
    for (const match of included) {
      const game = gameTotals.get(match.gameId) ?? { totalMatches: 0, wins: 0 };
      game.totalMatches += 1;
      const playerId = match.mode === 'local' ? 'player1' : userId;
      if (match.winnerId === playerId) game.wins += 1;
      gameTotals.set(match.gameId, game);
    }
    const games = [...gameTotals]
      .sort(([a], [b]) => a.localeCompare(b))
      .map(([gameId, game]) => ({ gameId, ...game, winRate: Math.round(game.wins / game.totalMatches * 100) }));
    const totalMatches = games.reduce((sum, game) => sum + game.totalMatches, 0);
    const wins = games.reduce((sum, game) => sum + game.wins, 0);
    const heatmap: Record<string, number> = {};
    let dartsThrown = 0;
    for (const hit of hits) {
      if (!includedIds.has(String(hit._id.matchId))) continue;
      const ring = String(hit._id.ring);
      const sector = Number(hit._id.sector);
      const key = ring === 'M' ? 'M0' : `${ring}${sector}`;
      heatmap[key] = (heatmap[key] ?? 0) + hit.count;
      dartsThrown += hit.count;
    }
    board[period] = {
      totalMatches,
      wins,
      losses: totalMatches - wins,
      winRate: totalMatches ? Math.round(wins / totalMatches * 100) : 0,
      games,
      heatmap,
      dartsThrown,
    };
  }
  return board;
}
