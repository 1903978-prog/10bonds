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
        accent: "#0071e3",
      },
    },
  },
  plugins: [],
} satisfies Config;
