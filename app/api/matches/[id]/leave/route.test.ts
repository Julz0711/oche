import { beforeAll, beforeEach, afterAll, describe, expect, it, vi } from 'vitest';
import mongoose from 'mongoose';
import { NextRequest } from 'next/server';

const actor = vi.hoisted(() => ({ id: 'host' }));
vi.mock('@/lib/auth', () => ({ auth: async () => ({ user: { id: actor.id } }) }));
vi.mock('@/lib/db', () => ({ connectDB: async () => {} }));
import { Match } from '@/lib/db/models';
import { POST } from './route';

const uri = process.env.OCHE_TEST_MONGODB_URI;
describe.skipIf(!uri)('leaving a match', () => {
  beforeAll(async () => {
    await mongoose.connect(uri!, { dbName: `oche_leave_test_${new mongoose.Types.ObjectId()}`, serverSelectionTimeoutMS: 8000 });
  });
  beforeEach(async () => {
    actor.id = 'host';
    await Match.deleteMany({});
  });
  afterAll(async () => {
    if (mongoose.connection.name?.startsWith('oche_leave_test_')) await mongoose.connection.dropDatabase();
    await mongoose.disconnect();
  });

  async function live(extra = {}) {
    return Match.create({
      gameId: 'x01',
      settings: { startingScore: 301 },
      mode: 'remote',
      status: 'live',
      roomCode: 'ABC234',
      hostId: 'host',
      players: [
        { userId: 'host', name: 'Host', isGuest: false },
        { userId: 'opponent', name: 'Opponent', isGuest: false },
      ],
      ...extra,
    });
  }

  async function request(id: string) {
    return POST(new NextRequest('http://localhost/api/matches/x/leave', { method: 'POST' }), { params: Promise.resolve({ id }) });
  }

  it('records the leaving participant without touching the match for the other player', async () => {
    const match = await live();
    const response = await request(String(match._id));
    expect(response.status).toBe(200);
    const updated = await Match.findById(match._id);
    expect(updated.leftBy).toEqual(['host']);
    expect(updated.status).toBe('live');
  });

  it('is idempotent when the same participant leaves twice', async () => {
    const match = await live();
    await request(String(match._id));
    const response = await request(String(match._id));
    expect(response.status).toBe(200);
    const updated = await Match.findById(match._id);
    expect(updated.leftBy).toEqual(['host']);
  });

  it('marks the match abandoned once every signed-in participant has left', async () => {
    const match = await live();
    await request(String(match._id));
    actor.id = 'opponent';
    await request(String(match._id));
    const updated = await Match.findById(match._id);
    expect(updated.leftBy.sort()).toEqual(['host', 'opponent']);
    expect(updated.status).toBe('abandoned');
  });

  it('rejects a signed-in user who is not a participant', async () => {
    const match = await live();
    actor.id = 'stranger';
    const response = await request(String(match._id));
    expect(response.status).toBe(403);
    const updated = await Match.findById(match._id);
    expect(updated.leftBy).toEqual([]);
  });

  it('rejects leaving a match that already finished', async () => {
    const match = await live({ status: 'complete' });
    const response = await request(String(match._id));
    expect(response.status).toBe(409);
  });

  it('returns 404 for a match that does not exist', async () => {
    const response = await request(String(new mongoose.Types.ObjectId()));
    expect(response.status).toBe(404);
  });
});
