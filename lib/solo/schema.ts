import { z } from "zod";
const slot = z.number().int().min(0).max(2);
export const ActionSchema = z.discriminatedUnion("type", [
  z
    .object({
      type: z.literal("start"),
      home: z.number().int().min(1).max(20),
      dealer: z.enum(["points", "coins"]),
      wager: z.boolean(),
    })
    .strict(),
  z
    .object({
      type: z.literal("throw"),
      hit: z
        .object({
          sector: z.number().int().min(0).max(25),
          ring: z.enum(["S", "D", "T", "OB", "IB", "M"]),
        })
        .strict(),
    })
    .strict(),
  ...(["bank", "commit", "next", "refresh", "undo", "cancelUse"] as const).map(
    (type) => z.object({ type: z.literal(type) }).strict()
  ),
  z
    .object({
      type: z.literal("buy"),
      offer: z.number().int().min(0).max(5),
      slot: slot.optional(),
    })
    .strict(),
  z
    .object({ type: z.literal("sell"), id: z.number().int().min(1).max(72) })
    .strict(),
  z.object({ type: z.literal("swap"), from: slot, to: slot }).strict(),
  z
    .object({
      type: z.literal("use"),
      id: z.number().int().min(51).max(60),
      slot: slot.optional(),
    })
    .strict(),
]);
export const SubmitSchema = z
  .object({ id: z.string().uuid(), actions: z.array(ActionSchema).max(2500) })
  .strict();
export const StartSchema = z
  .object({
    difficulty: z.enum(["social", "regular", "expert"]),
    starter: z.union([z.literal(16), z.literal(17), z.literal(19)]),
  })
  .strict();
