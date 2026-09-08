// lib/games/x01/schema.ts
import { z } from 'zod';

export const X01SettingsSchema = z.object({
  startingScore: z.enum(['301', '501', '701']).transform((v) => parseInt(v)),
  checkOut: z.enum(['double', 'straight', 'master']),
  checkIn: z.enum(['straight', 'double']),
  firstTo: z.number().int().min(1).max(7),
  sets: z.number().int().min(0).max(7).optional().default(0),
  firstThrow: z.enum(['player1', 'random', 'bulloff', 'alternate']).default('alternate'),
  handicap: z.record(z.string(), z.number()).optional(),
});

export type X01Settings = z.infer<typeof X01SettingsSchema>;

export const X01DefaultSettings: X01Settings = {
  startingScore: 501,
  checkOut: 'double',
  checkIn: 'straight',
  firstTo: 1,
  sets: 0,
  firstThrow: 'alternate',
};
