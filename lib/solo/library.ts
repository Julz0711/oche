import { decodeSave, SAVE_KEY, type Save } from "./storage";
import { canonicalActions } from "@/lib/games/roguelike/engine";
export interface RunSave extends Save {
  updatedAt?: string;
  abandonedAt?: string;
}
const PREFIX = "oche.solo.library.v1.";
const keyFor = (id: string) => PREFIX + encodeURIComponent(id);
export function readRuns(storage: Storage): RunSave[] {
  const runs: RunSave[] = [];
  for (let i = 0; i < storage.length; i++) {
    const key = storage.key(i);
    if (key?.startsWith(PREFIX) && !key.endsWith(".backup")) {
      runs.push(decodeSave(storage.getItem(key)!) as RunSave);
    }
  }
  return runs.sort((a, b) =>
    (b.updatedAt ?? "").localeCompare(a.updatedAt ?? "")
  );
}
export function migrateRuns(storage: Storage) {
  const legacy = storage.getItem(SAVE_KEY);
  const history = JSON.parse(storage.getItem(SAVE_KEY + ".history") ?? "[]");
  if (!Array.isArray(history))
    throw new Error("Invalid solo run history. Existing saves have been kept.");
  for (const raw of [
    ...(legacy ? [legacy] : []),
    ...history.map((entry) => JSON.stringify(entry)),
  ]) {
    const save = decodeSave(raw);
    if (!storage.getItem(keyFor(save.config.id)))
      storage.setItem(keyFor(save.config.id), raw);
  }
}
export function writeRun(
  save: RunSave,
  storage: Storage,
  expectedRevision: string | null
) {
  const key = keyFor(save.config.id);
  const current = storage.getItem(key);
  const previous = current ? (decodeSave(current) as RunSave) : null;
  if ((previous?.revision ?? null) !== expectedRevision)
    throw new Error(
      "This run changed in another tab. Return to the solo hub and reopen it."
    );
  if (previous?.abandonedAt)
    throw new Error("This run has ended and cannot be resumed.");
  if (current) storage.setItem(key + ".backup", current);
  storage.setItem(
    key,
    JSON.stringify({ ...save, actions: canonicalActions(save.actions) })
  );
}
