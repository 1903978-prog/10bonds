import type { Config } from "tailwindcss";

export default {
  content: ["./app/**/*.{ts,tsx}", "./components/**/*.{ts,tsx}"],
  theme: {
    extend: {
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
