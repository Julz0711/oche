import { beforeAll, afterAll, describe, expect, it } from 'vitest';
import { MongoClient, ObjectId, type Db } from 'mongodb';
import { getStatsBoard } from './board';
const uri = process.env.OCHE_TEST_MONGODB_URI;
describe.skipIf(!uri)('statistics database aggregation', () => {
  let client: MongoClient; let db: Db;
  beforeAll(async () => { client = new MongoClient(uri!); await client.connect(); db = client.db(`oche_stats_test_${new ObjectId()}`); });
  afterAll(async () => { if (db?.databaseName.startsWith('oche_stats_test_')) await db.dropDatabase(); await client?.close(); });
  it('includes local and remote results, filters calendar periods, and excludes other players and unfinished matches', async () => {
    const local = { mode: 'local', userId: 'alice', status: 'complete', gameId: 'x01' };
    const remote = { mode: 'remote', players: [{ userId: 'alice' }], status: 'complete', gameId: 'cricket' };
    const inserted = await db.collection('matches').insertMany([
      { ...remote, completedAt: new Date('2026-09-09T11:00Z'), winnerId: 'alice' },
      { ...local, completedAt: new Date('2026-09-07T00:00Z'), winnerId: 'player2' },
      { ...remote, completedAt: new Date('2026-09-01T00:00Z'), winnerId: 'alice' },
      { ...local, completedAt: new Date('2026-09-06T23:59:59Z'), winnerId: 'player2' },
      { ...local, completedAt: new Date('2026-08-31T23:59:59Z'), winnerId: 'player1' },
      { ...local, status: 'live', completedAt: new Date('2026-09-09T10:00Z') },
      { ...remote, players: [{ userId: 'bob' }], hostId: 'alice', completedAt: new Date('2026-09-09T10:00Z') },
      { ...local, userId: 'bob', completedAt: new Date('2026-09-09T10:00Z') },
    ]);
    await db.collection('visits').insertMany([
      { matchId: inserted.insertedIds[0].toString(), playerId: 'alice', throws: [{ ring: 'T', sector: 20 }, { ring: 'S', sector: 1 }, { ring: 'M', sector: 0 }] },
      { matchId: inserted.insertedIds[0].toString(), playerId: 'opponent', throws: [{ ring: 'T', sector: 20 }] },
      { matchId: inserted.insertedIds[1].toString(), playerId: 'player1', throws: [{ ring: 'D', sector: 20 }] },
      { matchId: inserted.insertedIds[1].toString(), playerId: 'player2', throws: [{ ring: 'IB', sector: 25 }] },
      { matchId: inserted.insertedIds[6].toString(), playerId: 'alice', throws: [{ ring: 'T', sector: 19 }] },
    ]);
    const board = await getStatsBoard(db, 'alice', new Date('2026-09-09T12:00Z'));
    expect(board.day).toMatchObject({ totalMatches: 1, wins: 1, losses: 0, winRate: 100 });
    expect(board.week).toMatchObject({ totalMatches: 2, wins: 1, losses: 1, winRate: 50 });
    expect(board.month).toMatchObject({ totalMatches: 4, wins: 2, losses: 2, winRate: 50 });
    expect(board.all).toMatchObject({ totalMatches: 5, wins: 3, losses: 2, winRate: 60 });
    expect(board.all.games).toEqual([{ gameId: 'cricket', totalMatches: 2, wins: 2, winRate: 100 }, { gameId: 'x01', totalMatches: 3, wins: 1, winRate: 33 }]);
    expect(board.day).toMatchObject({ dartsThrown: 3, heatmap: { T20: 1, S1: 1, M0: 1 } });
    expect(board.week).toMatchObject({ dartsThrown: 4, heatmap: { T20: 1, S1: 1, M0: 1, D20: 1 } });
    expect((await getStatsBoard(db, 'unknown')).all.totalMatches).toBe(0);
  });
});
