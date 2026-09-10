import { item } from "./catalogue";
import type { Hit, Run, VisitResult } from "./types";
export const BOARD_ORDER = [
  20, 1, 18, 4, 13, 6, 10, 15, 2, 17, 3, 19, 7, 16, 8, 11, 14, 9, 12, 5,
];
export function boardPoints(hit: Hit): number {
  return hit.ring === "M"
    ? 0
    : hit.ring === "OB"
    ? 25
    : hit.ring === "IB"
    ? 50
    : hit.sector * { S: 1, D: 2, T: 3 }[hit.ring];
}
export function validHit(hit: Hit): boolean {
  return hit.ring === "M"
    ? hit.sector === 0
    : ["OB", "IB"].includes(hit.ring)
    ? hit.sector === 25
    : ["S", "D", "T"].includes(hit.ring) &&
      Number.isInteger(hit.sector) &&
      hit.sector >= 1 &&
      hit.sector <= 20;
}
export const adjacent = (a: number, b: number) =>
  a !== b &&
  [1, 19].includes(Math.abs(BOARD_ORDER.indexOf(a) - BOARD_ORDER.indexOf(b)));
/** Mutates only the caller's cloned run. The returned visit retains physical hits. */
export function resolveVisit(run: Run): VisitResult {
  const r = run.round,
    raw = r.hits,
    power = r.power;
  const has = (id: number) => run.charms.some((c) => c.id === id);
  const seenThisVisit = new Set<number>();
  const hits = raw.map((hit) => {
    if (hit.ring === "M") return null;
    if (power !== 53 && r.boss === "bouncer" && hit.sector === 20) return null;
    if (power !== 53 && r.boss === "wanderer" && hit.sector <= 20) {
      if (seenThisVisit.has(hit.sector)) return null;
      seenThisVisit.add(hit.sector);
    }
    let result = { ...hit };
    if (power !== 53 && r.boss === "minimalist" && result.ring === "T")
      result.ring = "S";
    if (power === 57 && result.sector <= 20) result.ring = "S";
    if (power === 58 && result.ring === "OB") result.ring = "IB";
    return result;
  });
  const result: VisitResult = {
    hits: [...raw],
    board: raw.reduce((n, h) => n + boardPoints(h), 0),
    base: 0,
    bonus: 0,
    mult: 1,
    amplifier: 1,
    score: 0,
    effects: [],
  };
  let currentDart: number | undefined;
  const attribution = () =>
    currentDart === undefined ? {} : { dartIndex: currentDart };
  const add = (id: number, points = 0, mult = 0, slot = -1) => {
    if (!points && !mult) return;
    if (power === 60 && slot === r.powerSlot) {
      points *= 2;
      mult *= 2;
    }
    if (power === 55 && id !== 54 && id !== 59) points *= 2;
    result.bonus += points;
    result.mult += mult;
    result.effects.push({
      id,
      label: item(id).name,
      points,
      mult,
      ...attribution(),
    });
  };
  const count = (key: string, amount = 1) =>
    (r.counts[key] = (r.counts[key] || 0) + amount);
  const coin = (id: number, n: number, cap: number) => {
    const before = r.counts["coin" + id] || 0,
      gain = Math.max(0, Math.min(n, cap - before));
    if (gain) {
      count("coin" + id, gain);
      r.coins += gain;
      result.effects.push({
        id,
        label: item(id).name,
        coins: gain,
        ...attribution(),
      });
    }
  };
  const numbers = hits.flatMap((h) => (h && h.sector <= 20 ? [h.sector] : []));
  const distinct = new Set(numbers),
    all = hits.length === 3 && hits.every(Boolean),
    any = hits.some(Boolean);
  const base = hits.reduce((n, h) => n + (h ? boardPoints(h) : 0), 0);
  result.base = base;
  const previousSeen = new Set(r.seen);
  hits.forEach((h, i) => {
    currentDart = i;
    if (!h) return;
    const n = h.sector,
      prev = hits[i - 1],
      pnum = prev && prev.sector <= 20 ? prev.sector : 0;
    const dart = run.darts[i]?.id;
    switch (dart) {
      case 1:
        if (h.ring === "S") add(1, 12, 0, i);
        break;
      case 2:
        add(2, 8, 0, i);
        break;
      case 3:
        if (h.ring === "D") add(3, 30, 0, i);
        break;
      case 4:
        if (n === 25) add(4, 40, 0, i);
        break;
      case 5:
        if (pnum === n) add(5, 20, 0, i);
        break;
      case 6:
        if (i === 0) add(6, 0, 0.5, i);
        break;
      case 7:
        if (i === 2 && hits[0] && hits[1]) add(7, 25, 0, i);
        break;
      case 8:
        if (pnum && n <= 20 && n > pnum) add(8, 0, 0.5, i);
        break;
      case 9:
        if (pnum && n <= 20 && adjacent(n, pnum)) add(9, 25, 0, i);
        break;
      case 10:
        if (n <= 5) add(10, 25, 0, i);
        break;
      case 11:
        if ([2, 3, 5, 7, 11, 13, 17, 19].includes(n)) add(11, 0, 0.4, i);
        break;
      case 12:
        if (h.ring === "T") add(12, 0, 0.75, i);
        break;
      case 13:
        if (raw[i - 1]?.ring === "M") add(13, 30, 0, i);
        break;
      case 14:
        if (pnum && n <= 20 && n % 2 !== pnum % 2) add(14, 18, 0, i);
        break;
      case 15:
        add(15, Math.min(24, (r.counts.growing || 0) * 4), 0, i);
        count("growing");
        break;
    }
    if (has(16) && h.ring === "S") add(16, 10);
    if (has(17) && h.ring === "D") add(17, 0, 0.5);
    if (has(20) && n <= 20 && n % 2) add(20, 12);
    if (has(21) && n === 25) add(21, 0, 1);
    if (has(24) && n <= 20 && n % 2 === 0) add(24, 0, 0.25);
    if (has(30) && n <= 20 && !previousSeen.has(n)) {
      add(30, 10);
      previousSeen.add(n);
    }
    if (has(31) && n === r.home) add(31, 15);
    if (n <= 20 && !r.seen.includes(n)) r.seen.push(n);
    if (h.ring === "D") {
      count("doubles");
      if (has(61)) coin(61, 1, 1);
    }
    if (h.ring === "S") {
      if (count("singles") % 3 === 0 && has(62)) coin(62, 1, 2);
    }
    if (h.ring === "IB" && has(63)) coin(63, 2, 2);
    if (n === 25) count("bulls");
    if (n === r.house) {
      const houseHits = count("house");
      if (has(68)) add(68, 25);
      if (has(69)) coin(69, 1, 3);
      if (has(70)) add(70, 0, 0.5);
      if (has(72)) {
        if (r.dealer === "points") add(72, 20);
        else if (houseHits % 2 === 0) coin(72, 1, 3);
      }
    }
  });
  currentDart = undefined;
  if (has(18) && distinct.size < numbers.length) add(18, 0, 1);
  if (has(19) && distinct.size === 3) add(19, 0, 1);
  if (has(22) && hits[2] && boardPoints(hits[2]) >= 20) {
    currentDart = 2;
    add(22, 0, 0.75);
    currentDart = undefined;
  }
  if (has(23) && all) {
    result.amplifier = 1.5;
    result.effects.push({ id: 23, label: "House Special ×1.5" });
  }
  if (numbers.length === 3) {
    if (has(25) && numbers[0] < numbers[1] && numbers[1] < numbers[2])
      add(25, 0, 1.5);
    if (has(26) && numbers[0] > numbers[1] && numbers[1] > numbers[2])
      add(26, 50);
    if (has(27) && numbers[0] === numbers[2] && numbers[0] !== numbers[1])
      add(27, 0, 1.25);
    if (has(29) && distinct.size === 1) add(29, 60);
    if (
      has(32) &&
      distinct.size === 3 &&
      numbers.some(
        (n) =>
          adjacent(n, numbers.find((x) => x !== n)!) &&
          numbers.filter((x) => x !== n).every((x) => adjacent(n, x))
      )
    )
      add(32, 0, 1.5);
  }
  if (
    has(28) &&
    all &&
    ["S", "D", "T"].every((ring) => hits.some((h) => h?.ring === ring))
  )
    add(28, 0, 2);
  r.clean = all ? r.clean + 1 : 0;
  if (has(33) && all) add(33, 0, Math.min(1, r.clean * 0.25));
  if (has(34) && r.priorMiss && any) add(34, 30);
  if (has(35) && r.budget - r.spent <= 3 && any && !r.counts.lastOrders) {
    add(35, 0, 1);
    r.counts.lastOrders = 1;
  }
  if (has(36) && r.visits.length >= 4 && any) add(36, 20);
  if (has(37) && all && base <= 30) add(37, 0, 2);
  if (has(38) && r.visits.length && base > r.priorBoard) add(38, 0, 0.75);
  if (has(39) && [25, 50, 75, 100].includes(base)) add(39, 40);
  if (
    has(40) &&
    all &&
    numbers.some((n) => n <= 10) &&
    numbers.some((n) => n > 10)
  )
    add(40, 0, 0.75);
  if (power === 54 && any) add(54, 40);
  if (power === 56 && any) add(56, 0, 1);
  if (power === 59) add(59, raw.filter((h) => h.ring === "M").length * 15);
  r.priorBoard = base;
  r.priorMiss = raw.some((h) => h.ring === "M");
  result.score = Math.floor(
    (base + result.bonus) * result.mult * result.amplifier + 1e-8
  );
  r.spent += raw.length;
  r.score += result.score;
  const grant = (id: number, n: number, condition: boolean) => {
    if (!condition || r.granted.includes(id)) return;
    r.granted.push(id);
    const gain = Math.min(n, 24 - r.budget);
    r.budget += gain;
    if (gain) result.effects.push({ id, label: item(id).name, darts: gain });
  };
  if (r.score < r.target) {
    grant(43, 1, has(43) && !!r.counts.doubles);
    grant(44, 2, has(44) && r.seen.length >= 6);
    grant(45, 2, has(45) && raw.filter((h) => h.ring === "M").length >= 2);
    // Consumables are single-use instances; repeated purchases can earn separate contracts.
    if (power === 52 && hits.some((h) => h?.sector === 25)) {
      const gain = Math.min(3, 24 - r.budget);
      r.budget += gain;
      if (gain)
        result.effects.push({ id: 52, label: "Bull Contract", darts: gain });
    }
    grant(71, 2, has(71) && r.counts.house >= 3);
    grant(46, 3, has(46) && r.spent === r.budget && r.score >= r.target * 0.8);
  }
  r.power = null;
  r.usedBoundary = false;
  r.hits = [];
  r.visits.push(result);
  return result;
}
