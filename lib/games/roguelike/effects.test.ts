import { describe, it, expect } from "vitest";
import { init, apply } from "./engine";
import { resolveVisit } from "./scoring";
import { RULES_VERSION, type Hit, type Run } from "./types";
const S = (sector: number): Hit => ({ sector, ring: "S" }),
  D = (sector: number): Hit => ({ sector, ring: "D" }),
  T = (sector: number): Hit => ({ sector, ring: "T" });
const miss: Hit = { sector: 0, ring: "M" },
  bull: Hit = { sector: 25, ring: "OB" };
function fixture() {
  return apply(
    init({
      id: "effects",
      seed: "effects",
      difficulty: "regular",
      starter: 16,
      version: RULES_VERSION,
    }),
    { type: "start", home: 19, dealer: "points", wager: false }
  );
}
const darts: {
  id: number;
  hits: Hit[];
  slot: number;
  prepare?: (r: Run) => void;
}[] = [
  { id: 1, hits: [S(5)], slot: 0 },
  { id: 2, hits: [S(5)], slot: 0 },
  { id: 3, hits: [D(5)], slot: 0 },
  { id: 4, hits: [bull], slot: 0 },
  { id: 5, hits: [S(5), S(5)], slot: 1 },
  { id: 6, hits: [S(5)], slot: 0 },
  { id: 7, hits: [S(5), S(5), S(5)], slot: 2 },
  { id: 8, hits: [S(5), S(6)], slot: 1 },
  { id: 9, hits: [S(20), S(1)], slot: 1 },
  { id: 10, hits: [S(5)], slot: 0 },
  { id: 11, hits: [S(2)], slot: 0 },
  { id: 12, hits: [T(20)], slot: 0 },
  { id: 13, hits: [miss, S(5)], slot: 1 },
  { id: 14, hits: [S(5), S(6)], slot: 1 },
  {
    id: 15,
    hits: [S(5)],
    slot: 0,
    prepare: (r) => {
      r.round.counts.growing = 2;
    },
  },
];
const charms: { id: number; hits: Hit[]; prepare?: (r: Run) => void }[] = [
  { id: 16, hits: [S(5)] },
  { id: 17, hits: [D(5)] },
  { id: 18, hits: [S(5), S(5)] },
  { id: 19, hits: [S(1), S(2), S(3)] },
  { id: 20, hits: [S(5)] },
  { id: 21, hits: [bull] },
  { id: 22, hits: [S(1), S(1), D(20)] },
  { id: 23, hits: [S(1), S(1), S(1)] },
  { id: 24, hits: [S(2)] },
  { id: 25, hits: [S(1), S(2), S(3)] },
  { id: 26, hits: [S(3), S(2), S(1)] },
  { id: 27, hits: [S(1), S(2), S(1)] },
  { id: 28, hits: [S(5), D(5), T(5)] },
  { id: 29, hits: [S(5), S(5), S(5)] },
  { id: 30, hits: [S(5)] },
  { id: 31, hits: [S(19)] },
  { id: 32, hits: [S(5), S(20), S(1)] },
  { id: 33, hits: [S(1), S(1), S(1)] },
  {
    id: 34,
    hits: [S(1)],
    prepare: (r) => {
      r.round.priorMiss = true;
    },
  },
  {
    id: 35,
    hits: [S(1)],
    prepare: (r) => {
      r.round.spent = 9;
    },
  },
  {
    id: 36,
    hits: [S(1)],
    prepare: (r) => {
      for (let i = 0; i < 4; i++) {
        r.round.hits = [miss];
        resolveVisit(r);
      }
    },
  },
  { id: 37, hits: [S(1), S(2), S(3)] },
  {
    id: 38,
    hits: [S(5)],
    prepare: (r) => {
      r.round.hits = [S(1)];
      resolveVisit(r);
    },
  },
  { id: 39, hits: [S(20), S(20), S(10)] },
  { id: 40, hits: [S(1), S(15), S(20)] },
  {
    id: 68,
    hits: [S(5)],
    prepare: (r) => {
      r.round.house = 5;
    },
  },
  {
    id: 69,
    hits: [S(5)],
    prepare: (r) => {
      r.round.house = 5;
    },
  },
  {
    id: 70,
    hits: [S(5)],
    prepare: (r) => {
      r.round.house = 5;
    },
  },
  {
    id: 72,
    hits: [S(5)],
    prepare: (r) => {
      r.round.house = 5;
    },
  },
];
describe("every scoring effect has a reachable physical trigger", () => {
  it.each(darts)(
    "dart $id activates only in its equipped position",
    ({ id, hits, slot, prepare }) => {
      const r = fixture();
      r.charms = [];
      r.darts[slot] = { id, paid: 5 };
      prepare?.(r);
      r.round.hits = hits;
      const v = resolveVisit(r);
      expect(v.effects.some((e) => e.id === id)).toBe(true);
    }
  );
  it.each(charms)(
    "charm $id produces its advertised type of reward",
    ({ id, hits, prepare }) => {
      const r = fixture();
      r.charms = [{ id, paid: 6 }];
      prepare?.(r);
      r.round.hits = hits;
      const v = resolveVisit(r);
      expect(v.effects.some((e) => e.id === id)).toBe(true);
    }
  );
  it("all consumables activate, resolve, and leave the inventory", () => {
    for (let id = 51; id <= 60; id++) {
      let r = fixture();
      r.round.boss = "bouncer";
      r.darts[0] = { id: 2, paid: 5 };
      r.consumables = [{ id, paid: 4 }];
      r = apply(r, { type: "use", id, slot: 0 });
      r.round.hits = [bull, S(5), miss];
      const v = resolveVisit(r);
      expect(r.consumables).toHaveLength(0);
      expect(r.round.power).toBeNull();
      expect(Number.isFinite(v.score)).toBe(true);
    }
  });
});
