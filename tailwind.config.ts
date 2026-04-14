import type { Config } from "tailwindcss";

const config: Config = {
  content: [
    "./pages/**/*.{js,ts,jsx,tsx,mdx}",
    "./components/**/*.{js,ts,jsx,tsx,mdx}",
    "./app/**/*.{js,ts,jsx,tsx,mdx}",
  ],
  theme: {
    extend: {
      fontFamily: {
        serif: ["Noto Serif JP", "Playfair Display", "serif"],
        sans: ["Noto Sans JP", "sans-serif"],
      },
      colors: {
        background: "#0a0a0a",
        foreground: "#f5f0e8",
        muted: "#6b6b6b",
        accent: "#c9a84c",
      },
    },
  },
  plugins: [],
};

export default config;
