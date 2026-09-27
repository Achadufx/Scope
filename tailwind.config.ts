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
      boxShadow: {
        subtle: "0 1px 2px 0 rgba(16, 24, 40, 0.04)",
        card: "0 1px 3px 0 rgba(16, 24, 40, 0.05), 0 1px 2px -1px rgba(16, 24, 40, 0.05)",
        popover: "0 4px 6px -1px rgba(16, 24, 40, 0.07), 0 2px 4px -2px rgba(16, 24, 40, 0.05)",
        drawer: "0 20px 25px -5px rgba(16, 24, 40, 0.1), 0 8px 10px -6px rgba(16, 24, 40, 0.06)",
      },
      letterSpacing: {
        tighter: "-0.03em",
        tight: "-0.015em",
        normal: "0",
        wide: "0.025em",
        wider: "0.05em",
        widest: "0.1em",
      },
    },
  },
  plugins: [],
};
export default config;
