import { readFileSync } from "node:fs";
import { join } from "node:path";
import { describe, expect, it } from "vitest";

// EEN-REL-001 (14 Nov 2026): keep current *instructions* aligned with the
// owner decision. Do not scan historic audit records or closed PR descriptions:
// those may legitimately document superseded second-reviewer proposals.
const root = join(__dirname, "..");
const read = (path: string) => readFileSync(join(root, path), "utf8");
const primary = () => read("CLAUDE.md");
const setup = () => read("docs/release-governance-setup.md");

describe("10BONDS release policy EEN-REL-001", () => {
  it("names Livio as the sole human release approver and requires exact-SHA GO", () => {
    expect(primary()).toMatch(/Livio is the \*\*sole human release approver\*\*/);
    expect(primary()).toMatch(/exact full 40-character code SHA/);
    expect(primary()).toMatch(/single-use release gate/);
    expect(setup()).toMatch(/Livio is the only human release approver/);
  });

  it("does not demand a second human review or account", () => {
    const docs = [primary(), setup()];
    for (const doc of docs) {
      expect(doc).not.toMatch(/require(?:s|d)? (?:a |one )?(?:second|extra|additional) (?:human|GitHub) (?:approval|approver|reviewer|account)/i);
      expect(doc).not.toMatch(/required approving reviews\s*=\s*[1-9]/i);
    }
    expect(primary()).toContain("required human approving reviews = 0");
    expect(setup()).toContain("required approving reviews = 0");
  });

  it("retains the enforceable gate and does not endorse direct Fly bypass", () => {
    const policy = primary(), deploy = read(".github/workflows/deploy.yml"), rollback = read(".github/workflows/rollback.yml");
    expect(policy).toMatch(/Never run a direct `fly deploy` to circumvent the gate/);
    expect(deploy).toMatch(/release-gate\.mjs --workflow deploy/);
    expect(deploy).toMatch(/release-claim\.mjs/);
    expect(deploy).toMatch(/environment: production/);
    expect(rollback).toMatch(/release-gate\.mjs --workflow rollback/);
    expect(rollback).toMatch(/environment: production/);
    // Production release remains manual-only, never dispatched on a source push.
    expect(deploy).toMatch(/workflow_dispatch:/);
    expect(deploy).not.toMatch(/^  push:/m);
  });

  it("does not claim that GitHub settings or Fly token controls are applied without evidence", () => {
    expect(setup()).toMatch(/NOT APPLIED \/ NOT VERIFIED/);
    expect(setup()).toMatch(/main.*(?:branch protection|ruleset)/i);
    expect(setup()).toMatch(/new token.*replacement|replacement token.*installed/i);
  });
});
