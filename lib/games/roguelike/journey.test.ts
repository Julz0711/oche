import { it, expect } from "vitest";
import { apply, init, replay, makeRound, purchasePrice } from "./engine";
import { resolveVisit } from "./scoring";
import { item } from "./catalogue";
import { RULES_VERSION, type Action, type Run, type Config } from "./types";
function potential(run: Run) {
  const next = structuredClone(run);
  next.round = makeRound(next.config, Math.min(8, next.round.index + 1));
  next.round.hits = [19, 18, 17].map((sector) => ({ sector, ring: "D" }));
  return resolveVisit(next).score;
}
it("completes nine rounds using real purchases and replays the entire winning run", () => {
  const config: Config = {
    id: "journey",
    seed: "full-run",
    starter: 17,
    difficulty: "regular",
    version: RULES_VERSION,
  };
  let state = init(config);
  const log: Action[] = [];
  const act = (action: Action) => {
    log.push(action);
    state = apply(state, action);
  };
  while (state.phase !== "won" && state.phase !== "lost") {
    if (state.phase === "preview")
      act({ type: "start", home: 19, dealer: "points", wager: false });
    else if (state.phase === "playing") {
      for (const sector of [19, 18, 17].slice(
        0,
        Math.min(3, state.round.budget - state.round.spent)
      ))
        act({ type: "throw", hit: { sector, ring: "D" } });
      act({ type: "bank" });
    } else if (state.phase === "pending") act({ type: "commit" });
    else if (state.phase === "shop") {
      const options: { action: Action; gain: number }[] = [];
      for (let offer = 0; offer < state.offers.length; offer++) {
        const o = state.offers[offer];
        if (o.sold || purchasePrice(state, o.id) > state.coins) continue;
        if (item(o.id).kind === "consumable") continue;
        for (let slot = 0; slot < 3; slot++)
          try {
            const action: Action = { type: "buy", offer, slot };
            const bought = apply(state, action);
            options.push({
              action,
              gain: potential(bought) - potential(state),
            });
          } catch {}
      }
      options.sort((a, b) => b.gain - a.gain);
      if (options[0]?.gain > 0) act(options[0].action);
      else act({ type: "next" });
    }
  }
  expect(state.phase).toBe("won");
  expect(state.results).toHaveLength(9);
  expect(replay(config, log)).toEqual(state);
  expect(state.charms.length).toBeLessThanOrEqual(5);
  expect(log.filter((a) => a.type === "buy").length).toBeGreaterThan(0);
});
