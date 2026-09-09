import { randomBytes } from 'node:crypto';
import { MongoServerError, ObjectId, type Db } from 'mongodb';
import type { Friendship, FriendsResponse, FriendAction, HeadToHeadResponse } from './types';
import { actionFilter, friendshipKey } from './policy';

interface SocialProfile { _id: string; code: string }
export class FriendsError extends Error {
  constructor(message: string, public status: number) { super(message); }
}
const indexPromises = new WeakMap<Db, Promise<unknown>>();
async function ensureIndexes(db: Db) {
  let promise = indexPromises.get(db);
  if (!promise) {
    promise = Promise.all([
      db.collection('socialProfiles').createIndex({ code: 1 }, { unique: true }),
      db.collection('friendships').createIndex({ members: 1, status: 1 }),
    ]).catch(error => { indexPromises.delete(db); throw error; });
    indexPromises.set(db, promise);
  }
  await promise;
}
async function profile(db: Db, userId: string) {
  await ensureIndexes(db);
  const collection = db.collection<SocialProfile>('socialProfiles');
  for (let attempt = 0; attempt < 4; attempt++) {
    const found = await collection.findOne({ _id: userId });
    if (found) return found;
    try {
      const record = { _id: userId, code: randomBytes(6).toString('hex').toUpperCase() };
      await collection.insertOne(record);
      return record;
    } catch (error) {
      if (!(error instanceof MongoServerError) || error.code !== 11000) throw error;
      // Either another tab created this user's profile or a random code collided.
    }
  }
  throw new FriendsError('Could not create your friend code. Please try again.', 503);
}
async function people(db: Db, ids: string[]) {
  const users = await db.collection('users').find({ _id: { $in: ids.map(id => new ObjectId(id)) } }, { projection: { name: 1, image: 1 } }).toArray();
  return new Map(users.map(user => [user._id.toString(), { id: user._id.toString(), name: typeof user.name === 'string' ? user.name : 'Player', ...(typeof user.image === 'string' ? { image: user.image } : {}) }]));
}
export async function listFriends(db: Db, actor: string): Promise<FriendsResponse> {
  const [own, relations] = await Promise.all([
    profile(db, actor),
    db.collection<Friendship>('friendships').find({ members: actor }).sort({ createdAt: -1 }).toArray(),
  ]);
  const names = await people(db, relations.map(r => r.members.find(id => id !== actor)!));
  const result: FriendsResponse = { code: own.code, friends: [], incoming: [], outgoing: [] };
  for (const relation of relations) {
    const person = names.get(relation.members.find(id => id !== actor)!);
    if (!person) continue;
    if (relation.status === 'accepted') result.friends.push(person);
    else if (relation.recipient === actor) result.incoming.push(person);
    else result.outgoing.push(person);
  }
  result.friends.sort((a, b) => a.name.localeCompare(b.name));
  return result;
}
export async function requestFriend(db: Db, actor: string, code: string) {
  await profile(db, actor);
  const target = await db.collection<SocialProfile>('socialProfiles').findOne({ code });
  if (!target || !await db.collection('users').findOne({ _id: new ObjectId(target._id) }, { projection: { _id: 1 } })) throw new FriendsError('No player found with that friend code.', 404);
  if (target._id === actor) throw new FriendsError('That is your own friend code.', 400);
  const collection = db.collection<Friendship>('friendships');
  const key = friendshipKey(actor, target._id);
  const existing = await collection.findOne({ _id: key });
  if (existing) {
    if (existing.status === 'accepted') throw new FriendsError('You are already friends.', 409);
    if (existing.recipient === actor) throw new FriendsError('This player has already sent you a request. Accept it below.', 409);
    return; // Repeated submission is idempotent.
  }
  if (await collection.countDocuments({ requester: actor, status: 'pending' }, { limit: 25 }) >= 25) throw new FriendsError('You have 25 pending requests. Cancel one before sending another.', 429);
  try {
    await collection.insertOne({ _id: key, members: [actor, target._id].sort(), requester: actor, recipient: target._id, status: 'pending', createdAt: new Date() });
  } catch (error) {
    if (!(error instanceof MongoServerError) || error.code !== 11000) throw error;
    throw new FriendsError('A request already exists. Refresh your friends list.', 409);
  }
}
export async function changeFriend(db: Db, actor: string, other: string, action: FriendAction) {
  const collection = db.collection<Friendship>('friendships');
  const filter = actionFilter(actor, other, action);
  const changed = action === 'accept'
    ? (await collection.updateOne(filter, { $set: { status: 'accepted', acceptedAt: new Date() } })).modifiedCount
    : (await collection.deleteOne(filter)).deletedCount;
  if (!changed) throw new FriendsError('This request or friendship is no longer available.', 409);
}
export async function headToHead(db: Db, actor: string, other: string, cursor: string | null): Promise<HeadToHeadResponse> {
  const relation = await db.collection<Friendship>('friendships').findOne({ _id: friendshipKey(actor, other), status: 'accepted', members: { $all: [actor, other] } });
  if (!relation) throw new FriendsError('Friend not found.', 404);
  const friend = (await people(db, [other])).get(other);
  if (!friend) throw new FriendsError('Player not found.', 404);
  // Local games don't identify the guest account; group matches aren't head-to-head.
  const filter = { mode: 'remote', status: 'complete', completedAt: { $type: 'date' as const }, players: { $size: 2 }, 'players.userId': { $all: [actor, other] }, winnerId: { $in: [actor, other] } };
  const matches = db.collection('matches');
  const anchor = cursor ? await matches.findOne({ ...filter, _id: new ObjectId(cursor) }, { projection: { completedAt: 1 } }) : null;
  if (cursor && !anchor) throw new FriendsError('This page is no longer available. Refresh the record.', 400);
  const pageFilter = anchor ? { $or: [{ completedAt: { $lt: anchor.completedAt } }, { completedAt: anchor.completedAt, _id: { $lt: anchor._id } }] } : {};
  const [totals, recent] = await Promise.all([
    matches.aggregate<{ _id: string; played: number; wins: number }>([
      { $match: filter },
      { $group: { _id: '$gameId', played: { $sum: 1 }, wins: { $sum: { $cond: [{ $eq: ['$winnerId', actor] }, 1, 0] } } } },
      { $sort: { _id: 1 } },
    ]).toArray(),
    matches.find({ ...filter, ...pageFilter }, { projection: { gameId: 1, completedAt: 1, winnerId: 1 } }).sort({ completedAt: -1, _id: -1 }).limit(21).toArray(),
  ]);
  const games = totals.map(t => ({ gameId: t._id, played: t.played, wins: t.wins, losses: t.played - t.wins }));
  const summary = games.reduce((sum, g) => ({ played: sum.played + g.played, wins: sum.wins + g.wins, losses: sum.losses + g.losses }), { played: 0, wins: 0, losses: 0 });
  const page = recent.slice(0, 20);
  return { friend, summary, games, matches: page.map(m => ({ id: m._id.toString(), gameId: m.gameId, completedAt: m.completedAt instanceof Date ? m.completedAt.toISOString() : '', won: m.winnerId === actor })), nextCursor: recent.length > 20 ? page[19]._id.toString() : null };
}

/** Only accepted friends can see a player's profile. Never expose account fields or friend lists. */
export async function friendProfile(db: Db, actor: string, other: string) {
  const relation = await db.collection<Friendship>('friendships').findOne({ _id: friendshipKey(actor, other), status: 'accepted', members: { $all: [actor, other] } });
  if (!relation) throw new FriendsError('Friend profile not found.', 404);
  const person = (await people(db, [other])).get(other);
  if (!person) throw new FriendsError('Player not found.', 404);
  return person;
}
