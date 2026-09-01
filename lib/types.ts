/**
 * Global types used throughout the Oche application
 * These types define the core domain entities and game interfaces
 */

import React from 'react';
import { LucideIcon } from 'lucide-react';
import { ZodSchema } from 'zod';

/**
 * Branded type for Player IDs to prevent accidental mixing with other string IDs
 */
export type PlayerId = string & { readonly __brand: 'PlayerId' };

/**
 * Constructor function for branded PlayerId type
 */
export function createPlayerId(id: string): PlayerId {
  return id as PlayerId;
}

/**
 * Ring types representing the different scoring zones on a dartboard
 * S = Single, D = Double, T = Triple, OB = Outer Bull (25), IB = Inner Bull (50), M = Miss
 */
export type Ring = 'S' | 'D' | 'T' | 'OB' | 'IB' | 'M';

/**
 * Represents a single dart throw on the board
 */
export interface Throw {
  /** Sector hit (1-20 for standard, 25 for bullseye) */
  sector: 1 | 2 | 3 | 4 | 5 | 6 | 7 | 8 | 9 | 10 | 11 | 12 | 13 | 14 | 15 | 16 | 17 | 18 | 19 | 20 | 25;
  /** Ring type (Single, Double, Triple, Outer Bull, Inner Bull, Miss) */
  ring: Ring;
  /** Total points scored for this throw */
  points: number;
  /** Order within the visit (0, 1, or 2 for up to 3 darts per turn) */
  order: 0 | 1 | 2;
}

/**
 * A visit represents a player's turn, which consists of up to 3 throws
 */
export interface Visit {
  /** MongoDB ID if stored in database */
  _id?: string;
  /** ID of the match this visit belongs to */
  matchId: string;
  /** ID of the leg this visit belongs to (if applicable) */
  legId?: string;
  /** ID of the player making this visit */
  playerId: PlayerId;
  /** Sequence index within the leg */
  index?: number;
  /** Sequence number for ordering */
  seq?: number;
  /** Array of up to 3 throws in this visit */
  throws: Throw[];
  /** Score before this visit was applied */
  scoreBefore?: number;
  /** Score after this visit was applied */
  scoreAfter?: number;
  /** Whether this visit resulted in a bust (score goes negative) */
  busted?: boolean;
  /** Whether this visit resulted in a checkout/win */
  isCheckout?: boolean;
  /** ID of the player who entered this visit */
  enteredBy: PlayerId;
  /** Timestamp when this visit was created */
  createdAt?: Date;
}

/**
 * Represents a player in the game
 */
export interface Player {
  /** Unique player identifier */
  id: PlayerId;
  /** Display name for the player */
  name: string;
  /** Whether this is a guest player (not registered) */
  isGuest: boolean;
}

/**
 * Game statistics - flexible map of string keys to various value types
 * Used by individual game modules to compute and store game-specific metrics
 */
export type GameStats = {
  [key: string]: string | number | boolean | null;
};

/**
 * Defines how a stat metric should be displayed on the scoreboard
 * Used to render custom stat tiles for each game module
 */
export interface StatTileDef<TStats = GameStats> {
  /** User-facing label for the stat */
  label: string;
  /** Key to look up in the stats object */
  key: string;
  /** Function to extract and compute the stat value from game stats */
  value: (stats: TStats) => string | number;
  /** Optional formatter to display the value as a string */
  format?: (value: string | number) => string;
}

/**
 * Game module type definition
 * Each game (X01, Cricket, etc.) implements this interface
 * TState = game state type, TSettings = game settings type
 */
export interface GameModule<TState = any, TSettings = any> {
  /** Unique identifier for this game type (e.g., 'x01', 'cricket') */
  id: string;
  /** Display name of the game */
  name: string;
  /** Description of the game rules */
  description: string;
  /** Icon to represent this game in the UI */
  icon: LucideIcon;
  /** Min/max player count allowed */
  playerRange: [min: number, max: number];
  /** Release status of this game implementation */
  status?: 'stable' | 'beta' | 'comingSoon';
  /** Zod schema for validating game settings */
  settingsSchema: ZodSchema<TSettings>;
  /** Default settings to use when starting a new game */
  defaultSettings: TSettings;
  /**
   * Initialize a new game state with given players and settings
   */
  init: (players: PlayerId[], settings: TSettings) => TState;
  /**
   * Apply a single throw to the current game state and return the new state
   */
  applyThrow: (state: TState, throw_: Throw, settings: TSettings) => TState;
  /**
   * Undo the last action in the game (remove last visit)
   */
  undo: (state: TState) => TState;
  /**
   * Check if the game is over
   */
  isComplete: (state: TState) => boolean;
  /**
   * Get the winning player ID, or null if game not complete
   */
  winner: (state: TState) => PlayerId | null;
  /**
   * Get the ordered list of player IDs in this match
   */
  players: (state: TState) => PlayerId[];
  /**
   * Get the player ID whose turn it currently is
   */
  currentPlayer: (state: TState) => PlayerId;
  /**
   * Progress within the current, still-open visit (e.g. how many darts have
   * landed so far this turn, and the maximum for this game)
   */
  visitProgress: (state: TState) => { darts: number; max: number };
  /**
   * Small info entries to display about overall match progress (e.g. current leg number).
   * Generic across games — X01 reports leg progress; a future game might report something else.
   */
  matchInfo: (state: TState, settings: TSettings) => { label: string; value: string }[];
  /**
   * A player's completed visits within the current "round" of play (for X01, the current leg),
   * newest first. Used to render a per-player recent-activity panel.
   */
  visitHistory: (state: TState, playerId: PlayerId) => { throws: Throw[]; scoreAfter: number; busted: boolean }[];
  /**
   * React component to render one player's scoreboard slot
   */
  ScoreboardSlot: React.FC<{ state: TState; playerId: PlayerId }>;
  /**
   * Get the primary metric to display for a player in the scoreboard
   */
  primaryMetric: (state: TState, playerId: PlayerId) => { label: string; value: string };
  /**
   * Compute game-specific statistics from a list of visits
   */
  computeStats: (visits: Visit[], settings: TSettings) => GameStats;
  /**
   * Array of stat tile definitions for displaying stats in the UI
   */
  statTiles: StatTileDef<any>[];
}
