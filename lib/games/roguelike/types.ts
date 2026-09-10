export const RULES_VERSION = "house-rules-1";
export type Difficulty = "social" | "regular" | "expert";
export type Ring = "S" | "D" | "T" | "OB" | "IB" | "M";
export interface Hit {
  sector: number;
  ring: Ring;
}
export interface Config {
  id: string;
  seed: string;
  difficulty: Difficulty;
  starter: 16 | 17 | 19;
  version: string;
  challengeId?: string;
  closesAt?: string;
  owner?: string;
}
export type Action =
  | {
      type: "start";
      home: number;
      dealer: "points" | "coins";
      wager: boolean;
    }
  | {
      type: "throw";
      hit: Hit;
    }
  | {
      type: "bank" | "commit" | "next" | "refresh" | "undo" | "cancelUse";
    }
  | {
      type: "buy";
      offer: number;
      slot?: number;
    }
  | {
      type: "sell";
      id: number;
    }
  | {
      type: "swap";
      from: number;
      to: number;
    }
  | {
      type: "use";
      id: number;
      slot?: number;
    };
export interface Owned {
  id: number;
  paid: number;
}
export interface Offer {
  id: number;
  sold: boolean;
}
export interface EffectLine {
  /** Physical dart that triggered this effect; omitted for visit-wide effects. */
  dartIndex?: number;
  id: number;
  label: string;
  points?: number;
  mult?: number;
  coins?: number;
  darts?: number;
}
export interface VisitResult {
  hits: Hit[];
  board: number;
  base: number;
  bonus: number;
  mult: number;
  amplifier: number;
  score: number;
  effects: EffectLine[];
}
export interface Round {
  index: number;
  target: number;
  standardTarget: number;
  boss: "bouncer" | "wanderer" | "minimalist" | null;
  house: number;
  budget: number;
  spent: number;
  score: number;
  coins: number;
  hits: Hit[];
  visits: VisitResult[];
  counts: Record<string, number>;
  seen: number[];
  granted: number[];
  clean: number;
  priorBoard: number;
  priorMiss: boolean;
  home: number;
  dealer: "points" | "coins";
  wager: boolean;
  power: number | null;
  powerSlot: number;
  usedBoundary: boolean;
}
export interface RoundResult {
  index: number;
  target: number;
  standardTarget: number;
  score: number;
  darts: number;
  won: boolean;
  coins: number;
  visits: VisitResult[];
}
export interface Run {
  config: Config;
  phase: "preview" | "playing" | "pending" | "shop" | "won" | "lost";
  round: Round;
  results: RoundResult[];
  coins: number;
  darts: (Owned | null)[];
  charms: Owned[];
  consumables: Owned[];
  offers: Offer[];
  shop: {
    generation: number;
    modifiers: number[];
    purchases: number;
    consumablePurchases: number;
    refreshes: number;
  };
}
