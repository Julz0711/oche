import { canonicalActions, replay } from "@/lib/games/roguelike/engine";
import type { Action, Config } from "@/lib/games/roguelike/types";
export const SAVE_KEY = "oche.solo.run.v1";
export interface Save {
  config: Config;
  actions: Action[];
  revision: string;
}
export function decodeSave(raw: string): Save {
  const saved = JSON.parse(raw) as Save;
  if (
    !saved ||
    !saved.config ||
    !Array.isArray(saved.actions) ||
    typeof saved.revision !== "string"
  )
    throw new Error("Invalid solo save.");
  replay(saved.config, saved.actions);
  return saved;
}
export function writeSave(
  save: Save,
  storage: Pick<Storage, "getItem" | "setItem">,
  expectedRevision: string | null
) {
  const current = storage.getItem(SAVE_KEY);
  if ((current ? decodeSave(current).revision : null) !== expectedRevision)
    throw new Error(
      "This run changed in another tab. Reload before continuing."
    );
  if (current) storage.setItem(SAVE_KEY + ".backup", current);
  storage.setItem(
    SAVE_KEY,
    JSON.stringify({ ...save, actions: canonicalActions(save.actions) })
  );
}
