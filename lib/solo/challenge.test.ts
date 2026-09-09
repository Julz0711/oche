import { describe, it, expect } from "vitest";
import { weeklyChallenge, rankRows, compareRuns } from "./challenge";
import { StartSchema, SubmitSchema } from "./schema";
describe("friends challenge policy", () => {
  it("rolls over at Monday UTC, including across years", () => {
    expect(weeklyChallenge(new Date("2026-01-04T23:59:59Z")).id).toBe(
      "2025-12-29"
    );
    expect(weeklyChallenge(new Date("2026-01-05T00:00:00Z")).id).toBe(
      "2026-01-05"
    );
  });
  it("ranks progression before efficiency and shares exact ties", () => {
    const rows = rankRows([
      { name: "a", cleared: 2, progress: 400, darts: 30 },
      { name: "b", cleared: 2, progress: 400, darts: 30 },
      { name: "c", cleared: 1, progress: 999, darts: 1 },
    ]);
    expect(rows.map((r) => r.rank)).toEqual([1, 1, 3]);
    expect(
      compareRuns(
        { cleared: 2, progress: 400, darts: 28 },
        { cleared: 2, progress: 400, darts: 30 }
      )
    ).toBeLessThan(0);
  });
  it("rejects payload extras and forged scoring fields", () => {
    expect(
      StartSchema.safeParse({
        difficulty: "regular",
        starter: 16,
        seed: "cheat",
      }).success
    ).toBe(false);
    expect(
      SubmitSchema.safeParse({
        id: crypto.randomUUID(),
        actions: [
          { type: "throw", hit: { sector: 20, ring: "T", points: 999 } },
        ],
      }).success
    ).toBe(false);
  });
});
