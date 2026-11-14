import { describe, expect, it } from "vitest";
import { readFileSync, readdirSync } from "node:fs";
import { join } from "node:path";
import { spawnSync } from "node:child_process";

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

const run = (script: string, env: Record<string, string>, args: string[] = []) =>
  spawnSync(process.execPath, [join(root, "scripts", script), ...args], { cwd: root, encoding: "utf8", env: { PATH: process.env.PATH ?? "", ...env } as unknown as NodeJS.ProcessEnv });

async function git() {
  const p = "../scripts/release-approvals.mjs";
  return (await import(/* @vite-ignore */ p)) as { gitSameCode: (a: string, b: string, cwd: string) => boolean; checkRelease: (md: string, o: Record<string, unknown>) => string[] };
}

describe("approved commit vs main's head (the approval row itself is a commit on main)", () => {
  it("accepts a descendant that changes only docs/livio-asks.md, nothing else", async () => {
    const { gitSameCode } = await git();
    const { mkdtempSync, writeFileSync, mkdirSync } = await import("node:fs");
    const { tmpdir } = await import("node:os");
    const d = mkdtempSync(join(tmpdir(), "relgate-"));
    const g = (...a: string[]) => spawnSync("git", a, { cwd: d, encoding: "utf8", env: { ...process.env, GIT_AUTHOR_NAME: "t", GIT_AUTHOR_EMAIL: "t@t", GIT_COMMITTER_NAME: "t", GIT_COMMITTER_EMAIL: "t@t" } as unknown as NodeJS.ProcessEnv }).stdout.trim();
    g("init", "-q"); mkdirSync(join(d, "docs"));
    writeFileSync(join(d, "app.ts"), "1"); writeFileSync(join(d, "docs/livio-asks.md"), "a"); g("add", "-A"); g("commit", "-qm", "code");
    const approved = g("rev-parse", "HEAD");
    writeFileSync(join(d, "docs/livio-asks.md"), "a + row"); g("commit", "-qam", "row");
    const rowOnly = g("rev-parse", "HEAD");
    writeFileSync(join(d, "app.ts"), "2"); g("commit", "-qam", "sneak");
    const sneaked = g("rev-parse", "HEAD");
    g("checkout", "-q", "-b", "side", approved + "~0"); writeFileSync(join(d, "docs/livio-asks.md"), "x"); g("commit", "-qam", "side");
    const side = g("rev-parse", "HEAD");
    expect(gitSameCode(approved, approved, d)).toBe(true);
    expect(gitSameCode(approved, rowOnly, d)).toBe(true);
    expect(gitSameCode(approved, sneaked, d)).toBe(false);
    expect(gitSameCode(rowOnly, approved, d)).toBe(false); // not a descendant
    expect(gitSameCode(side, rowOnly, d)).toBe(false);
    expect(gitSameCode("f".repeat(40), rowOnly, d)).toBe(false);
    // A code file renamed into the approvals table must not hide its deletion (review 14 Nov).
    const d2 = mkdtempSync(join(tmpdir(), "relgate-"));
    const g2 = (...a: string[]) => spawnSync("git", a, { cwd: d2, encoding: "utf8", env: { ...process.env, GIT_AUTHOR_NAME: "t", GIT_AUTHOR_EMAIL: "t@t", GIT_COMMITTER_NAME: "t", GIT_COMMITTER_EMAIL: "t@t" } as unknown as NodeJS.ProcessEnv }).stdout.trim();
    g2("init", "-q"); mkdirSync(join(d2, "docs"));
    writeFileSync(join(d2, "middleware.ts"), "export const auth = true;\n".repeat(20)); g2("add", "-A"); g2("commit", "-qm", "code");
    const base = g2("rev-parse", "HEAD");
    g2("mv", "middleware.ts", "docs/livio-asks.md"); g2("commit", "-qm", "rename");
    expect(gitSameCode(base, g2("rev-parse", "HEAD"), d2)).toBe(false);
  });
});

