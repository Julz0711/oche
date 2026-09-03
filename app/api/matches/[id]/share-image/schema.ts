import { z } from 'zod';

export const ShareImagePayloadSchema = z.object({
  gameName: z.string().min(1),
  matchInfo: z.string().min(1),
  players: z
    .array(
      z.object({
        name: z.string().min(1),
        isWinner: z.boolean(),
        statLabel: z.string().min(1),
        statValue: z.string().min(1),
      })
    )
    .min(2)
    .max(4),
});

export type ShareImagePayload = z.infer<typeof ShareImagePayloadSchema>;
