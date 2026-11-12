import { describe, expect, it } from "vitest";
import { readFileSync, readdirSync } from "node:fs";
import { join } from "node:path";

// 10B-0007: no production release without a recorded approval for the exact commit (after 10e5eb2f, 12 Nov 2026).
const root = join(__dirname, "..");
const read = (p: string) => readFileSync(join(root, p), "utf8");
async function lib() {
  const p = "../scripts/release-approvals.mjs";
  return (await import(/* @vite-ignore */ p)) as { checkRelease: (md: string, o: Record<string, string>) => string[]; parseReleaseApprovals: (md: string) => string[][] };
}
async function audit() {
  const p = "../scripts/release-audit.mjs";
  return (await import(/* @vite-ignore */ p)) as { auditLive: (md: string, live: unknown) => string | null };
}
const SHA = "a".repeat(40), OTHER = "b".repeat(40);
const doc = (rows: string) => `# x\n\n## Release approvals\n\n| ID | App | Workflow | Exact SHA | Scope | Approved by / date | Status |\n| --- | --- | --- | --- | --- | --- | --- |\n${rows}\n\n## Production change approvals\n`;
const row = (o: Partial<Record<string, string>> = {}) => `| ${o.id ?? "REL-0001"} | ${o.app ?? "10bonds"} | ${o.wf ?? "deploy"} | ${o.sha ?? SHA} | ${o.scope ?? "#510 credit worker"} | ${o.by ?? "Livio, 12 Nov 2026 11:00 UTC"} | ${o.status ?? "APPROVED"} |`;

describe("release gate", () => {
  it("allows only an APPROVED row by Livio for this app, workflow and exact commit", async () => {
    const { checkRelease } = await lib();
    expect(checkRelease(doc(row()), { workflow: "deploy", approval: "REL-0001", sha: SHA })).toEqual([]);
    expect(checkRelease(doc(row()), { workflow: "deploy", approval: "REL-0001", sha: OTHER }).join()).toMatch(/not the commit being deployed/);
    expect(checkRelease(doc(row({ sha: SHA.slice(0, 8) })), { workflow: "deploy", approval: "REL-0001", sha: SHA }).join()).toMatch(/full 40-character/);
    expect(checkRelease(doc(row({ status: "USED" })), { workflow: "deploy", approval: "REL-0001", sha: SHA }).join()).toMatch(/must be APPROVED/);
    expect(checkRelease(doc(row({ by: "coordinator, standing rule" })), { workflow: "deploy", approval: "REL-0001", sha: SHA }).join()).toMatch(/name Livio/);
    expect(checkRelease(doc(row({ app: "nexus" })), { workflow: "deploy", approval: "REL-0001", sha: SHA }).join()).toMatch(/not 10bonds/);
    expect(checkRelease(doc(row({ wf: "rollback" })), { workflow: "deploy", approval: "REL-0001", sha: SHA }).join()).toMatch(/not "deploy"/);
    expect(checkRelease(doc(""), { workflow: "deploy", approval: "REL-0001", sha: SHA }).join()).toMatch(/not recorded/);
    expect(checkRelease(doc(row()), { workflow: "deploy", approval: "", sha: SHA }).join()).toMatch(/REL-0001/);
  });
  it("a rollback needs an approval or a written emergency reason", async () => {
    const { checkRelease } = await lib();
    expect(checkRelease(doc(""), { workflow: "rollback", approval: "", sha: SHA, emergencyReason: "" })).toHaveLength(1);
    expect(checkRelease(doc(""), { workflow: "rollback", approval: "", sha: SHA, emergencyReason: "site down after release, sign-up broken" })).toEqual([]);
    expect(checkRelease(doc(row({ wf: "rollback" })), { workflow: "rollback", approval: "REL-0001", sha: OTHER })).toEqual([]);
  });
  it("the live release audit flags a release made outside the gate", async () => {
    const { auditLive } = await audit();
    expect(auditLive(doc(row({ status: "USED" })), { sha: SHA, approval: "REL-0001" })).toBeNull();
    expect(auditLive(doc(row()), { sha: "unknown", approval: "unknown" })).toMatch(/outside the release gate/);
    expect(auditLive(doc(row()), { sha: OTHER, approval: "REL-0001" })).toMatch(/not the approved/);
    expect(auditLive(doc(row()), null)).toMatch(/outside/);
  });
  it("every route that changes production goes through the gate", () => {
    const deploy = read(".github/workflows/deploy.yml"), rollback = read(".github/workflows/rollback.yml");
    expect(deploy).toMatch(/release-gate\.mjs --workflow deploy/);
    expect(deploy).toMatch(/needs: \[gate, test\]/);
    expect(deploy).toMatch(/release-claim\.mjs/);
    expect(deploy.indexOf("release-claim.mjs")).toBeLessThan(deploy.indexOf("flyctl deploy"));
    expect(deploy).toMatch(/environment: production/);
    expect(deploy).toMatch(/RELEASE_SHA="\$GITHUB_SHA"/);
    expect(rollback).toMatch(/release-gate\.mjs --workflow rollback/);
    expect(rollback).toMatch(/needs: gate/);
    expect(rollback.indexOf("release-claim.mjs")).toBeLessThan(rollback.indexOf("fly-rollback.sh"));
    expect(read(".github/workflows/nightly-live-check.yml")).toMatch(/release-audit\.mjs/);
    // No other workflow may run flyctl deploy or the rollback script.
    for (const f of readdirSync(join(root, ".github/workflows"))) {
      if (f === "deploy.yml" || f === "rollback.yml") continue;
      expect(read(`.github/workflows/${f}`), f).not.toMatch(/flyctl deploy|fly deploy|fly-rollback\.sh|flyctl releases rollback/);
    }
  });
});
