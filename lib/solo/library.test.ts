import { it, expect } from "vitest";
import { migrateRuns, readRuns, writeRun, type RunSave } from "./library";
import { SAVE_KEY } from "./storage";
import { RULES_VERSION } from "@/lib/games/roguelike/types";
function storage(): Storage {
  const values = new Map<string, string>();
  return {
    get length() {
      return values.size;
    },
    key: (i) => [...values.keys()][i] ?? null,
    getItem: (k) => values.get(k) ?? null,
    setItem: (k, v) => {
      values.set(k, v);
    },
    removeItem: (k) => {
      values.delete(k);
    },
    clear: () => values.clear(),
  };
}
const save = (id: string): RunSave => ({
  config: {
    id,
    seed: id,
    difficulty: "regular",
    starter: 16,
    version: RULES_VERSION,
  },
  actions: [],
  revision: "first",
});
it("migrates current and historical saves once without replacing newer progress", () => {
  const s = storage();
  s.setItem(SAVE_KEY, JSON.stringify(save("a")));
  s.setItem(SAVE_KEY + ".history", JSON.stringify([save("b")]));
  migrateRuns(s);
  writeRun({ ...save("a"), revision: "second" }, s, "first");
  migrateRuns(s);
  expect(readRuns(s)).toHaveLength(2);
  expect(readRuns(s).find((r) => r.config.id === "a")?.revision).toBe("second");
  expect(s.getItem(SAVE_KEY)).not.toBeNull();
});
it("isolates run revisions, retains backups, and prevents reopening an abandoned run", () => {
  const s = storage();
  writeRun(save("a"), s, null);
  writeRun(save("b"), s, null);
  writeRun(
    { ...save("a"), revision: "second", abandonedAt: "2026-09-10" },
    s,
    "first"
  );
  expect(() => writeRun(save("a"), s, "first")).toThrow("another tab");
  expect(() => writeRun(save("a"), s, "second")).toThrow("ended");
  writeRun({ ...save("b"), revision: "second" }, s, "first");
  expect(readRuns(s)).toHaveLength(2);
  expect(
    readRuns(s).find((r) => r.config.id === "a")?.abandonedAt
  ).toBeTruthy();
});
