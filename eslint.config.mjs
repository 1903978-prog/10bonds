import { dirname } from "node:path";
import { fileURLToPath } from "node:url";
import { FlatCompat } from "@eslint/eslintrc";

// Next.js' own rules (React, hooks, accessibility basics, Next pitfalls) plus TypeScript. Run: npm run lint
const compat = new FlatCompat({ baseDirectory: dirname(fileURLToPath(import.meta.url)) });

const config = [
  { ignores: [".next/**", "node_modules/**", "next-env.d.ts", "scripts/**"] },
  ...compat.extends("next/core-web-vitals", "next/typescript"),
  // A leading underscore marks an argument kept on purpose (for example to match a signature).
  { rules: { "@typescript-eslint/no-unused-vars": ["warn", { argsIgnorePattern: "^_", varsIgnorePattern: "^_" }] } },
];

export default config;
