import { afterAll, beforeAll, beforeEach, describe, expect, it } from 'vitest';
import { MongoClient, ObjectId, type Db } from 'mongodb';
import { changeFriend, headToHead, listFriends, requestFriend } from './repository';

// Opt-in: isolated disposable database. Never writes into the application's database.
const uri = process.env.OCHE_TEST_MONGODB_URI;
describe.skipIf(!uri)('friends database integration', () => {
  let client: MongoClient;
  let db: Db;
  const alice = new ObjectId().toString(), bob = new ObjectId().toString(), outsider = new ObjectId().toString();
  beforeAll(async () => {
    client = new MongoClient(uri!, { serverSelectionTimeoutMS: 8000 });
    await client.connect();
    db = client.db(`oche_friends_test_${Date.now()}_${new ObjectId()}`);
  }, 15000);
  beforeEach(async () => {
    await Promise.all(['users', 'friendships', 'socialProfiles', 'matches'].map(name => db.collection(name).deleteMany({})));
    await db.collection('users').insertMany([{ _id: new ObjectId(alice), name: 'Alice' }, { _id: new ObjectId(bob), name: 'Bob' }, { _id: new ObjectId(outsider), name: 'Other' }]);
  });
  afterAll(async () => {
    if (db && db.databaseName.startsWith('oche_friends_test_')) await db.dropDatabase();
    await client?.close();
  });
  async function befriend() {
    const b = await listFriends(db, bob);
    await requestFriend(db, alice, b.code);
    await changeFriend(db, bob, alice, 'accept');
  }
  it('creates a stable private code, deduplicates requests, and only allows the recipient to accept', async () => {
    const [a1, a2, b] = await Promise.all([listFriends(db, alice), listFriends(db, alice), listFriends(db, bob)]);
    expect(a1.code).toBe(a2.code);
    expect(a1.code).toMatch(/^[A-F0-9]{12}$/);
    await requestFriend(db, alice, b.code);
    await requestFriend(db, alice, b.code);
    expect((await listFriends(db, alice)).outgoing).toEqual([{ id: bob, name: 'Bob' }]);
    expect((await listFriends(db, bob)).incoming).toEqual([{ id: alice, name: 'Alice' }]);
    await expect(changeFriend(db, alice, bob, 'accept')).rejects.toMatchObject({ status: 409 });
    await expect(changeFriend(db, outsider, alice, 'accept')).rejects.toMatchObject({ status: 409 });
    await expect(headToHead(db, alice, bob, null)).rejects.toMatchObject({ status: 404 });
    await changeFriend(db, bob, alice, 'accept');
    expect((await listFriends(db, bob)).friends).toEqual([{ id: alice, name: 'Alice' }]);
    expect((await listFriends(db, alice)).friends).toEqual([{ id: bob, name: 'Bob' }]);
    await expect(requestFriend(db, alice, a1.code)).rejects.toMatchObject({ status: 400 });
  });
  it('handles concurrent cross-requests as one relationship and supports decline and cancel', async () => {
    const [a, b] = await Promise.all([listFriends(db, alice), listFriends(db, bob)]);
    await Promise.allSettled([requestFriend(db, alice, b.code), requestFriend(db, bob, a.code)]);
    const relation = await db.collection('friendships').findOne({});
    expect(await db.collection('friendships').countDocuments()).toBe(1);
    await changeFriend(db, relation!.recipient, relation!.requester, 'decline');
    await requestFriend(db, alice, b.code);
    await expect(changeFriend(db, bob, alice, 'cancel')).rejects.toMatchObject({ status: 409 });
    await changeFriend(db, alice, bob, 'cancel');
    expect((await listFriends(db, bob)).incoming).toHaveLength(0);
  });
  it('counts only verified one-on-one results, paginates by completion time, and keeps matches after removal', async () => {
    await befriend();
    const match = { mode: 'remote', status: 'complete', gameId: 'x01', players: [{ userId: alice }, { userId: bob }], winnerId: alice, completedAt: new Date() };
    await db.collection('matches').insertMany([
      ...Array.from({ length: 23 }, (_, i) => ({ ...match, completedAt: new Date(2026, 0, 23 - i), winnerId: i < 15 ? alice : bob })),
      { ...match, mode: 'local' }, { ...match, status: 'live' },
      { ...match, players: [...match.players, { userId: outsider }], winnerId: outsider },
    ]);
    const first = await headToHead(db, alice, bob, null);
    expect(first.summary).toEqual({ played: 23, wins: 15, losses: 8 });
    expect(first.matches).toHaveLength(20);
    expect(first.matches[0].completedAt).toBe(new Date(2026, 0, 23).toISOString());
    const next = await headToHead(db, alice, bob, first.nextCursor);
    expect(next.matches).toHaveLength(3);
    expect(next.nextCursor).toBe(null);
    expect(new Set([...first.matches, ...next.matches].map(m => m.id)).size).toBe(23);
    await expect(headToHead(db, outsider, bob, null)).rejects.toMatchObject({ status: 404 });
    await changeFriend(db, alice, bob, 'remove');
    expect(await db.collection('matches').countDocuments()).toBe(26);
    await expect(headToHead(db, alice, bob, null)).rejects.toMatchObject({ status: 404 });
  });
});
