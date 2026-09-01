/**
 * Game module types
 * Re-exports the GameModule interface and related types from lib/types
 * This provides a convenient import path for game implementations
 */

export type { GameModule, GameStats, StatTileDef } from '@/lib/types';
export { createPlayerId } from '@/lib/types';
export type { PlayerId, Player, Throw, Visit, Ring } from '@/lib/types';
