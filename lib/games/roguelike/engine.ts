import { CATALOGUE, item } from "./catalogue";
import { shuffled } from "./random";
import { resolveVisit, validHit } from "./scoring";
import {
  RULES_VERSION,
  type Action,
  type Config,
  type Owned,
  type Round,
  type Run,
} from "./types";
const TARGETS = [150, 210, 270, 360, 480, 630, 820, 1060, 1400];
export const has = (run: Run, id: number) =>
  run.charms.some((c) => c.id === id);
export function houseNumber(config: Config, index: number): number {
  let previous = 0;
  for (let i = 0; i <= index; i++)
    previous = shuffled(
      Array.from({ length: 20 }, (_, n) => n + 1).filter(
        (n) => n !== previous && !(i === 2 && n === 20)
      ),
      `${config.seed}:house:${i}:${config.version}`
    )[0];
  return previous;
}
export function makeRound(config: Config, index: number): Round {
  const target = Math.round(
    TARGETS[index] * { social: 0.7, regular: 1, expert: 1.3 }[config.difficulty]
  );
  return {
    index,
    target,
    standardTarget: target,
    boss:
      index === 2
        ? "bouncer"
        : index === 5
        ? "wanderer"
        : index === 8
        ? "minimalist"
        : null,
    house: houseNumber(config, index),
    budget: 12,
    spent: 0,
    score: 0,
    coins: 0,
    hits: [],
    visits: [],
    counts: {},
    seen: [],
    granted: [],
    clean: 0,
    priorBoard: 0,
    priorMiss: false,
    home: 20,
    dealer: "points",
    wager: false,
    power: null,
    powerSlot: 0,
    usedBoundary: false,
  };
}
export function init(config: Config): Run {
  if (config.version !== RULES_VERSION)
    throw new Error(
      "This run uses an unsupported rules version. Export it before starting a new run."
    );
  if (
    !["social", "regular", "expert"].includes(config.difficulty) ||
    ![16, 17, 19].includes(config.starter) ||
    typeof config.seed !== "string" ||
    config.seed.length > 160
  )
    throw new Error("Invalid run settings.");
  return {
    config,
    phase: "preview",
    round: makeRound(config, 0),
    results: [],
    coins: 4,
    darts: [null, null, null],
    charms: [{ id: config.starter, paid: 0 }],
    consumables: [],
    offers: [],
    shop: {
      generation: 0,
      modifiers: [],
      purchases: 0,
      consumablePurchases: 0,
      refreshes: 0,
    },
  };
}
function assert(condition: unknown, message: string): asserts condition {
  if (!condition) throw new Error(message);
}
export function owned(run: Run): Owned[] {
  return [
    ...run.darts.filter((d): d is Owned => !!d),
    ...run.charms,
    ...run.consumables,
  ];
}
export function purchasePrice(run: Run, id: number) {
  let price = item(id).price;
  if (run.shop.modifiers.includes(48) && run.shop.purchases === 0) price -= 2;
  if (
    run.shop.modifiers.includes(65) &&
    item(id).kind === "consumable" &&
    run.shop.consumablePurchases === 0
  )
    price -= 2;
  return Math.max(1, price);
}
export function salePrice(run: Run, equipment: Owned) {
  return Math.floor(
    equipment.paid * (run.shop.modifiers.includes(66) ? 0.75 : 0.5)
  );
}
export function refreshPrice(run: Run) {
  return run.shop.modifiers.includes(49)
    ? run.shop.refreshes === 0
      ? 0
      : run.shop.refreshes + 1
    : run.shop.refreshes + 2;
}
function stock(run: Run) {
  const ids = new Set(owned(run).map((c) => c.id));
  const eligible = CATALOGUE.filter(
    (i) => i.kind === "consumable" || !ids.has(i.id)
  );
  const pool = shuffled(
    eligible,
    `${run.config.seed}:shop:${run.round.index}:${run.shop.generation}:${run.config.version}`
  );
  if (run.shop.generation > 0) {
    const displayed = new Set(
      run.offers.filter((o) => o.sold).map((o) => o.id)
    );
    run.offers = run.offers.map((offer) => {
      if (offer.sold) return offer;
      const replacement = pool.find(
        (candidate) =>
          candidate.kind === item(offer.id).kind && !displayed.has(candidate.id)
      );
      assert(replacement, "No replacement offer is available.");
      displayed.add(replacement.id);
      return { id: replacement.id, sold: false };
    });
    return;
  }
  run.offers = (["charm", "dart", "consumable"] as const)
    .flatMap((kind) =>
      pool
        .filter((i) => i.kind === kind)
        .slice(
          0,
          kind === "charm"
            ? run.shop.modifiers.includes(50)
              ? 3
              : 2
            : kind === "dart"
            ? 2
            : 1
        )
    )
    .map((i) => ({ id: i.id, sold: false }));
  // At entry, guarantee an affordable, usable scoring purchase; full slots can be sold first.
  if (
    run.shop.generation === 0 &&
    !run.offers.some(
      (o) => item(o.id).kind === "dart" && purchasePrice(run, o.id) <= run.coins
    )
  ) {
    const affordable = pool.find(
      (i) => i.kind === "dart" && purchasePrice(run, i.id) <= run.coins
    );
    if (affordable)
      run.offers[run.offers.findIndex((o) => item(o.id).kind === "dart")] = {
        id: affordable.id,
        sold: false,
      };
  }
}
/** Pure reducer. Replay and the browser always use the same validated actions. */
export function apply(
  run: Run,
  action: Exclude<
    Action,
    {
      type: "undo";
    }
  >
): Run {
  const s: Run = structuredClone(run),
    r = s.round;
  const requirePhase = (phase: Run["phase"]) =>
    assert(s.phase === phase, `This action requires ${phase}.`);
  switch (action.type) {
    case "start":
      requirePhase("preview");
      assert(
        Number.isInteger(action.home) && action.home >= 1 && action.home <= 20,
        "Choose a numbered sector."
      );
      assert(
        action.dealer === "points" || action.dealer === "coins",
        "Choose points or coins."
      );
      assert(
        typeof action.wager === "boolean" &&
          (!action.wager || (has(s, 67) && r.index < 8)),
        "High Roller is unavailable."
      );
      r.home = action.home;
      r.dealer = action.dealer;
      r.wager = action.wager;
      r.target = action.wager
        ? Math.ceil(r.standardTarget * 1.2)
        : r.standardTarget;
      r.budget = 12 + (has(s, 41) ? 2 : 0) + (has(s, 42) ? 3 : 0);
      s.phase = "playing";
      break;
    case "throw":
      requirePhase("playing");
      assert(validHit(action.hit), "Record a valid dart hit.");
      assert(
        r.hits.length < Math.min(3, r.budget - r.spent),
        "Score this visit before recording another dart."
      );
      r.hits.push(action.hit);
      break;
    case "bank":
      requirePhase("playing");
      assert(
        r.hits.length === Math.min(3, r.budget - r.spent),
        "Finish recording this visit."
      );
      resolveVisit(s);
      if (r.score >= r.target || r.spent === r.budget) s.phase = "pending";
      break;
    case "commit": {
      requirePhase("pending");
      const won = r.score >= r.target;
      let reward = won
        ? (r.boss ? 8 : 5) +
          Math.min(2, Math.floor(Math.max(0, 12 - r.spent) / 3)) +
          r.coins
        : 0;
      if (won) {
        if (has(s, 42)) reward--;
        if (has(s, 47) && r.counts.bulls) reward += 2;
        if (has(s, 64) && r.spent <= 6) reward++;
        if (r.wager) reward += 3;
      }
      s.coins += reward;
      s.results.push({
        index: r.index,
        target: r.target,
        standardTarget: r.standardTarget,
        score: r.score,
        darts: r.spent,
        won,
        coins: reward,
        visits: r.visits,
      });
      if (!won || r.index === 8) s.phase = won ? "won" : "lost";
      else {
        s.phase = "shop";
        s.shop = {
          generation: 0,
          modifiers: s.charms.map((c) => c.id),
          purchases: 0,
          consumablePurchases: 0,
          refreshes: 0,
        };
        stock(s);
      }
      break;
    }
    case "next":
      requirePhase("shop");
      s.round = makeRound(s.config, r.index + 1);
      s.phase = "preview";
      s.offers = [];
      break;
    case "buy": {
      requirePhase("shop");
      assert(Number.isInteger(action.offer), "Invalid offer.");
      const offer = s.offers[action.offer];
      assert(offer && !offer.sold, "This offer is no longer available.");
      const def = item(offer.id),
        price = purchasePrice(s, offer.id);
      assert(s.coins >= price, "Not enough coins.");
      assert(
        def.kind === "consumable" || !owned(s).some((o) => o.id === def.id),
        "Already equipped."
      );
      const equipment = { id: def.id, paid: price };
      if (def.kind === "dart") {
        assert(
          Number.isInteger(action.slot) &&
            action.slot! >= 0 &&
            action.slot! < 3,
          "Choose dart slot 1, 2, or 3."
        );
        assert(
          !s.darts[action.slot!],
          "Sell the existing dart before replacing it."
        );
        s.darts[action.slot!] = equipment;
      } else if (def.kind === "charm") {
        assert(
          s.charms.length < 5,
          "All five charm slots are full. Sell a charm first."
        );
        s.charms.push(equipment);
      } else {
        assert(s.consumables.length < 2, "Both consumable slots are full.");
        s.consumables.push(equipment);
        s.shop.consumablePurchases++;
      }
      s.coins -= price;
      s.shop.purchases++;
      offer.sold = true;
      break;
    }
    case "sell": {
      requirePhase("shop");
      const equipment = owned(s).find((c) => c.id === action.id);
      assert(equipment, "Equipment not found.");
      s.coins += salePrice(s, equipment);
      if (item(action.id).kind === "dart")
        s.darts = s.darts.map((d) => (d?.id === action.id ? null : d));
      else {
        const bag = item(action.id).kind === "charm" ? s.charms : s.consumables;
        bag.splice(
          bag.findIndex((c) => c.id === action.id),
          1
        );
      }
      break;
    }
    case "swap": {
      requirePhase("shop");
      assert(
        [action.from, action.to].every(
          (n) => Number.isInteger(n) && n >= 0 && n < 3
        ),
        "Invalid dart slot."
      );
      [s.darts[action.from], s.darts[action.to]] = [
        s.darts[action.to],
        s.darts[action.from],
      ];
      break;
    }
    case "refresh":
      requirePhase("shop");
      {
        const price = refreshPrice(s);
        assert(s.coins >= price, "Not enough coins.");
        s.coins -= price;
        s.shop.refreshes++;
        s.shop.generation++;
        stock(s);
      }
      break;
    case "use": {
      requirePhase("playing");
      assert(
        r.hits.length === 0 && !r.usedBoundary,
        "Use one powerup before throwing a visit."
      );
      const index = s.consumables.findIndex((c) => c.id === action.id);
      assert(index >= 0, "Powerup not found.");
      if (action.id === 51) {
        assert(r.budget < 24, "This round already has 24 darts.");
        r.budget++;
      } else {
        if (action.id === 53)
          assert(r.boss, "House Pass requires a boss round.");
        if (action.id === 60)
          assert(
            Number.isInteger(action.slot) &&
              action.slot! >= 0 &&
              action.slot! < 3 &&
              !!s.darts[action.slot!],
            "Choose an equipped special dart."
          );
        r.power = action.id;
        r.powerSlot = action.slot ?? 0;
      }
      s.consumables.splice(index, 1);
      r.usedBoundary = true;
      break;
    }
    default:
      throw new Error("Unknown run action.");
  }
  return s;
}
export function canonicalActions(actions: Action[]): Exclude<
  Action,
  {
    type: "undo";
  }
