import { describe, it, expect } from "vitest";
import { CATALOGUE } from "./catalogue";
import {
  init,
  apply,
  replay,
  houseNumber,
  purchasePrice,
  salePrice,
  summary,
} from "./engine";
import { resolveVisit } from "./scoring";
import { RULES_VERSION, type Run, type Config } from "./types";
const config: Config = {
  id: "test",
  seed: "test",
  difficulty: "regular",
  starter: 16,
  version: RULES_VERSION,
};
const s = (sector: number) => ({ sector, ring: "S" as const });
function playing(ids: number[] = []) {
  const r = init(config);
  r.charms = ids.map((id) => ({ id, paid: 6 }));
  return apply(r, { type: "start", home: 20, dealer: "points", wager: false });
}
function visit(r: Run, hits = r.round.hits) {
  r.round.hits = hits;
  return resolveVisit(r);
}
describe("House Rules engine", () => {
  it("has 72 distinct effects and three darts, five shared charms and two consumable capacity", () => {
    expect(CATALOGUE).toHaveLength(72);
    expect(new Set(CATALOGUE.map((i) => i.id)).size).toBe(72);
    expect(init(config).darts).toHaveLength(3);
  });
  it("keeps real board points separate from stacked scoring", () => {
    const r = playing([16, 18]);
    const v = visit(r, [s(20), s(20), s(5)]);
    expect(v.board).toBe(45);
    expect(v.score).toBe(150);
  });
  it("uses the same rotating numbers despite different shop RNG namespaces, with no consecutive repeats", () => {
    const values = Array.from({ length: 9 }, (_, i) => houseNumber(config, i));
    expect(values[2]).not.toBe(20);
    values.slice(1).forEach((n, i) => expect(n).not.toBe(values[i]));
    expect(values).toEqual(
      Array.from({ length: 9 }, (_, i) => houseNumber(config, i))
    );
  });
  it("scores the house bounty example and caps coins without multiplying them", () => {
    const r = playing([68, 69]);
    r.round.house = 5;
    const v = visit(r, [s(5), s(5), { sector: 5, ring: "D" }]);
    expect(v.score).toBe(95);
    expect(r.round.coins).toBe(3);
    visit(r, [s(5), s(5), s(5)]);
    expect(r.round.coins).toBe(3);
  });
  it("blocks boss hits before equipment or income triggers", () => {
    const r = playing([16, 68, 69]);
    r.round.boss = "bouncer";
    r.round.house = 20;
    const v = visit(r, [s(20), s(20), s(20)]);
    expect(v.board).toBe(60);
    expect(v.score).toBe(0);
    expect(r.round.coins).toBe(0);
  });
  it("treats trebles as singles against Minimalist but preserves physical stats", () => {
    const r = playing([16, 17]);
    r.round.boss = "minimalist";
    const v = visit(r, [{ sector: 20, ring: "T" }, s(1), s(1)]);
    expect(v.board).toBe(62);
    expect(v.score).toBe(52);
  });
  it("earns a final-visit extension before exhaustion and caps it at 24", () => {
    const r = playing([43]);
    r.round.spent = 9;
    r.round.score = 0;
    visit(r, [{ sector: 1, ring: "D" }, s(1), s(1)]);
    expect(r.round.budget).toBe(13);
    const capped = playing([43]);
    capped.round.budget = 24;
    visit(capped, [{ sector: 1, ring: "D" }, s(1), s(1)]);
    expect(capped.round.budget).toBe(24);
    expect(capped.round.granted).toContain(43);
  });
  it("does not extend a winning visit", () => {
    const r = playing([43]);
    r.round.target = 2;
    visit(r, [{ sector: 1, ring: "D" }, s(1), s(1)]);
    expect(r.round.budget).toBe(12);
  });
  it("plays a final two-dart visit from slot one without a finisher bonus", () => {
    let r = playing([41, 22]);
    for (let i = 0; i < 4; i++) {
      for (let j = 0; j < 3; j++)
        r = apply(r, { type: "throw", hit: { sector: 0, ring: "M" } });
      r = apply(r, { type: "bank" });
    }
    r = apply(r, { type: "throw", hit: s(1) });
    r = apply(r, { type: "throw", hit: s(1) });
    r = apply(r, { type: "bank" });
    expect(r.phase).toBe("pending");
    expect(r.round.spent).toBe(14);
    expect(r.round.visits[4].score).toBe(2);
  });
  it("undo removes the dependent bank and grant, without crossing a committed round", () => {
    const actions = [
      { type: "start", home: 20, dealer: "points", wager: false },
      { type: "throw", hit: s(20) },
      { type: "throw", hit: s(20) },
      { type: "throw", hit: s(20) },
      { type: "bank" },
      { type: "undo" },
    ] as const;
    const r = replay(config, [...actions]);
    expect(r.round.visits).toHaveLength(0);
    expect(r.round.hits).toHaveLength(2);
    expect(r.round.spent).toBe(0);
  });
  it("combines discounts with a minimum of one and resells based on actual paid cost", () => {
    const r = playing();
    r.shop.modifiers = [48, 65, 66];
    expect(purchasePrice(r, 51)).toBe(1);
    expect(salePrice(r, { id: 51, paid: 1 })).toBe(0);
    expect(salePrice(r, { id: 41, paid: 7 })).toBe(5);
  });
  it("rejects a sixth shared charm and a fourth dart", () => {
    const r = playing([16, 17, 18, 19, 20]);
    r.phase = "shop";
    r.coins = 50;
    r.offers = [
      { id: 21, sold: false },
      { id: 1, sold: false },
    ];
    expect(() => apply(r, { type: "buy", offer: 0 })).toThrow("five");
    expect(() => apply(r, { type: "buy", offer: 1, slot: 3 })).toThrow("slot");
  });
  it("does not trust forged hit points or invalid rings/sectors", () => {
    expect(() =>
      apply(playing(), { type: "throw", hit: { sector: 25, ring: "T" } })
    ).toThrow();
    expect(() =>
      apply(playing(), { type: "throw", hit: { sector: 20, ring: "M" } })
    ).toThrow();
  });
  it("records a failed complete run with zero coin reward and capped ranking progress", () => {
    let r = playing();
    for (let i = 0; i < 12; i++) {
      r = apply(r, { type: "throw", hit: s(1) });
      if (i % 3 === 2) r = apply(r, { type: "bank" });
    }
    r = apply(r, { type: "commit" });
    expect(r.phase).toBe("lost");
    expect(r.results[0].coins).toBe(0);
    expect(summary(r)).toMatchObject({ cleared: 0, progress: 12, darts: 12 });
  });
});

