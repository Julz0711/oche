/**
 * Design tokens for Oche
 * Centralized theme configuration for consistency across components
 * Imported from tailwind.config.ts for single source of truth
 */

// Color Tokens
export const colors = {
  oche: "#141A18",
  slate: "#1E2724",
  chalk: "#F2F4F3",
  sisal: "#E4D8BC",
  wire: "#C0A15C",
  treble: "#C8102E",
  double: "#1B7F5A",
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
  display: "Bricolage Grotesque, sans-serif",
  sans: "Inter Tight, system-ui, sans-serif",
} as const;

// Export combined theme object for component usage
export const theme = {
  colors,
  fontSize,
  fontFamily,
} as const;

export type Theme = typeof theme;
export type ColorToken = keyof typeof colors;
export type FontSizeToken = keyof typeof fontSize;
export type FontFamilyToken = keyof typeof fontFamily;