>[] {
  const result: Exclude<
    Action,
    {
      type: "undo";
    }
  >[] = [];
  for (const action of actions) {
    if (action.type === "cancelUse") {
      assert(
        result.at(-1)?.type === "use",
        "A powerup can only be cancelled before recording any affected darts."
      );
      result.pop();
      continue;
    }
    if (action.type !== "undo") {
      result.push(action);
      continue;
    }
    let index = result.length - 1;
    for (; index >= 0; index--) {
      if (result[index].type === "commit" || result[index].type === "start")
        break;
      if (result[index].type === "throw") break;
    }
    assert(
      index >= 0 && result[index].type === "throw",
      "There is no editable dart to undo."
    );
    result.splice(index);
  }
  return result;
}
export function replay(config: Config, actions: Action[]): Run {
  assert(actions.length <= 2500, "This run has too many actions.");
  return canonicalActions(actions).reduce((s, a) => apply(s, a), init(config));
}
export function summary(run: Run) {
  const rounds = run.results,
    visits = rounds.flatMap((r) => r.visits),
    darts = rounds.reduce((n, r) => n + r.darts, 0);
  return {
    cleared: rounds.filter((r) => r.won).length,
    progress: rounds.reduce(
      (n, r) => n + Math.min(r.score, r.standardTarget),
      0
    ),
    darts,
    rawScore: rounds.reduce((n, r) => n + r.score, 0),
    bestVisit: Math.max(0, ...visits.map((v) => v.score)),
    average: darts ? (visits.reduce((n, v) => n + v.board, 0) / darts) * 3 : 0,
  };
}
