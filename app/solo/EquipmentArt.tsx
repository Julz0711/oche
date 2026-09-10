import {
  Anchor,
  ArrowUpRight,
  Backpack,
  Coins,
  Crown,
  Crosshair,
  Dice5,
  Flame,
  Gem,
  Layers,
  Magnet,
  Repeat2,
  Shield,
  Sparkles,
  Target,
  Ticket,
  TrendingUp,
  Zap,
} from "lucide-react";
import { item } from "@/lib/games/roguelike/catalogue";
import styles from "./solo.module.css";

/** Printed equipment labels: category ink and a stable catalogue mark. */
export default function EquipmentArt({ id }: { id: number }) {
  const def = item(id);
  const name = def.name.toLowerCase();
  const Icon = /bull|precision|steady/.test(name)
    ? Crosshair
    : /coin|cash|pay|change|pocket|jar|bargain|shop|coupon|pawn|roller/.test(
        name
      )
    ? Coins
    : /echo|repeat|familiar|again/.test(name)
    ? Repeat2
    : /anchor/.test(name)
    ? Anchor
    : /climb|ladder|rise|grow/.test(name)
    ? TrendingUp
    : /house|bounty|dealer|roulette|lucky/.test(name)
    ? Dice5
    : /extra|deep|reserve|bag|encore/.test(name)
    ? Backpack
    : /king|crown|royal/.test(name)
    ? Crown
    : /fire|hot|burn/.test(name)
    ? Flame
    : /guard|safe|insurance/.test(name)
    ? Shield
    : /magnet/.test(name)
    ? Magnet
    : /double|triple|stack/.test(name)
    ? Layers
    : /spark|power|charge/.test(name)
    ? Zap
    : def.kind === "dart"
    ? ArrowUpRight
    : def.kind === "consumable"
    ? Ticket
    : [Target, Gem, Sparkles][id % 3];
  return (
    <div
      className={styles.equipmentArt}
      data-kind={def.kind}
      data-print={id % 7}
      aria-hidden="true"
    >
      <span className={styles.artSerial}>
        HR / {String(id).padStart(2, "0")}
      </span>
      <span className={styles.artEmblem}>
        <Icon strokeWidth={1.4} />
      </span>
      <span className={styles.artCategory}>
        {def.kind === "consumable"
          ? "Pocket power"
          : def.kind === "dart"
          ? "Custom flight"
          : "House charm"}
      </span>
      <span className={styles.artPips}>{"• ".repeat(1 + (id % 3))}</span>
    </div>
  );
}
