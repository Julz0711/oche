/**
 * Stats Engine Type Definitions
 * Types used for computing and storing game statistics
 */

import { GameModule, GameStats } from '@/lib/types';

/**
 * Heatmap data representing dart throw distribution
 * Maps board positions (e.g., "S20", "D10", "T5") to hit counts
 * Format: `{ring}{sector}` where ring is S/D/T/OB/IB/M and sector is 1-20 or 25
 */
export type HeatmapData = {
  [key: string]: number;
};

/**
 * Scope for statistics aggregation
 * Determines which matches/timeframe to include in the calculation
 */
export type StatsScope = 'match' | 'last5' | 'last10' | 'last25' | 'last50' | 'all';

/**
 * Computed statistics result for a player in a game
 * Contains aggregated metrics, heatmap data, and metadata
 */
export interface GameStatsResult {
  /** ID of the game type (e.g., 'x01', 'cricket') */
  gameId: string;
  /** Scope of data included in these statistics */
  scope: StatsScope;
  /** Game-specific metrics computed from visits */
  metrics: Record<string, any>;
  /** Dartboard heatmap showing distribution of throws */
  dartHeatmap: HeatmapData;
  /** Total number of darts thrown in this scope */
  totalDarts: number;
  /** Number of matches included in this scope */
  matchCount: number;
  /** Size of the sample (e.g., number of visits) */
  sampleSize: number;
}

/**
 * Configuration for stats computation
 * Defines how stats should be calculated for a given context
 */
export interface StatsComputeOptions {
  /** Scope of aggregation */
  scope: StatsScope;
  /** Optional limit on number of matches to include */
  matchLimit?: number;
  /** Whether to include incomplete/abandoned games */
  includeIncomplete?: boolean;
}
