import { describe, it, expect } from 'vitest';
import { NextRequest } from 'next/server';
import { POST } from './route';

const validPayload = {
  gameName: 'X01',
  matchInfo: 'Leg 2',
  players: [
    { name: 'Alice', isWinner: true, statLabel: '3-dart avg', statValue: '58.3' },
    { name: 'Bob', isWinner: false, statLabel: '3-dart avg', statValue: '41.2' },
  ],
};

function makeRequest(body: unknown) {
  return new NextRequest('http://localhost/api/matches/abc/share-image', {
    method: 'POST',
    body: JSON.stringify(body),
    headers: { 'content-type': 'application/json' },
  });
}

describe('POST /api/matches/[id]/share-image', () => {
  it('returns a PNG for a valid payload', async () => {
    const response = await POST(makeRequest(validPayload));
    expect(response.status).toBe(200);
    expect(response.headers.get('content-type')).toBe('image/png');
    const buf = Buffer.from(await response.arrayBuffer());
    expect(buf.length).toBeGreaterThan(0);
    expect(buf.subarray(0, 8)).toEqual(Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]));
  });

  it('returns a PNG for a 4-player payload', async () => {
    const fourPlayers = {
      ...validPayload,
      players: [
        ...validPayload.players,
        { name: 'Carol', isWinner: false, statLabel: '3-dart avg', statValue: '30.1' },
        { name: 'Dan', isWinner: false, statLabel: '3-dart avg', statValue: '25.0' },
      ],
    };
    const response = await POST(makeRequest(fourPlayers));
    expect(response.status).toBe(200);
  });

  it('returns 400 for a payload missing required fields', async () => {
    const response = await POST(makeRequest({ gameName: 'X01' }));
    expect(response.status).toBe(400);
  });

  it('returns 400 for invalid JSON', async () => {
    const req = new NextRequest('http://localhost/api/matches/abc/share-image', {
      method: 'POST',
      body: '{not json',
      headers: { 'content-type': 'application/json' },
    });
    const response = await POST(req);
    expect(response.status).toBe(400);
  });
});
