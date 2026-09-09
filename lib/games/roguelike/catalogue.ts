/** Versioned release catalogue. IDs are stable across saves and replay. */
export type ItemKind = "dart" | "charm" | "consumable";
export interface Item {
  id: number;
  name: string;
  description: string;
  kind: ItemKind;
  price: number;
}
export const CATALOGUE: Item[] = [
  {
    id: 1,
    name: "Steady Dart",
    description: "A single adds 12 bonus points.",
    kind: "dart",
    price: 5,
  },
  {
    id: 2,
    name: "Heavy Dart",
    description: "Any hit adds 8 bonus points.",
    kind: "dart",
    price: 5,
  },
  {
    id: 3,
    name: "Precision Dart",
    description: "A double adds 30 bonus points.",
    kind: "dart",
    price: 5,
  },
  {
    id: 4,
    name: "Bull Dart",
    description: "A bull adds 40 bonus points.",
    kind: "dart",
    price: 5,
  },
  {
    id: 5,
    name: "Echo Dart",
    description:
      "Matching the previous dart's eligible number adds 20 bonus points; inactive in slot 1.",
    kind: "dart",
    price: 5,
  },
  {
    id: 6,
    name: "Opening Dart",
    description: "In slot 1, a hit adds +0.5 mult.",
    kind: "dart",
    price: 5,
  },
  {
    id: 7,
    name: "Anchor Dart",
    description:
      "In slot 3, a hit adds 25 bonus points if both earlier darts were eligible hits.",
    kind: "dart",
    price: 5,
  },
  {
    id: 8,
    name: "Climbing Dart",
    description:
      "A numbered hit higher than the previous eligible numbered dart adds +0.5 mult; inactive in slot 1.",
    kind: "dart",
    price: 5,
  },
  {
    id: 9,
    name: "Neighbour Dart",
    description:
      "Hitting a different number adjacent to the previous eligible number in physical board order adds 25 bonus points; inactive in slot 1.",
    kind: "dart",
    price: 5,
  },
  {
    id: 10,
    name: "Underdog Dart",
    description: "A hit on 1\u20135 adds 25 bonus points.",
    kind: "dart",
    price: 5,
  },
  {
    id: 11,
    name: "Prime Dart",
    description: "A hit on 2, 3, 5, 7, 11, 13, 17, or 19 adds +0.4 mult.",
    kind: "dart",
    price: 5,
  },
  {
    id: 12,
    name: "Treble Dart",
    description: "A treble adds +0.75 mult.",
    kind: "dart",
    price: 5,
  },
  {
    id: 13,
    name: "Recovery Dart",
    description:
      "A hit immediately after a physical miss in the same visit adds 30 bonus points.",
    kind: "dart",
    price: 5,
  },
  {
    id: 14,
    name: "Alternator Dart",
    description:
      "A numbered hit of opposite parity to the previous eligible numbered dart adds 18 bonus points; inactive in slot 1.",
    kind: "dart",
    price: 5,
  },
  {
    id: 15,
    name: "Growing Dart",
    description:
      "A hit adds 4 bonus points for every earlier eligible hit made with this virtual dart this round, capped at 24.",
    kind: "dart",
    price: 5,
  },
  {
    id: 16,
    name: "Single Minded",
    description: "Each single adds 10 bonus points.",
    kind: "charm",
    price: 6,
  },
  {
    id: 17,
    name: "Double Trouble",
    description: "Each double adds +0.5 mult.",
    kind: "charm",
    price: 6,
  },
  {
    id: 18,
    name: "Familiar Ground",
    description:
      "At least two hits on the same number add +1 mult, once per visit.",
    kind: "charm",
    price: 6,
  },
  {
    id: 19,
    name: "Grand Tour",
    description: "Three different eligible numbers add +1 mult.",
    kind: "charm",
    price: 6,
  },
  {
    id: 20,
    name: "Odd Company",
    description: "Each odd numbered hit adds 12 bonus points.",
    kind: "charm",
    price: 6,
  },
  {
    id: 21,
    name: "Bull Market",
    description: "Each bull adds +1 mult.",
    kind: "charm",
    price: 6,
  },
  {
    id: 22,
    name: "Finisher",
    description:
      "An eligible dart 3 worth at least 20 board points adds +0.75 mult.",
    kind: "charm",
    price: 6,
  },
  {
    id: 23,
    name: "House Special",
    description: "Amplifier: \u00d71.5 when all three darts are eligible hits.",
    kind: "charm",
    price: 8,
  },
  {
    id: 24,
    name: "Even Company",
    description: "Each even numbered hit adds +0.25 mult.",
    kind: "charm",
    price: 6,
  },
  {
    id: 25,
    name: "Straight Up",
    description:
      "Three eligible numbers in strictly ascending throw order add +1.5 mult.",
    kind: "charm",
    price: 6,
  },
  {
    id: 26,
    name: "Countdown",
    description:
      "Three eligible numbers in strictly descending throw order add 50 bonus points.",
    kind: "charm",
    price: 6,
  },
  {
    id: 27,
    name: "Sandwich",
    description:
      "Eligible darts 1 and 3 share a number and dart 2 hits a different number: +1.25 mult.",
    kind: "charm",
    price: 6,
  },
  {
    id: 28,
    name: "Ring Circus",
    description:
      "One single, one double, and one treble, in any order, add +2 mult.",
    kind: "charm",
    price: 8,
  },
  {
    id: 29,
    name: "Hat Trick",
    description: "All three eligible hits share a number: add 60 bonus points.",
    kind: "charm",
    price: 6,
  },
  {
    id: 30,
    name: "Around the Clock",
    description:
      "Each number's first eligible hit of the round adds 10 bonus points.",
    kind: "charm",
    price: 6,
  },
  {
    id: 31,
    name: "Home Ground",
    description:
      "Choose a number in round preview; each eligible hit on it adds 15 bonus points. Choice locks before throwing.",
    kind: "charm",
    price: 6,
  },
  {
    id: 32,
    name: "Neighbourhood",
    description:
      "Three distinct eligible numbers forming a consecutive group around the physical board, in any throw order, add +1.5 mult.",
    kind: "charm",
    price: 6,
  },
  {
    id: 33,
    name: "Clean Sheet",
    description:
      "A visit with three eligible hits adds +0.25 mult per consecutive full, all-hit visit this round, including this visit, capped at +1. A miss, disabled hit, or partial visit resets the streak.",
    kind: "charm",
    price: 6,
  },
  {
    id: 34,
    name: "Second Wind",
    description:
      "After a visit containing a physical miss, the next visit adds 30 bonus points if it contains any eligible hit. Does not stack across visits.",
    kind: "charm",
    price: 6,
  },
  {
    id: 35,
    name: "Last Orders",
    description:
      "A visit that starts with three or fewer remaining darts adds +1 mult if it contains an eligible hit, once per round.",
    kind: "charm",
    price: 6,
  },
  {
    id: 36,
    name: "Patient Player",
    description:
      "From visit 5 onward, each visit containing an eligible hit adds 20 bonus points.",
    kind: "charm",
    price: 6,
  },
  {
    id: 37,
    name: "Small Fortune",
    description:
      "A full visit of three eligible hits totaling at most 30 board points adds +2 mult.",
    kind: "charm",
    price: 6,
  },
  {
    id: 38,
    name: "Rising Form",
    description:
      "A visit's eligible board total exceeding the previous visit's adds +0.75 mult; inactive on visit 1.",
    kind: "charm",
    price: 6,
  },
  {
    id: 39,
    name: "Exact Change",
    description:
      "An eligible board total of exactly 25, 50, 75, or 100 adds 40 bonus points.",
    kind: "charm",
    price: 6,
  },
  {
    id: 40,
    name: "Split Decision",
    description:
      "A full visit of three eligible hits including both a number from 1\u201310 and one from 11\u201320 adds +0.75 mult.",
    kind: "charm",
    price: 6,
  },
  {
    id: 41,
    name: "Deep Pockets",
    description: "Grant +2 darts at the start of every round.",
    kind: "charm",
    price: 7,
  },
  {
    id: 42,
    name: "Spare Set",
    description:
      "Grant +3 darts at round start, but subtract 1 coin from the round's base clear reward.",
    kind: "charm",
    price: 8,
  },
  {
    id: 43,
    name: "Double Delivery",
    description:
      "The round's first eligible double grants +1 dart after its visit.",
    kind: "charm",
    price: 6,
  },
  {
    id: 44,
    name: "Scenic Route",
    description:
      "On reaching six distinct eligible numbers in a round, grant +2 darts after that visit, once per round.",
    kind: "charm",
    price: 6,
  },
  {
    id: 45,
    name: "Safety Net",
    description:
      "The first visit containing two or more physical misses grants +2 darts, once per round.",
    kind: "charm",
    price: 6,
  },
  {
    id: 46,
    name: "Overtime",
    description:
      "If a visit exhausts the budget while below target but at or above 80% of it, grant +3 darts, once per round.",
    kind: "charm",
    price: 8,
  },
  {
    id: 47,
    name: "Tip Jar",
    description:
      "Clearing a round with at least one eligible bull recorded awards +2 coins.",
    kind: "charm",
    price: 6,
  },
  {
    id: 48,
    name: "Bargain Hunter",
    description:
      "The first purchase in each shop costs 2 fewer coins, minimum price 1.",
    kind: "charm",
    price: 6,
  },
  {
    id: 49,
    name: "Shopkeeper's Friend",
    description:
      "The first refresh in each shop is free; subsequent paid refreshes cost 2, then 3, then 4 coins, etc.",
    kind: "charm",
    price: 6,
  },
  {
    id: 50,
    name: "Collector's Case",
    description:
      "Add one charm offer to each shop. It adds a shop offer, not an equipped charm slot.",
    kind: "charm",
    price: 6,
  },
  {
    id: 51,
    name: "Pocket Dart",
    description: "Immediately grant +1 dart to this round.",
    kind: "consumable",
    price: 4,
  },
  {
    id: 52,
    name: "Bull Contract",
    description:
      "The next visit grants +3 darts if it contains an eligible bull, once.",
    kind: "consumable",
    price: 4,
  },
  {
    id: 53,
    name: "House Pass",
    description:
      "Ignore the current boss rule for the next visit. Only usable in a boss round.",
    kind: "consumable",
    price: 4,
  },
  {
    id: 54,
    name: "Chalk Boost",
    description:
      "The next visit containing an eligible hit adds 40 bonus points; expires after the upcoming visit whether it hits or misses.",
    kind: "consumable",
    price: 4,
  },
  {
    id: 55,
    name: "Double Ink",
    description:
      "Double all bonus points produced by equipment in the next visit; does not double base points, multiplier bonuses, or other consumable bonuses.",
    kind: "consumable",
    price: 4,
  },
  {
    id: 56,
    name: "Focus Tonic",
    description: "The next visit adds +1 mult if it contains any eligible hit.",
    kind: "consumable",
    price: 4,
  },
  {
    id: 57,
    name: "Single Service",
    description:
      "Each eligible numbered hit in the next visit is treated as a single for run scoring and equipment triggers. Physical stats remain unchanged.",
    kind: "consumable",
    price: 4,
  },
  {
    id: 58,
    name: "Bullseye Lens",
    description:
      "Eligible outer bulls in the next visit use inner-bull value and classification for run scoring. Physical stats remain unchanged.",
    kind: "consumable",
    price: 4,
  },
  {
    id: 59,
    name: "Salvage Ticket",
    description:
      "Each physical miss in the next visit adds 15 bonus points; misses stay misses and do not become eligible hits or trigger hit combos.",
    kind: "consumable",
    price: 4,
  },
  {
    id: 60,
    name: "Loaded Flight",
    description:
      "Choose a virtual dart slot before the next visit; double the bonus points and multiplier bonuses generated by that dart variant for that visit. Does not affect charms or physical points.",
    kind: "consumable",
    price: 4,
  },
  {
    id: 61,
    name: "Double Pay",
    description:
      "The first eligible numbered double in a round earns +1 coin, once per round.",
    kind: "charm",
    price: 6,
  },
  {
    id: 62,
    name: "Loose Change",
    description:
      "Every third eligible single earns +1 coin, capped at 2 coins per round.",
    kind: "charm",
    price: 6,
  },
  {
    id: 63,
    name: "Cash Bull",
    description:
      "The first eligible inner bull earns +2 coins, once per round.",
    kind: "charm",
    price: 6,
  },
  {
    id: 64,
    name: "Clean Checkout",
    description:
      "Clear the round with at least six unused baseline darts to gain +1 coin, in addition to normal early-clear income. No exact finish is required.",
    kind: "charm",
    price: 6,
  },
  {
    id: 65,
    name: "Coupon Book",
    description:
      "The first consumable purchased in each shop costs 2 fewer coins; apply combined discounts with a final minimum price of 1.",
    kind: "charm",
    price: 6,
  },
  {
    id: 66,
    name: "Pawn Broker",
    description:
      "Purchased equipment sells for 75% of its actual paid price, rounded down, while this shop-entry modifier is active. Starter equipment still sells for zero.",
    kind: "charm",
    price: 6,
  },
  {
    id: 67,
    name: "High Roller",
    description:
      "Before throwing, optionally raise the encounter target by 20%, rounded up, for +3 coins on clearance. Once per round; unavailable when there is no subsequent shop.",
    kind: "charm",
    price: 6,
  },
  {
    id: 68,
    name: "House Number",
    description:
      "Each eligible hit on this round's highlighted number adds 25 bonus points.",
    kind: "charm",
    price: 8,
  },
  {
    id: 69,
    name: "Bounty Board",
    description:
      "Each eligible hit on the House Number earns +1 coin, capped at 3 coins per round.",
    kind: "charm",
    price: 6,
  },
  {
    id: 70,
    name: "Hot Number",
    description:
      "Each eligible hit on the House Number adds +0.5 visit multiplier, capped at +1.5 per visit.",
    kind: "charm",
    price: 8,
  },
  {
    id: 71,
    name: "Encore Number",
    description:
      "The third eligible hit on the House Number in a round grants +2 darts after that visit, once per round.",
    kind: "charm",
    price: 8,
  },
  {
    id: 72,
    name: "Dealer's Choice",
    description:
      "Choose Points or Coins in round preview. Points: each eligible House Number hit adds 20 bonus points. Coins: every second eligible House Number hit earns +1 coin, capped at 3 per round. Choice locks before throwing.",
    kind: "charm",
    price: 8,
  },
];
export function item(id: number): Item {
  const found = CATALOGUE.find((entry) => entry.id === id);
  if (!found) throw new Error("Unknown equipment.");
  return found;
}
