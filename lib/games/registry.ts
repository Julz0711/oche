/**
 * Game Registry
 * Centralized registry for all available game modules
 * Provides type-safe lookup and lazy loading of game implementations
 */

import { GameModule } from '@/lib/types';

/**
 * Registry of all available games as async module loaders
 * Each game is lazy-loaded on demand to keep bundle size minimal
 */
export const gameRegistry = {
  /**
   * X01 - Classic darts games (501, 301, etc.)
   * Will be implemented in M1-2
   * TODO: Implement in M1-2
   */
  x01: async () => import('./x01').then((m) => m.default),

  /**
   * Cricket - Strategic darts game
   * Planned for future release
   */
  cricket: async () => {
    throw new Error('Cricket not implemented yet');
  },
} as const;

/**
 * Type-safe game ID type derived from the registry keys
 * Ensures only registered games can be loaded
 */
export type GameId = keyof typeof gameRegistry;

/**
 * Load a game module by ID
 * Provides type-safe lookup with proper error handling
 *
 * @param gameId - The ID of the game to load
 * @returns Promise resolving to the GameModule implementation
 * @throws Error if the game ID is not found in the registry
 *
 * @example
 * const x01Module = await getGameModule('x01');
 * const state = x01Module.init([playerId1, playerId2], { startingScore: 501 });
 */
export async function getGameModule(gameId: GameId): Promise<GameModule<any, any>> {
  if (!Object.prototype.hasOwnProperty.call(gameRegistry, gameId)) {
    throw new Error(`Unknown game: ${gameId}`);
  }
  const loader = gameRegistry[gameId];
  return loader();
}
