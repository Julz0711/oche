/**
 * Stats Engine (Stub)
 * Placeholder implementation for computing game statistics
 * Full implementation planned for M2
 *
 * This module provides the interface for stats computation that will be
 * integrated with individual game modules and visit history tracking.
 */

import { Visit, GameModule } from '@/lib/types';
import { GameStatsResult, HeatmapData } from '@/lib/stats/types';

/**
 * Compute aggregated statistics from a list of visits
 * Combines game-specific metrics with dartboard analytics
 *
 * @param visits - Array of visits to analyze
 * @param gameModule - The game module to use for stats computation
 * @returns Computed statistics including metrics and heatmap
 *
 * TODO: M2 implementation
 * - Aggregate game-specific metrics from gameModule.computeStats()
 * - Build comprehensive dartboard heatmap
 * - Filter by scope (last 5, 10, 25, 50 matches, or all-time)
 * - Compute accuracy metrics (checkout%, 180s, etc.)
 */
export function computeAggregateStats(
  visits: Visit[],
  gameModule: GameModule<any, any>
): GameStatsResult {
  // TODO: Implement full stats computation in M2
  return {
    gameId: gameModule.id,
    scope: 'match',
    metrics: {},
    dartHeatmap: {},
    totalDarts: 0,
    matchCount: 1,
    sampleSize: 0,
  };
}

/**
 * Build a dartboard heatmap from visit data
 * Creates a map of board positions to hit counts
 *
 * @param visits - Array of visits to analyze
 * @returns Heatmap data with sector/ring combinations as keys
 *
 * Heatmap format:
 * - Key: "{ring}{sector}" (e.g., "S20", "D10", "T5", "OB", "IB", "M")
 * - Value: Number of times that zone was hit
 *
 * TODO: M2 implementation
 * - Extract throws from each visit
 * - Map throw coordinates to heatmap keys
 * - Count hits per zone
 * - Handle edge cases (misses, bullseye zones)
 */
export function buildHeatmap(visits: Visit[]): HeatmapData {
  const heatmap: HeatmapData = {};

  visits.forEach((visit) => {
    visit.throws.forEach((t) => {
      const key = `${t.ring}${t.sector}`;
      heatmap[key] = (heatmap[key] || 0) + 1;
    });
  });

  return heatmap;
}

/**
 * Determine if a sample size is statistically significant
 * Used to flag when stats should not be heavily relied upon
 *
 * @param count - Number of data points in the sample
 * @returns true if the sample size is considered small/unreliable
 *
 * Threshold: < 30 visits is considered a small sample
 * This is a conservative estimate; individual stats may have different thresholds
 */
export const isSmallSample = (count: number): boolean => count < 30;

/**
 * Type guard for checking if stats are based on a small/unreliable sample
 * Useful for conditional UI rendering (e.g., showing "Not enough data" message)
 *
 * @param stats - Stats result to check
 * @returns true if the stats should be marked as preliminary/unreliable
 */
export function hasSmallSample(stats: GameStatsResult): boolean {
  return isSmallSample(stats.sampleSize);
}
