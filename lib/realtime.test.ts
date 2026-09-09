import { beforeEach, describe, expect, it, vi } from 'vitest';
const mocks = vi.hoisted(() => ({ publish: vi.fn(), token: vi.fn() }));
vi.mock('ably', () => ({ Rest: class {
  channels = { get: () => ({ publish: mocks.publish }) };
  auth = { createTokenRequest: mocks.token };
} }));
import { publishMatchEvent, createMatchToken } from './realtime';

describe('match realtime messages', () => {
  beforeEach(() => { vi.clearAllMocks(); vi.stubEnv('ABLY_API_KEY', 'test-key'); });
  it('publishes a small notification even when match history exceeds the Ably message limit', async () => {
    const state = { visitHistory: Array.from({ length: 1000 }, () => ({ throws: [20, 20, 20], previous: 'x'.repeat(200) })) };
    expect(Buffer.byteLength(JSON.stringify(state))).toBeGreaterThan(65536);
    await publishMatchEvent('match', { name: 'state', data: { state, status: 'live' } });
    expect(mocks.publish).toHaveBeenCalledWith('state', { refresh: true });
    expect(Buffer.byteLength(JSON.stringify(mocks.publish.mock.calls[0][1]))).toBeLessThan(100);
  });
  it('restricts presence and subscription permission to the participant’s match channel', async () => {
    await createMatchToken('match', 'player');
    expect(mocks.token).toHaveBeenCalledWith({ clientId: 'player', capability: { 'match:match': ['subscribe', 'presence'] } });
  });
});
