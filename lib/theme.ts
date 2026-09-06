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

// Type Scale (Font Sizes in px)
export const fontSize = {
  xs: "12px",
  sm: "14px",
  base: "16px",
  lg: "20px",
  xl: "28px",
  "2xl": "40px",
  "3xl": "72px",
  "4xl": "128px",
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
