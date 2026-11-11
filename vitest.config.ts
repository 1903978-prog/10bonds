import { defineConfig } from "vitest/config";
import path from "node:path";
// The *.db.test.ts files share one real database and each builds tables on first use ("create table if not exists"),
// which fails with "duplicate key ... pg_type_typname_nsp_index" when two files do it at the same moment.
// So those files run one after the other (their own project, a single worker); every other test stays parallel.
const alias = { "@": path.resolve(__dirname) };
export default defineConfig({
  resolve: { alias },
  test: {
    workspace: [
      { resolve: { alias }, test: { name: "unit", include: ["lib/**/*.test.ts"], exclude: ["lib/**/*.db.test.ts"] } },
      { resolve: { alias }, test: { name: "db", include: ["lib/**/*.db.test.ts"], pool: "forks", poolOptions: { forks: { singleFork: true } } } },
    ],
  },
});
