import { describe, it, expect } from 'vitest';
import { ShareImagePayloadSchema } from './schema';

const validPayload = {
  gameName: 'X01',
  matchInfo: 'Leg 2',
  players: [
    { name: 'Alice', isWinner: true, statLabel: '3-dart avg', statValue: '58.3' },
    { name: 'Bob', isWinner: false, statLabel: '3-dart avg', statValue: '41.2' },
  ],
};

describe('ShareImagePayloadSchema', () => {
  it('accepts a valid 2-player payload', () => {
    expect(ShareImagePayloadSchema.safeParse(validPayload).success).toBe(true);
  });

  it('accepts a valid 4-player payload', () => {
    const fourPlayers = {
      ...validPayload,
      players: [
        ...validPayload.players,
        { name: 'Carol', isWinner: false, statLabel: '3-dart avg', statValue: '30.1' },
        { name: 'Dan', isWinner: false, statLabel: '3-dart avg', statValue: '25.0' },
      ],
    };
    expect(ShareImagePayloadSchema.safeParse(fourPlayers).success).toBe(true);
  });

  it('rejects fewer than 2 players', () => {
    const result = ShareImagePayloadSchema.safeParse({
      ...validPayload,
      players: [validPayload.players[0]],
    });
    expect(result.success).toBe(false);
  });

  it('rejects more than 4 players', () => {
    const fivePlayers = {
      ...validPayload,
      players: [
        ...validPayload.players,
        { name: 'Carol', isWinner: false, statLabel: 'x', statValue: '1' },
        { name: 'Dan', isWinner: false, statLabel: 'x', statValue: '1' },
        { name: 'Eve', isWinner: false, statLabel: 'x', statValue: '1' },
      ],
    };
    expect(ShareImagePayloadSchema.safeParse(fivePlayers).success).toBe(false);
  });

  it('rejects a payload missing a required field', () => {
    const { gameName, ...rest } = validPayload;
    expect(ShareImagePayloadSchema.safeParse(rest).success).toBe(false);
  });

  it('rejects a payload with a wrong field type', () => {
    const result = ShareImagePayloadSchema.safeParse({
      ...validPayload,
      players: [{ ...validPayload.players[0], isWinner: 'yes' }, validPayload.players[1]],
    });
    expect(result.success).toBe(false);
  });
});
