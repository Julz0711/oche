import { describe, expect, it, vi, afterEach } from 'vitest';
import { allowDemoLogin } from './login';
import { buildDemoMatch } from './demoMatches';
import { ensureDemoAccount } from './demoAccount';

afterEach(() => vi.unstubAllEnvs());
describe('local demo authentication boundary', () => {
  it('requires development and a loopback URL', () => {
    for (const url of ['http://localhost:3000/api/auth/callback/development', 'http://127.0.0.1:3000', 'http://[::1]:3000']) expect(allowDemoLogin(url, 'development')).toBe(true);
    for (const url of ['https://oche.example', 'http://localhost.evil.example', 'not a URL']) expect(allowDemoLogin(url, 'development')).toBe(false);
    for (const environment of ['test', 'production'] as const) expect(allowDemoLogin('http://localhost:3000', environment)).toBe(false);
  });
  it('refuses to seed outside development before touching the database', async () => {
    vi.stubEnv('NODE_ENV', 'production');
    await expect(ensureDemoAccount(null!)).rejects.toThrow('development-only');
  });
});
describe('sample matches use valid completed engine states', () => {
  for (const game of ['x01', 'cricket', 'copycat'] as const) {
    for (const won of [true, false]) it(`${game} can show a ${won ? 'win' : 'loss'}`, () => {
      const match = buildDemoMatch(game, 'alex', 'sam', won);
      expect(match.state.matchComplete).toBe(true);
      expect(match.winnerId).toBe(won ? 'alex' : 'sam');
      expect(match.state.visitHistory.length).toBeGreaterThan(0);
      for (const visit of match.state.visitHistory) expect(visit.throws.length).toBeGreaterThan(0);
    });
  }
});
