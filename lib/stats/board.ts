import type { Db, Document } from 'mongodb';
import { resolveYourPlayerId } from '@/lib/matchHistory';
import { MatchPlayerDoc } from '@/lib/matchLobby';
import { PlayerId, Throw } from '@/lib/types';
import {
  aggregateX01Stats, X01AggregateStats,
  aggregateCricketStats, CricketAggregateStats,
  aggregateCopycatStats, CopycatAggregateStats,
} from './aggregateGameStats';

export type StatsPeriod = 'day' | 'week' | 'month' | 'all';
export interface PeriodStats {
  totalMatches: number; wins: number; losses: number; winRate: number;
  games: { gameId: string; totalMatches: number; wins: number; winRate: number }[];
  heatmap: Record<string, number>;
  dartsThrown: number;
  /** Cross-match, properly-weighted play-style stats per game — null when the period has no
   *  completed matches of that game (nothing to show, not a zeroed board). */
  x01: X01AggregateStats | null;
  cricket: CricketAggregateStats | null;
  copycat: CopycatAggregateStats | null;
}
export type StatsBoard = Record<StatsPeriod, PeriodStats>;

/** A visit-history entry as every game module's engine actually shapes it — a superset of the
 *  fields any one game reads (see lib/games/{x01,cricket,copycat}/matchStats.ts). Kept loose
 *  (not importing each engine's internal entry type, which isn't exported) since this file only
 *  ever reads it, never constructs or validates it. */
interface VisitHistoryEntry {
  playerId: string;
  throws: Throw[];
  scoreBefore: number;
  scoreAfter: number;
  busted?: boolean;
  wasCheckout?: boolean;
  targetBefore?: number | null;
  total?: number;
  wasPointWin?: boolean;
  pointsWonBefore?: Record<string, number>;
  checkOut?: 'double' | 'straight' | 'master';
}

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
    { projection: { gameId: 1, mode: 1, winnerId: 1, completedAt: 1, state: 1, settings: 1, players: 1 } }
  ).toArray();
  const localIds = matches.filter(match => match.gameId === 'x01' && match.mode === 'local').map(match => match._id.toString());
  const remoteIds = matches.filter(match => match.gameId === 'x01' && match.mode === 'remote').map(match => match._id.toString());
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
    const x01Entries: VisitHistoryEntry[] = [];
    let x01MatchCount = 0;
    const cricketEntries: VisitHistoryEntry[] = [];
    const copycatMatches: { entries: VisitHistoryEntry[]; firstTo: number }[] = [];
    for (const match of included) {
      const state = match.state as { visitHistory?: VisitHistoryEntry[] } | undefined;
      if (!state?.visitHistory?.length) continue;
      const you = resolveYourPlayerId(
        { mode: match.mode, players: (match.players ?? []) as MatchPlayerDoc[] },
        userId
      );
      if (!you) continue;
      const entries = state.visitHistory.filter(entry => entry.playerId === you);
      if (entries.length === 0) continue;
      if (match.gameId === 'x01') {
        const checkOut = (match.settings as { checkOut?: unknown } | undefined)?.checkOut;
        const resolvedCheckOut: 'double' | 'straight' | 'master' =
          checkOut === 'straight' ? 'straight' : checkOut === 'master' ? 'master' : 'double';
        x01Entries.push(...entries.map(entry => ({ ...entry, checkOut: resolvedCheckOut })));
        x01MatchCount++;
      }
      else if (match.gameId === 'cricket') cricketEntries.push(...entries);
      else if (match.gameId === 'copycat') {
        const firstTo = Number((match.settings as { firstTo?: unknown } | undefined)?.firstTo) || 1;
        copycatMatches.push({ entries, firstTo });
      }
    }

    board[period] = {
      totalMatches,
      wins,
      losses: totalMatches - wins,
      winRate: totalMatches ? Math.round(wins / totalMatches * 100) : 0,
      games,
      heatmap,
      dartsThrown,
      x01: x01Entries.length
        ? aggregateX01Stats(x01Entries as (VisitHistoryEntry & { busted: boolean; wasCheckout: boolean; checkOut: 'double' | 'straight' | 'master' })[], x01MatchCount)
        : null,
      cricket: cricketEntries.length ? aggregateCricketStats(cricketEntries) : null,
      copycat: copycatMatches.length
        ? aggregateCopycatStats(copycatMatches.map(m => ({
            firstTo: m.firstTo,
            entries: m.entries as (VisitHistoryEntry & { playerId: PlayerId; targetBefore: number | null; total: number; wasPointWin: boolean; pointsWonBefore: Record<string, number> })[],
          })))
        : null,
    };
  }
  return board;
}
