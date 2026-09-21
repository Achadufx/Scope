import type { Config } from "tailwindcss";

const config: Config = {
  content: [
    "./pages/**/*.{js,ts,jsx,tsx,mdx}",
    "./components/**/*.{js,ts,jsx,tsx,mdx}",
    "./app/**/*.{js,ts,jsx,tsx,mdx}",
  ],
  theme: {
    extend: {
      colors: {
        background: "#F7F8FA",
        surface: "#FFFFFF",
        primary: {
          DEFAULT: "#111318",
          hover: "#1F232D",
          light: "#F0F2F5",
        },
        secondary: {
          DEFAULT: "#667085",
          dark: "#475467",
          light: "#98A2B3",
        },
        border: {
          DEFAULT: "#E4E7EC",
          subtle: "#F2F4F7",
          strong: "#D0D5DD",
        },
        accent: {
          DEFAULT: "#4F46E5",
          hover: "#4338CA",
          light: "#EEF2FF",
        },
        success: {
          DEFAULT: "#16803C",
          surface: "#EDFDF2",
          border: "#A6F4C5",
        },
        warning: {
          DEFAULT: "#B7791F",
          surface: "#FFFAEB",
          border: "#FEDF89",
        },
        danger: {
          DEFAULT: "#C53030",
          surface: "#FEF3F2",
          border: "#FECDCA",
        },
      },
      fontFamily: {
        sans: ["Inter", "-apple-system", "BlinkMacSystemFont", "Segoe UI", "Roboto", "sans-serif"],
        mono: ["Geist Mono", "JetBrains Mono", "SFMono-Regular", "Menlo", "Monaco", "Consolas", "monospace"],
      },
    },
  },
  plugins: [],
};
export default config;
