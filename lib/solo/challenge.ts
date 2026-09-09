import { RULES_VERSION, type Difficulty } from "@/lib/games/roguelike/types";
export function weeklyChallenge(now = new Date()) {
  const start = new Date(
    Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), now.getUTCDate())
  );
  start.setUTCDate(start.getUTCDate() - ((start.getUTCDay() + 6) % 7));
  const id = start.toISOString().slice(0, 10);
  return {
    id,
    seed: `weekly:${id}:${RULES_VERSION}`,
    version: RULES_VERSION,
    opensAt: start.toISOString(),
    closesAt: new Date(+start + 7 * 86400000).toISOString(),
  };
}
export function difficulty(value: unknown): Difficulty {
  if (value === "social" || value === "regular" || value === "expert")
    return value;
  throw new Error("Choose Social, Regular, or Expert.");
}
export interface Rankable {
  cleared: number;
  progress: number;
  darts: number;
}
export const compareRuns = (a: Rankable, b: Rankable) =>
  b.cleared - a.cleared || b.progress - a.progress || a.darts - b.darts;
export function rankRows<T extends Rankable>(rows: T[]) {
  const sorted = [...rows].sort(compareRuns);
  let rank = 0;
  return sorted.map((row, i) => {
    if (!i || compareRuns(row, sorted[i - 1])) rank = i + 1;
    return { ...row, rank };
  });
}
