import { z } from 'zod';

export const LocalPlayerNamesSchema = z.array(z.string().trim().min(1).max(32)).min(2).max(8);

export function localSeats(names: string[], ownerName?: string | null, userId?: string) {
  return names.map((name, index) => ({
    name: index === 0 && ownerName ? ownerName : name,
    ...(index === 0 && userId ? { userId } : {}),
    isGuest: index !== 0 || !userId,
  }));
}
