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
        display: fontFamily.display.split(",").map((f) => f.trim()),
        sans: fontFamily.sans.split(",").map((f) => f.trim()),
      },
    },
  },
  plugins: [],
};

export default config;
