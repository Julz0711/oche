import { beforeAll, beforeEach, afterAll, describe, expect, it, vi } from 'vitest';
import mongoose from 'mongoose';
import { NextRequest } from 'next/server';

const actor = vi.hoisted(() => ({ id: 'host' }));
vi.mock('@/lib/identity', () => ({ getIdentity: async () => ({ identity: { id: actor.id, type: 'guest' } }) }));
vi.mock('@/lib/db', () => ({ connectDB: async () => {} }));
import { Match } from '@/lib/db/models';
import { POST } from '@/app/api/matches/[id]/rematch/route';

const uri = process.env.OCHE_TEST_MONGODB_URI;
describe.skipIf(!uri)('same-room rematches', () => {
  beforeAll(async () => {
    await mongoose.connect(uri!, { dbName: `oche_rematch_test_${new mongoose.Types.ObjectId()}`, serverSelectionTimeoutMS: 8000 });
  });
  beforeEach(async () => { actor.id = 'host'; await Match.deleteMany({}); });
  afterAll(async () => {
    if (mongoose.connection.name?.startsWith('oche_rematch_test_')) await mongoose.connection.dropDatabase();
    await mongoose.disconnect();
  });
  const settings = { firstTo: 3 };
  async function finished(extra = {}) {
    return Match.create({ gameId: 'x01', settings: { startingScore: 301 }, mode: 'remote', status: 'complete',
      roomCode: 'ABC234', hostId: 'host', winnerId: 'host', state: { result: 'unchanged' },
      players: [{ guestId: 'host', name: 'Host', isGuest: true }, { userId: 'opponent', name: 'Opponent', isGuest: false }], ...extra });
  }
  async function request(id: string, body: unknown = { gameId: 'cricket', settings }) {
    return POST(new NextRequest('http://localhost/api/rematch', { method: 'POST', body: JSON.stringify(body) }), { params: Promise.resolve({ id }) });
  }
  it('preserves the result, room, host and identities while creating a fresh configured lobby', async () => {
    const previous = await finished();
    const response = await request(String(previous._id));
    expect(response.status).toBe(200);
    const { id } = await response.json();
    const next = await Match.findById(id);
    expect(next).toMatchObject({ gameId: 'cricket', settings, mode: 'remote', status: 'lobby', roomCode: 'ABC234', hostId: 'host', previousMatchId: String(previous._id) });
    expect(next.players.toObject()).toEqual(previous.players.toObject());
    const old = await Match.findById(previous._id);
    expect(old).toMatchObject({ status: 'complete', winnerId: 'host', state: { result: 'unchanged' }, nextMatchId: id });
  });
  it('allows exactly one successor under simultaneous requests', async () => {
    const previous = await finished();
    const responses = await Promise.all(Array.from({ length: 8 }, () => request(String(previous._id))));
    const ids = await Promise.all(responses.map(async r => { expect(r.status).toBe(200); return (await r.json()).id; }));
    expect(new Set(ids).size).toBe(1);
    expect(await Match.countDocuments({ previousMatchId: String(previous._id) })).toBe(1);
  });
  it('recovers a reservation after an interrupted creation using the original configuration', async () => {
    const id = String(new mongoose.Types.ObjectId());
    const previous = await finished({ rematch: { id, gameId: 'copycat', settings: { firstTo: 7, firstThrow: 'random' } } });
    expect((await request(String(previous._id))).status).toBe(200);
    expect(await Match.findById(id)).toMatchObject({ gameId: 'copycat', settings: { firstTo: 7, firstThrow: 'random' } });
  });
  it('rejects non-hosts, unfinished/local matches, malformed games and settings', async () => {
    const previous = await finished();
    actor.id = 'opponent';
    expect((await request(String(previous._id))).status).toBe(403);
    actor.id = 'host';
    for (const body of [null, { gameId: '__proto__' }, { gameId: 'cricket', settings: { firstTo: 99 } }]) {
      expect((await request(String(previous._id), body)).status).toBe(400);
    }
    const live = await finished({ status: 'live' });
    expect((await request(String(live._id))).status).toBe(409);
    const local = await finished({ mode: 'local' });
    expect((await request(String(local._id))).status).toBe(403);
    expect(await Match.countDocuments({ previousMatchId: { $exists: true } })).toBe(0);
  });
});
