import styles from "./solo.module.css";

type Tone = "points" | "mult" | "coins" | "darts" | "utility";
type Tag = readonly [label: string, tone: Tone];
// Values describe the reward when triggered; card descriptions retain conditions and caps.
const TAGS: Record<number, readonly Tag[]> = {
  1: [["+12 points", "points"]],
  2: [["+8 points", "points"]],
  3: [["+30 points", "points"]],
  4: [["+40 points", "points"]],
  5: [["+20 points", "points"]],
  6: [["+0.5 mult", "mult"]],
  7: [["+25 points", "points"]],
  8: [["+0.5 mult", "mult"]],
  9: [["+25 points", "points"]],
  10: [["+25 points", "points"]],
  11: [["+0.4 mult", "mult"]],
  12: [["+0.75 mult", "mult"]],
  13: [["+30 points", "points"]],
  14: [["+18 points", "points"]],
  15: [["+0–24 points", "points"]],
  16: [["+10 points", "points"]],
  17: [["+0.5 mult", "mult"]],
  18: [["+1 mult", "mult"]],
  19: [["+1 mult", "mult"]],
  20: [["+12 points", "points"]],
  21: [["+1 mult", "mult"]],
  22: [["+0.75 mult", "mult"]],
  23: [["×1.5 amplifier", "mult"]],
  24: [["+0.25 mult", "mult"]],
  25: [["+1.5 mult", "mult"]],
  26: [["+50 points", "points"]],
  27: [["+1.25 mult", "mult"]],
  28: [["+2 mult", "mult"]],
  29: [["+60 points", "points"]],
  30: [["+10 points", "points"]],
  31: [["+15 points", "points"]],
  32: [["+1.5 mult", "mult"]],
  33: [["+0.25–1 mult", "mult"]],
  34: [["+30 points", "points"]],
  35: [["+1 mult", "mult"]],
  36: [["+20 points", "points"]],
  37: [["+2 mult", "mult"]],
  38: [["+0.75 mult", "mult"]],
  39: [["+40 points", "points"]],
  40: [["+0.75 mult", "mult"]],
  41: [["+2 darts", "darts"]],
  42: [
    ["+3 darts", "darts"],
    ["−1 coin / round", "coins"],
  ],
  43: [["+1 dart", "darts"]],
  44: [["+2 darts", "darts"]],
  45: [["+2 darts", "darts"]],
  46: [["+3 darts", "darts"]],
  47: [["+2 coins", "coins"]],
  48: [["−2 coins · first buy", "coins"]],
  49: [["1 free refresh", "coins"]],
  50: [["+1 charm offer", "coins"]],
  51: [["+1 dart", "darts"]],
  52: [["+3 darts", "darts"]],
  53: [["Bypass boss · 1 visit", "utility"]],
  54: [
    ["+40 points", "points"],
    ["1 visit", "utility"],
  ],
  55: [["×2 bonus points", "points"]],
  56: [
    ["+1 mult", "mult"],
    ["1 visit", "utility"],
  ],
  57: [["Hits → singles", "utility"]],
  58: [["Bull 25 → 50", "utility"]],
  59: [["+15 points / miss", "points"]],
  60: [
    ["×2 dart bonus points", "points"],
    ["×2 dart mult bonus", "mult"],
  ],
  61: [["+1 coin", "coins"]],
  62: [["+1 coin · max 2", "coins"]],
  63: [["+2 coins", "coins"]],
  64: [["+1 coin", "coins"]],
  65: [["−2 coins · first powerup", "coins"]],
  66: [["75% sell value", "coins"]],
  67: [
    ["+3 coins", "coins"],
    ["+20% target", "utility"],
  ],
  68: [["+25 points", "points"]],
  69: [["+1 coin · max 3", "coins"]],
  70: [["+0.5 mult", "mult"]],
  71: [["+2 darts", "darts"]],
  72: [
    ["+20 points OR", "points"],
    ["+1 coin / 2 hits", "coins"],
  ],
};

export default function EquipmentTags({ id }: { id: number }) {
  return (
    <div className={styles.effectTags} aria-label="Effect types">
      {(TAGS[id] ?? []).map(([label, tone]) => (
        <span key={label} data-tone={tone}>
          {label}
        </span>
      ))}
    </div>
  );
}
