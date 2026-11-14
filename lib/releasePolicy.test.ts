import { describe, expect, it } from "vitest";
import { readFileSync, readdirSync, statSync } from "node:fs";
import { join } from "node:path";

// EEN-REL-001 (Livio, 14 Nov 2026): Livio is the only human release approver. Instructions must never ask for a second human.
const root = join(__dirname, "..");
const FORBIDDEN = /second (human )?(approver|reviewer|github account|signature)|independent human approv|invite (a )?collaborator|1 approval from someone other|prevent self-review|required approving reviews? = ?[1-9]/i;
// The ledger and the approvals table are history (append-only records of what happened); they may quote old wording.
const HISTORY = new Set(["docs/execution-ledger.md"]);

function files(dir: string, out: string[] = []): string[] {
  for (const n of readdirSync(join(root, dir))) {
    const rel = dir ? `${dir}/${n}` : n;
    if (["node_modules", ".next", ".git", "public"].includes(n)) continue;
    const st = statSync(join(root, rel));
    if (st.isDirectory()) files(rel, out);
    else if (/\.(md|ya?ml|mjs|ts|tsx|json|ps1|bat|py)$/.test(n) && !rel.endsWith("releasePolicy.test.ts")) out.push(rel);
  }
  return out;
}

describe("release policy EEN-REL-001", () => {
  it("CLAUDE.md states the policy for every new session", () => {
    expect(readFileSync(join(root, "CLAUDE.md"), "utf8")).toMatch(/Livio is the only human release approver/);
  });
  it("no instruction, workflow or doc asks for a second human approver", () => {
    const bad = ["CLAUDE.md", ...files("docs"), ...files(".github"), ...files(".claude"), ...files("scripts")]
      .filter((f) => !HISTORY.has(f))
      .filter((f) => FORBIDDEN.test(readFileSync(join(root, f), "utf8")));
    expect(bad).toEqual([]);
  });
});
