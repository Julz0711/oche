import { it, expect } from "vitest";
import { decodeSave, writeSave, SAVE_KEY, type Save } from "./storage";
import { RULES_VERSION } from "@/lib/games/roguelike/types";
const save: Save = {
  config: {
    id: "save",
    seed: "seed",
    difficulty: "regular",
    starter: 16,
    version: RULES_VERSION,
  },
  actions: [],
  revision: "first",
};
it("rejects corrupt saves and incompatible rule versions", () => {
  expect(() => decodeSave("{")).toThrow();
  expect(() =>
    decodeSave(
      JSON.stringify({ ...save, config: { ...save.config, version: "old" } })
    )
  ).toThrow("unsupported");
});
it("retains a backup and rejects a stale tab write", () => {
  const values = new Map<string, string>();
  const storage = {
    getItem: (k: string) => values.get(k) ?? null,
    setItem: (k: string, v: string) => {
      values.set(k, v);
    },
  };
  writeSave(save, storage, null);
  const next = { ...save, revision: "second" };
  writeSave(next, storage, "first");
  expect(decodeSave(values.get(SAVE_KEY + ".backup")!).revision).toBe("first");
  expect(() => writeSave(save, storage, "first")).toThrow("another tab");
  expect(decodeSave(values.get(SAVE_KEY)!).revision).toBe("second");
});
