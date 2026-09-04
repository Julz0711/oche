// lib/games/copycat/schema.ts
import { z } from 'zod';

export const CopycatSettingsSchema = z.object({
  firstTo: z.union([z.literal(3), z.literal(5), z.literal(7), z.literal(9)]),
  firstThrow: z.enum(['player1', 'random', 'bulloff', 'alternate']).default('alternate'),
});

export type CopycatSettings = z.infer<typeof CopycatSettingsSchema>;

export const CopycatDefaultSettings: CopycatSettings = {
  firstTo: 3,
  firstThrow: 'alternate',
};
