import { createHash } from 'node:crypto';
import { ObjectId, type Db } from 'mongodb';
import { buildDemoMatch } from './demoMatches';
import type { Friendship } from '@/lib/friends/types';
import { friendshipKey } from '@/lib/friends/policy';

const fixture = 'oche-demo-v1';
const idFor = (key: string) => new ObjectId(createHash('sha256').update(`${fixture}:${key}`).digest('hex').slice(0, 24));
const people = [
  { key: 'alex', name: 'Alex Morgan', email: 'demo@oche.test' },
  { key: 'sam', name: 'Sam Taylor', email: 'sam@oche.test' },
  { key: 'jo', name: 'Jo Bennett', email: 'jo@oche.test' },
  { key: 'max', name: 'Max Winter', email: 'max@oche.test' },
];

/** Idempotent, additive fixtures. Never replaces an existing person's data or resets edits. */
export async function ensureDemoAccount(db: Db) {
  if (process.env.NODE_ENV !== 'development') throw new Error('Demo account is development-only');
  const now = new Date();
  for (const person of people) {
    await db.collection('users').updateOne({ _id: idFor(person.key) }, { $setOnInsert: { name: person.name, email: person.email, image: null, emailVerified: null, devFixture: fixture } }, { upsert: true });
  }
  const actor = idFor('alex').toHexString();
  const user = await db.collection('users').findOne({ _id: idFor('alex') });
  if (!user) throw new Error('Demo user unavailable');
  if (user.demoSeedVersion !== fixture) {
    for (const [index, person] of people.slice(1).entries()) {
      const other = idFor(person.key).toHexString();
      await db.collection<Friendship>('friendships').updateOne({ _id: friendshipKey(actor, other) }, { $setOnInsert: { members: [actor, other].sort(), requester: other, recipient: actor, status: index < 2 ? 'accepted' : 'pending', createdAt: now, ...(index < 2 ? { acceptedAt: now } : {}) } }, { upsert: true });
    }
    for (let index = 0; index < 12; index++) {
      const person = people[1 + index % 2];
      const opponent = idFor(person.key).toHexString();
      const gameId = (['x01', 'x01', 'cricket', 'copycat'] as const)[index % 4];
      const match = buildDemoMatch(gameId, actor, opponent, index % 3 !== 1, index);
      const matchId = idFor(`match-${index}`);
      const completedAt = new Date(now.getTime() - (index === 0 ? 10 * 60_000 : index * 36 * 60 * 60_000));
      const startedAt = new Date(completedAt.getTime() - 12 * 60_000);
      await db.collection('matches').updateOne({ _id: matchId }, { $setOnInsert: { ...match, devFixture: fixture, mode: 'remote', status: 'complete', hostId: actor, userId: actor, players: [{ userId: actor, name: people[0].name, isGuest: false }, { userId: opponent, name: person.name, isGuest: false }], startedAt, completedAt, createdAt: startedAt, achievementsEvaluatedFor: [actor, opponent] } }, { upsert: true });
      for (const [seq, visit] of match.state.visitHistory.entries()) {
        await db.collection('visits').updateOne({ _id: idFor(`visit-${index}-${seq}`) }, { $setOnInsert: { ...visit, devFixture: fixture, matchId: matchId.toHexString(), seq, index: seq, createdAt: completedAt } }, { upsert: true });
      }
    }
    // Deliberate sample awards; their definitions remain owned by the normal achievement seed.
    for (const [index, achievement_id] of ['first_win', 'first_180', 'grand_slam', 'cricket_god'].entries()) {
      await db.collection('userachievements').updateOne({ user_id: actor, achievement_id }, { $setOnInsert: { devFixture: fixture, unlocked_at: new Date(now.getTime() - index * 86400000), count: 1 } }, { upsert: true });
    }
    await db.collection('users').updateOne({ _id: idFor('alex') }, { $set: { demoSeedVersion: fixture } });
  }
  return { id: actor, name: String(user.name), email: String(user.email), image: null };
}
