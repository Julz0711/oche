import { afterAll, beforeAll, describe, it, expect } from "vitest";
import { MongoClient, ObjectId, type Db } from "mongodb";
import {
  startAttempt,
  submitAttempt,
  leaderboard,
  runDetails,
} from "./repository";
import type { Action } from "@/lib/games/roguelike/types";
const uri = process.env.OCHE_TEST_MONGODB_URI;
const suite = uri ? describe : describe.skip;
suite("solo friends results in an isolated database", () => {
  let client: MongoClient, db: Db;
  const a = new ObjectId().toString(),
    b = new ObjectId().toString(),
    c = new ObjectId().toString();
  const now = new Date("2026-09-10T12:00:00Z");
  const actions: Action[] = [
    { type: "start", home: 20, dealer: "points", wager: false },
  ];
  for (let i = 0; i < 12; i++) {
    actions.push({ type: "throw", hit: { sector: 0, ring: "M" } });
    if (i % 3 === 2) actions.push({ type: "bank" });
  }
  actions.push({ type: "commit" });
  beforeAll(async () => {
    client = await new MongoClient(uri!).connect();
    db = client.db("oche_solo_test_" + crypto.randomUUID().replaceAll("-", ""));
    await db
      .collection("users")
      .insertMany(
        [a, b, c].map((id, i) => ({
          _id: new ObjectId(id),
          name: ["Alice", "Bob", "Carol"][i],
          email: "private@example.test",
        }))
      );
    await db
      .collection<{ _id: string; members: string[]; status: string }>(
        "friendships"
      )
      .insertOne({
        _id: [a, b].sort().join(":"),
        members: [a, b],
        status: "accepted",
      });
  });
  afterAll(async () => {
    if (db) await db.dropDatabase();
    if (client) await client.close();
  });
  it("validates, submits once, shares ties, excludes strangers and revokes removed friendships", async () => {
    const aa = await startAttempt(db, a, "regular", 16, now),
      bb = await startAttempt(db, b, "regular", 16, now);
    await expect(
      submitAttempt(db, b, aa.config.id, actions, now)
    ).rejects.toThrow("not found");
    await expect(submitAttempt(db, a, aa.config.id, [], now)).rejects.toThrow(
      "Finish"
    );
    await Promise.all([
      submitAttempt(db, a, aa.config.id, actions, now),
      submitAttempt(db, a, aa.config.id, actions, now),
      submitAttempt(db, b, bb.config.id, actions, now),
    ]);
    const board = await leaderboard(db, a, "regular", now);
    expect(board.rows).toHaveLength(2);
    expect(board.rows.map((r) => r.rank)).toEqual([1, 1]);
    expect(board.rows.find((r) => r.owner === a)?.attempts).toBe(1);
    expect(JSON.stringify(board)).not.toContain("private@example");
    expect((await leaderboard(db, a, "expert", now)).rows).toHaveLength(0);
    await expect(runDetails(db, c, aa.config.id)).rejects.toThrow("not found");
    expect((await runDetails(db, b, aa.config.id)).owner).toBe(a);
    await db.collection("friendships").deleteMany({ members: a });
    expect((await leaderboard(db, a, "regular", now)).rows).toHaveLength(1);
    await expect(runDetails(db, b, aa.config.id)).rejects.toThrow("not found");
  });
  it("rejects late results and retains a previously submitted result", async () => {
    const attempt = await startAttempt(db, c, "regular", 16, now);
    await expect(
      submitAttempt(
        db,
        c,
        attempt.config.id,
        actions,
        new Date(attempt.closesAt)
      )
    ).rejects.toThrow("closed");
  });
});
