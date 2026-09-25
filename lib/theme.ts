/**
 * Design tokens for Oche
 * Centralized theme configuration for consistency across components
 * Single source of truth for all design values
 */

// Color Tokens - Used across components and Tailwind config
export const tokens = {
  oche: "#101614",      // Page background
  slate: "#1E2724",     // Surfaces, cards
  chalk: "#F2F4F3",     // Primary text
  sisal: "#E4D8BC",     // Secondary text
  wire: "#C0A15C",      // Accent, focus
  treble: "#C8102E",    // Red (treble hits, danger)
  double: "#1B7F5A",    // Green (double hits, success)
} as const;

// Heat-scale tokens — data visualization only, never used for UI chrome or brand color.
// Kept here for documentation/reference; not wired into Tailwind's `colors` extension,
// since these should never appear as bg-*/text-* utility classes — only as raw var()
// values inside heat-map rendering (see components/organisms/HeatmapBoard.tsx).
export const heatScale = {
  cold: "#2563EB",
  mid: "#EAB308",
  hot: "#DC2626",
} as const;

// Type scale: large desktop display sizes with compact mobile overrides in globals.css.
export const fontSize = {
  xs: "12px",
  sm: "14px",
  base: "16px",
  lg: "var(--type-lg, 20px)",
  xl: "var(--type-xl, 28px)",
  "2xl": "var(--type-2xl, 40px)",
  "3xl": "var(--type-3xl, 72px)",
  "4xl": "var(--type-4xl, 128px)",
} as const;

// Font Families
export const fontFamily = {
  display: "Barlow Condensed, sans-serif",
  sans: "Inter Tight, system-ui, sans-serif",
} as const;

// Aliases for backward compatibility
export const colors = tokens;

// Export combined theme object for component usage
export const theme = {
  colors: tokens,
  fontSize,
  fontFamily,
} as const;

export type Theme = typeof theme;
export type ColorToken = keyof typeof tokens;
export type FontSizeToken = keyof typeof fontSize;
export type FontFamilyToken = keyof typeof fontFamily;

/**
 * Shared achievement palette.
 *
 * Rarity is a four-step ladder, so it reads as one — increasing presence in the SAME brass,
 * not four unrelated hues. The previous values were Tailwind's blue-500 and purple-500 plus a
 * pure `#FFD700`: three colours that appear nowhere else in the product, on the one surface
 * that pops up over live scoring. They made the toasts look like a different application.
 *
 * Common is the quietest edge the app draws; legendary is filled brass with dark ink.
 */
export const rarityColors = {
  common: { bg: tokens.slate, border: tokens.sisal },
  rare: { bg: tokens.slate, border: tokens.double },
  epic: { bg: tokens.slate, border: tokens.treble },
  legendary: { bg: tokens.wire, border: tokens.wire },
} as const;
