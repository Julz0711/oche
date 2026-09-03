// lib/games/cricket/schema.ts
import { z } from 'zod';

export const CricketSettingsSchema = z.object({
  firstTo: z.number().int().min(1).max(7),
});

export type CricketSettings = z.infer<typeof CricketSettingsSchema>;

export const CricketDefaultSettings: CricketSettings = {
  firstTo: 3,
};
