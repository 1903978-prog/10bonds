import type { Config } from "tailwindcss";

export default {
  content: ["./app/**/*.{ts,tsx}", "./components/**/*.{ts,tsx}"],
  theme: {
    extend: {
      // Desktop windows of laptop height (1366x768, 1440x900): the landing page tucks its steps in to fit one screen.
      screens: { short: { raw: "(min-width: 1024px) and (max-height: 920px)" } },
      fontFamily: {
        sans: ["-apple-system", "BlinkMacSystemFont", "SF Pro Text", "Inter", "Segoe UI", "Roboto", "Helvetica Neue", "Arial", "sans-serif"],
      },
      colors: {
        ink: "#1d1d1f",
        mute: "#6e6e73",
        line: "#e5e5ea",
        canvas: "#f5f5f7",
        // #0066cc: Apple's link blue, readable on white and on the grey canvas (contrast 4.5:1 or more, WCAG AA).
        accent: "#0066cc",
      },
    },
  },
  plugins: [],
} satisfies Config;