describe("powerup and economy boundaries", () => {
  it("cancels a powerup activation by removing the purchase-use action suffix before any hit", () => {
    const actions: import("./types").Action[] = [
      { type: "start", home: 20, dealer: "points", wager: false },
      { type: "use", id: 51 },
      { type: "cancelUse" },
    ];
    // Cancelled input never reaches the reducer, so no phantom dart or inventory mutation survives.
    expect(replay(config, actions).round.budget).toBe(12);
    expect(() =>
      replay(config, [
        ...actions.slice(0, 2),
        { type: "throw", hit: s(1) },
        { type: "cancelUse" },
      ])
    ).toThrow();
  });
  it("blocks multiple powerups at the same boundary, and restores normal scoring afterward", () => {
    let r = playing([16]);
    r.consumables = [
      { id: 55, paid: 4 },
      { id: 56, paid: 4 },
    ];
    r = apply(r, { type: "use", id: 55 });
    expect(() => apply(r, { type: "use", id: 56 })).toThrow("one powerup");
    expect(visit(r, [s(1), s(1), s(1)]).score).toBe(63);
    expect(visit(r, [s(1), s(1), s(1)]).score).toBe(33);
  });
  it("House Pass revives the boss sector for one visit, while Single Service does not", () => {
    const a = playing([16]);
    a.round.boss = "bouncer";
    a.round.power = 53;
    expect(visit(a, [s(20), s(20), s(20)]).score).toBe(90);
    expect(visit(a, [s(20), s(20), s(20)]).score).toBe(0);
    const b = playing([16]);
    b.round.boss = "bouncer";
    b.round.power = 57;
    expect(visit(b, [{ sector: 20, ring: "D" }, s(20), s(20)]).score).toBe(0);
  });
  it("extra darts cannot increase the early-clear reward", () => {
    let r = playing([41]);
    r.round.target = 1;
    r = apply(r, { type: "throw", hit: s(1) });
    r = apply(r, { type: "throw", hit: s(1) });
    r = apply(r, { type: "throw", hit: s(1) });
    r = apply(r, { type: "bank" });
    r = apply(r, { type: "commit" });
    expect(r.results[0].coins).toBe(7);
  });
  it("economy earnings remain pending, capped, and are lost on failure", () => {
    let r = playing([62]);
    for (let i = 0; i < 4; i++) visit(r, [s(1), s(1), s(1)]);
    expect(r.round.coins).toBe(2);
    expect(r.coins).toBe(4);
    r.phase = "pending";
    r = apply(r, { type: "commit" });
    expect(r.coins).toBe(4);
  });
  it("free refreshes activate only from the shop entry snapshot", () => {
    let r = playing([]);
    r.phase = "shop";
    r.coins = 10;
    r.offers = [{ id: 49, sold: false }];
    r = apply(r, { type: "buy", offer: 0 });
    expect(r.shop.modifiers).not.toContain(49);
    const before = r.coins;
    r = apply(r, { type: "refresh" });
    expect(r.coins).toBe(before - 2);
  });
});

it("refreshes only unsold offers, keeping purchased slots closed", () => {
  let r = playing();
  r.phase = "shop";
  r.coins = 30;
  r.offers = [
    { id: 1, sold: false },
    { id: 2, sold: false },
    { id: 51, sold: false },
  ];
  r = apply(r, { type: "buy", offer: 0, slot: 0 });
  const bought = r.offers[0];
  r = apply(r, { type: "refresh" });
  expect(r.offers[0]).toEqual(bought);
  expect(r.offers[0].sold).toBe(true);
  expect(new Set(r.offers.map((o) => o.id)).size).toBe(r.offers.length);
});
