import type { Config } from "tailwindcss";
import { tokens, fontSize, fontFamily } from "./lib/theme";

const config: Config = {
  content: [
    "./app/**/*.{js,ts,jsx,tsx,mdx}",
    "./components/**/*.{js,ts,jsx,tsx,mdx}",
    "./lib/**/*.{js,ts,jsx,tsx,mdx}",
  ],
  theme: {
    extend: {
      colors: tokens,
      fontSize,
      fontFamily: {
        // next/font only ever exposes the actual (hashed) family name via this CSS
        // variable, set on <html> in app/layout.tsx — the literal names below are
        // just a fallback for if that variable is ever unset.
        display: ["var(--font-display)", ...fontFamily.display.split(",").map((f) => f.trim())],
        sans: ["var(--font-sans)", ...fontFamily.sans.split(",").map((f) => f.trim())],
      },
    },
  },
  plugins: [],
};

export default config;
