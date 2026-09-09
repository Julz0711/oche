// lib/games/cricket/schema.ts
import { z } from 'zod';

export const CricketSettingsSchema = z.object({
  firstTo: z.number().int().min(1).max(7),
  scoring: z.enum(['standard', 'no-points']).optional().default('standard'),
});

export type CricketSettings = z.input<typeof CricketSettingsSchema>;

export const CricketDefaultSettings: CricketSettings = {
  firstTo: 1,
  scoring: 'standard',
};
