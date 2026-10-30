import type { Config } from "tailwindcss";

export default {
  content: ["./app/**/*.{ts,tsx}", "./components/**/*.{ts,tsx}"],
  theme: {
    extend: {
      // Desktop windows of laptop height (1366x768, 1440x900): the landing page tucks its steps in to fit one screen.
      screens: { wide: "1200px", short: { raw: "(min-width: 1024px) and (max-height: 1100px), (min-width: 2400px) and (max-height: 1400px)" } },
      fontFamily: {
        sans: ["-apple-system", "BlinkMacSystemFont", "SF Pro Text", "Inter", "Segoe UI", "Roboto", "Helvetica Neue", "Arial", "sans-serif"],
      },
      colors: {
        ink: "#1d1d1f",
        mute: "#636368",
        line: "#e5e5ea",
        canvas: "#f5f5f7",
        // #0066cc: Apple's link blue, readable on white and on the grey canvas (contrast 4.5:1 or more, WCAG AA).
        accent: "#0066cc",
        // Selected pill / tab fill (Schwab-style look, Oct 2026).
        soft: "#e8f1fb",
      },
    },
  },
  plugins: [],
} satisfies Config;