describe("release gate", () => {
  it("the gate and the claim exit non-zero when they refuse (fail closed)", () => {
    const wrongBranch = run("release-gate.mjs", { GITHUB_ACTIONS: "true", GITHUB_REF: "refs/heads/other" }, ["--workflow", "deploy", "--approval", "REL-0001", "--sha", SHA]);
    expect(wrongBranch.status).toBe(1); expect(wrongBranch.stderr).toMatch(/BLOCKED/);
    const rerun = run("release-gate.mjs", { GITHUB_RUN_ATTEMPT: "2" }, ["--workflow", "deploy", "--approval", "REL-0001", "--sha", SHA]);
    expect(rerun.status).toBe(1);
    const badId = run("release-claim.mjs", { WORKFLOW: "deploy", APPROVAL_ID: 'REL-9999" || true; exit 0; "', ACCOUNTS_DATABASE_URL: "postgres://x@127.0.0.1:1/x" });
    expect(badId.status).toBe(1); expect(badId.stderr).toMatch(/must look like REL-0001/);
    const noId = run("release-claim.mjs", { WORKFLOW: "deploy", ACCOUNTS_DATABASE_URL: "postgres://x@127.0.0.1:1/x" });
    expect(noId.status).toBe(1);
  });
  it("workflow inputs never reach a shell directly, only through env", () => {
    for (const f of ["deploy.yml", "rollback.yml"]) {
      for (const line of read(`.github/workflows/${f}`).split("\n").filter((l) => l.includes("${{ inputs."))) {
        expect(line, `${f}: ${line.trim()}`).toMatch(/^\s*(run-name:|[A-Z_]+: \$\{\{ inputs\.)/);
      }
    }
  });

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
    // A shortened or prefix-matching SHA is never enough (review 13 Nov).
    expect(checkRelease(doc(row()), { workflow: "deploy", approval: "REL-0001", sha: SHA.slice(0, 7) })).not.toEqual([]);
    expect(checkRelease(doc(row()), { workflow: "deploy", approval: "REL-0001", sha: SHA.slice(0, 7) + "c".repeat(33) })).not.toEqual([]);
    expect(checkRelease(doc(row({ sha: SHA.slice(0, 7) })), { workflow: "deploy", approval: "REL-0001", sha: SHA.slice(0, 7) })).not.toEqual([]);
    expect(checkRelease(doc(row()), { workflow: "deploy", approval: 'REL-9999" || true; exit 0; "', sha: SHA })).not.toEqual([]);
  });
  it("a rollback needs an approval or a written emergency reason", async () => {
    const { checkRelease } = await lib();
    expect(checkRelease(doc(""), { workflow: "rollback", approval: "", sha: SHA, emergencyReason: "" })).toHaveLength(1);
    expect(checkRelease(doc(""), { workflow: "rollback", approval: "", sha: SHA, emergencyReason: "site down after release" })).toHaveLength(1);
    expect(checkRelease(doc(""), { workflow: "rollback", approval: "", sha: SHA, emergencyReason: "site down after release 13 Nov, sign-up returns 500" })).toEqual([]);
    expect(checkRelease(doc(row({ wf: "rollback" })), { workflow: "rollback", approval: "REL-0001", sha: OTHER })).toEqual([]);
  });
  it("the live release audit flags a release made outside the gate", async () => {
    const { auditLive } = await audit();
    expect(auditLive(doc(row({ status: "USED" })), { sha: SHA, approval: "REL-0001" })).toBeNull();
    expect(auditLive(doc(row()), { sha: "unknown", approval: "unknown" })).toMatch(/outside the release gate/);
    expect(auditLive(doc(row()), { sha: OTHER, approval: "REL-0001" })).toMatch(/no approved deploy/);
    expect(auditLive(doc(row()), null)).toMatch(/outside/);
    // After a rollback: an older commit passes only if it had its own approved deploy.
    expect(auditLive(doc(row({ status: "USED" }) + "\n" + row({ id: "REL-0002", sha: OTHER, status: "USED" })), { sha: SHA, approval: "AUTO" })).toBeNull();
    expect(auditLive(doc(row({ wf: "rollback", sha: OTHER })), { sha: OTHER, approval: "REL-0001" })).toMatch(/no approved deploy/);
  });
  it("every route that changes production goes through the gate", () => {
    const deploy = read(".github/workflows/deploy.yml"), rollback = read(".github/workflows/rollback.yml");
    expect(deploy).toMatch(/release-gate\.mjs --workflow deploy/);
    expect(deploy).toMatch(/needs: \[gate, test\]/);
    expect(deploy).toMatch(/release-claim\.mjs/);
    expect(deploy.indexOf("release-claim.mjs")).toBeLessThan(deploy.indexOf("flyctl deploy"));
    expect(deploy).toMatch(/environment: production/);
    expect(deploy).toMatch(/RELEASE_SHA="\$APPROVED_SHA"/);
    expect(deploy).toMatch(/approved_sha \}\}/);
    expect(rollback).toMatch(/release-gate\.mjs --workflow rollback/);
    expect(rollback).toMatch(/needs: gate/);
    expect(rollback.indexOf("release-claim.mjs")).toBeLessThan(rollback.indexOf("fly-rollback.sh"));
    expect(rollback.indexOf("Stop if the Fly token is not set")).toBeLessThan(rollback.indexOf("release-claim.mjs"));
    expect(read(".github/workflows/nightly-live-check.yml")).toMatch(/release-audit\.mjs/);
    // A missing Fly token stops the run red, before the approval is used up.
    expect(deploy).toMatch(/FLY_API_TOKEN secret is not set: nothing deployed\."\n\s+exit 1/);
    expect(deploy.indexOf("Stop if the Fly token is not set")).toBeLessThan(deploy.indexOf("release-claim.mjs"));
    // A rollback records which commit it put back.
    expect(deploy).toMatch(/--image-label "sha-\$APPROVED_SHA"/);
    expect(read("scripts/fly-rollback.sh")).toMatch(/--env RELEASE_SHA=/);
    // No other workflow may run flyctl deploy or the rollback script.
    for (const f of readdirSync(join(root, ".github/workflows"))) {
      if (f === "deploy.yml" || f === "rollback.yml") continue;
      expect(read(`.github/workflows/${f}`), f).not.toMatch(/flyctl deploy|fly deploy|fly-rollback\.sh|flyctl releases rollback/);
    }
  });
});
