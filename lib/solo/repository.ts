import { randomUUID } from "node:crypto";
import { ObjectId, type Db } from "mongodb";
import {
  canonicalActions,
  replay,
  summary,
} from "@/lib/games/roguelike/engine";
import type {
  Action,
  Config,
  Difficulty,
  Owned,
  RoundResult,
} from "@/lib/games/roguelike/types";
import type { Friendship } from "@/lib/friends/types";
import { FriendsError } from "@/lib/friends/repository";
import { weeklyChallenge, rankRows } from "./challenge";
interface Result extends ReturnType<typeof summary> {
  build: Owned[];
  rounds: RoundResult[];
}
interface Attempt {
  _id: string;
  owner: string;
  challengeId: string;
  difficulty: Difficulty;
  config: Config;
  closesAt: Date;
  createdAt: Date;
  completedAt?: Date;
  result?: Result;
  actions?: Action[];
}
const indexes = new WeakMap<Db, Promise<unknown>>();
async function collection(db: Db) {
  if (!indexes.has(db))
    indexes.set(
      db,
      db
        .collection("soloRuns")
        .createIndex({
          challengeId: 1,
          difficulty: 1,
          "config.version": 1,
          owner: 1,
          completedAt: 1,
        })
        .catch((e) => {
          indexes.delete(db);
          throw e;
        })
    );
  await indexes.get(db);
  return db.collection<Attempt>("soloRuns");
}
export async function startAttempt(
  db: Db,
  owner: string,
  difficulty: Difficulty,
  starter: 16 | 17 | 19,
  now = new Date()
) {
  const c = weeklyChallenge(now),
    id = randomUUID();
  const config: Config = {
    id,
    seed: c.seed,
    difficulty,
    starter,
    version: c.version,
    challengeId: c.id,
    closesAt: c.closesAt,
    owner,
  };
  const runs = await collection(db);
  await runs.insertOne({
    _id: id,
    owner,
    challengeId: c.id,
    difficulty,
    config,
    closesAt: new Date(c.closesAt),
    createdAt: now,
  });
  return { config, closesAt: c.closesAt };
}
export async function submitAttempt(
  db: Db,
  owner: string,
  id: string,
  actions: Action[],
  now = new Date()
) {
  const runs = await collection(db),
    attempt = await runs.findOne({ _id: id, owner });
  if (!attempt) throw new FriendsError("Run not found.", 404);
  if (attempt.result) return attempt.result;
  if (now >= attempt.closesAt)
    throw new FriendsError(
      "This weekly challenge has closed. Your run remains saved on this device.",
      409
    );
  let state;
  try {
    state = replay(attempt.config, actions);
  } catch (error) {
    throw new FriendsError(
      error instanceof Error ? error.message : "Invalid run.",
      400
    );
  }
  if (state.phase !== "won" && state.phase !== "lost")
    throw new FriendsError(
      "Finish and confirm the run before submitting.",
      400
    );
  const result: Result = {
    ...summary(state),
    build: [...state.darts.filter((d): d is Owned => !!d), ...state.charms],
    rounds: state.results,
  };
  await runs.updateOne(
    { _id: id, owner, result: { $exists: false } },
    { $set: { result, completedAt: now, actions: canonicalActions(actions) } }
  );
  return (await runs.findOne({ _id: id, owner }))!.result!;
}
async function allowedOwners(db: Db, owner: string) {
  const friends = await db
    .collection<Friendship>("friendships")
    .find({ members: owner, status: "accepted" })
    .toArray();
  return [
    owner,
    ...friends.flatMap((f) => f.members.filter((id) => id !== owner)),
  ];
}
export async function leaderboard(
  db: Db,
  owner: string,
  difficulty: Difficulty,
  now = new Date()
) {
  const challenge = weeklyChallenge(now),
    owners = await allowedOwners(db, owner),
    runs = await collection(db);
  const [best, users] = await Promise.all([
    runs
      .aggregate<{ best: Attempt; attempts: number }>([
        {
          $match: {
            owner: { $in: owners },
            difficulty,
            challengeId: challenge.id,
            "config.version": challenge.version,
            result: { $exists: true },
          },
        },
        {
          $sort: {
            "result.cleared": -1,
            "result.progress": -1,
            "result.darts": 1,
            completedAt: 1,
            _id: 1,
          },
        },
        { $project: { actions: 0, "result.rounds": 0 } },
        {
          $group: {
            _id: "$owner",
            best: { $first: "$$ROOT" },
            attempts: { $sum: 1 },
          },
        },
      ])
      .toArray(),
    db
      .collection("users")
      .find(
        { _id: { $in: owners.map((id) => new ObjectId(id)) } },
        { projection: { name: 1, image: 1 } }
      )
      .toArray(),
  ]);
  const rows = best.map(({ best: a, attempts }) => {
    const user = users.find((u) => u._id.toString() === a.owner);
    return {
      id: a._id,
      owner: a.owner,
      name: typeof user?.name === "string" ? user.name : "Player",
      ...a.result!,
      completedAt: a.completedAt!.toISOString(),
      attempts,
    };
  });
  return { challenge, rows: rankRows(rows), friendCount: owners.length - 1 };
}
export async function runDetails(db: Db, owner: string, id: string) {
  const owners = await allowedOwners(db, owner),
    runs = await collection(db);
  const run = await runs.findOne(
    { _id: id, owner: { $in: owners }, result: { $exists: true } },
    { projection: { actions: 0 } }
  );
  if (!run) throw new FriendsError("Run not found.", 404);
  return {
    id: run._id,
    owner: run.owner,
    difficulty: run.difficulty,
    challengeId: run.challengeId,
    result: run.result,
  };
}
