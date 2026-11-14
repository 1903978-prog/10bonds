#!/usr/bin/env node
// Writes the SHA-256 of the reviewed worker files into install-service.ps1 (run after changing any of them: node scripts/credit-worker/pin.mjs).
import { createHash } from "node:crypto";
import { readFileSync, writeFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

const dir = dirname(fileURLToPath(import.meta.url));
export const PINNED = ["worker.mjs", "package.json", "run-worker.ps1"];
export const sha = (name) => createHash("sha256").update(readFileSync(join(dir, name))).digest("hex");
const file = join(dir, "install-service.ps1");
let s = readFileSync(file, "utf8");
for (const name of PINNED) s = s.replace(new RegExp(`('${name.replace(".", "\\.")}'\\s*=\\s*')[^']*(')`), `$1${sha(name)}$2`);
writeFileSync(file, s);
console.log(PINNED.map((n) => `${n} ${sha(n)}`).join("\n"));
