import type { Config } from "tailwindcss";

const config: Config = {
  content: [
    "./app/**/*.{js,ts,jsx,tsx,mdx}",
    "./components/**/*.{js,ts,jsx,tsx,mdx}",
    "./lib/**/*.{js,ts,jsx,tsx,mdx}",
  ],
  theme: {
    extend: {
      colors: {
        // Oche design tokens
        oche: "#141A18",
        slate: "#1E2724",
        chalk: "#F2F4F3",
        sisal: "#E4D8BC",
        wire: "#C0A15C",
        treble: "#C8102E",
        double: "#1B7F5A",
      },
      fontSize: {
        xs: "12px",
        sm: "14px",
        base: "16px",
        lg: "20px",
        xl: "28px",
        "2xl": "40px",
        "3xl": "72px",
        "4xl": "128px",
      },
      fontFamily: {
        display: ["Bricolage Grotesque", "sans-serif"],
        sans: ["Inter Tight", "system-ui", "sans-serif"],
      },
    },
  },
  plugins: [],
};

export default config;
