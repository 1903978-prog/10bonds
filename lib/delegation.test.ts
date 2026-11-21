import { describe, expect, it } from "vitest";
import { readFileSync } from "node:fs";
import { join } from "node:path";
import { execFileSync, spawnSync } from "node:child_process";

// Standing delegation (GREEN/AMBER/RED), 21 Nov 2026: the boundaries must hold and cannot be bypassed by a branch.
const root = join(__dirname, "..");
const policyText = readFileSync(join(root, "docs/delegation/policy.json"), "utf8");
const policy = JSON.parse(policyText);

type Ctx = Record<string, unknown>;
type Lib = {
  classifyPath: (p: string, pol: unknown) => string; classifyChange: (f: string[], pol: unknown) => { klass: string };
  checkDelegation: (c: Ctx) => { errors: string[]; klass: string; id: string };
  policyHash: (t: string) => string; autoId: (s: string) => string; activeActivation: (md: string, t: string) => string[] | null;
  auditLiveAuto: (r: unknown, l: unknown) => boolean;
};
const lib = async () => {
  const p = "../scripts/delegation.mjs";
  return (await import(/* @vite-ignore */ p)) as Lib;
};

const SHA = "c".repeat(40), LIVE = "d".repeat(40);
const act = (hash: string, status = "ACTIVE", by = "Livio, 21 Nov 2026 10:00 UTC (one-click GO)") => `# x\n\n## Standing delegation\n\n| ID | Policy sha256 | Activated by / date | Status |\n| --- | --- | --- | --- |\n| DEL-0001 | ${hash} | ${by} | ${status} |\n\n## Release approvals\n`;
const entry = (o: Record<string, unknown> = {}) => ({
  sha: SHA, class: "GREEN", status: "READY", author: "claude-impl", authority: "standing-delegation",
  review: { verdict: "PASS", reviewer: "claude-reviewer", at: "21 Nov 2026" }, ci: { conclusion: "success", sha: SHA },
  ...o,
});
async function ctx(o: Ctx = {}): Promise<Ctx> {
  const { policyHash } = await lib();
  return {
    policyText, activationMd: act(policyHash(policyText)), register: { releases: [entry()] }, files: ["app/page.tsx"], addedLines: ["const a = 1;"],
    sha: SHA, live: LIVE, env: { RELEASE_DELEGATION: "ACTIVE" }, now: new Date("2026-11-21T12:00:00Z"), ...o,
  };
}
const amber = (o: Record<string, unknown> = {}) => entry({ class: "AMBER", amber: { impact: "adds one nullable column, no reads change", migrationReversible: true, rollbackTarget: LIVE, backupAt: "2026-11-21T06:00:00Z", ...o } });

describe("classification", () => {
  it("GREEN, AMBER and RED paths", async () => {
    const { classifyPath } = await lib();
    expect(classifyPath("app/page.tsx", policy)).toBe("GREEN");
    expect(classifyPath("components/Chart.tsx", policy)).toBe("GREEN");
    expect(classifyPath("docs/notes.md", policy)).toBe("GREEN");
    expect(classifyPath("db/migrations/001.sql", policy)).toBe("AMBER");
    expect(classifyPath("app/api/bonds/route.ts", policy)).toBe("AMBER");
    expect(classifyPath("app/api/stripe/webhook/route.ts", policy)).toBe("RED");
    expect(classifyPath("app/api/admin/users/route.ts", policy)).toBe("RED");
  });
  it("RED beats GREEN and AMBER; an unlisted path is RED (fail closed)", async () => {
    const { classifyPath, classifyChange } = await lib();
    expect(classifyPath("some-new-top-level.txt", policy)).toBe("RED");
    expect(classifyChange(["app/page.tsx", "package.json"], policy).klass).toBe("RED");
    expect(classifyChange(["db/x.sql", "app/page.tsx"], policy).klass).toBe("AMBER");
    expect(classifyChange([], policy).klass).toBe("RED");
  });
  it("odd paths are RED", async () => {
    const { classifyPath } = await lib();
    for (const p of ["", "/etc/passwd", "app/../.github/workflows/deploy.yml", "app\\x.ts"]) expect(classifyPath(p, policy)).toBe("RED");
  });
  it("the authority itself is RED: policy, gate, claim, audit, workflows, approvals, CLAUDE.md", async () => {
    const { classifyPath } = await lib();
    for (const p of ["docs/delegation/policy.json", "docs/livio-asks.md", "CLAUDE.md", ".github/workflows/deploy.yml", ".github/CODEOWNERS", "scripts/release-gate.mjs", "scripts/release-claim.mjs", "scripts/release-approvals.mjs", "scripts/release-audit.mjs", "scripts/delegation.mjs", "scripts/delegation-run.mjs", "scripts/fly-rollback.sh", "scripts/prod-change-gate.mjs", "scripts/accounts-url.mjs", "fly.toml", "Dockerfile", "lib/legalRisk/x.ts"]) expect(classifyPath(p, policy), p).toBe("RED");
  });
  it("every tracked file gets a class, and every security-sensitive tracked path is RED", async () => {
    const { classifyPath } = await lib();
    const files = execFileSync("git", ["ls-files"], { cwd: root, encoding: "utf8" }).split("\n").filter(Boolean);
    for (const f of files) expect(["GREEN", "AMBER", "RED"]).toContain(classifyPath(f, policy));
    for (const f of files.filter((x) => /^(\.github\/|scripts\/(release|delegation|fly-|prod-change|accounts-url)|docs\/delegation\/|CLAUDE\.md$|app\/api\/(auth|admin|stripe|billing)\/)/.test(x))) expect(classifyPath(f, policy), f).toBe("RED");
  });
});

describe("automatic release checks (fail closed)", () => {
  it("allows a reviewed GREEN change with CI success", async () => {
    const { checkDelegation, autoId } = await lib();
    const r = checkDelegation(await ctx());
    expect(r.errors).toEqual([]); expect(r.klass).toBe("GREEN"); expect(r.id).toBe(autoId(SHA));
  });
  it("is paused unless the owner variable is exactly ACTIVE", async () => {
    const { checkDelegation } = await lib();
    for (const v of [undefined, "", "PAUSED", "active", "ACTIVE ", "true"]) {
      const r = checkDelegation(await ctx({ env: v === undefined ? {} : { RELEASE_DELEGATION: v } }));
      expect(r.errors.join(" "), String(v)).toMatch(/paused/);
    }
  });
  it("needs Livio's ACTIVE activation bound to this exact policy hash; editing the policy ends it", async () => {
    const { checkDelegation, policyHash } = await lib();
    expect((checkDelegation(await ctx({ activationMd: "# nothing" }))).errors.join()).toMatch(/activation/);
    expect((checkDelegation(await ctx({ activationMd: act(policyHash(policyText), "PENDING-GO") }))).errors.join()).toMatch(/activation/);
    expect((checkDelegation(await ctx({ activationMd: act(policyHash(policyText), "ACTIVE", "Claude, 21 Nov 2026") }))).errors.join()).toMatch(/activation/);
    expect((checkDelegation(await ctx({ activationMd: act(policyHash(policyText), "ACTIVE", "Livio") }))).errors.join()).toMatch(/activation/);
    expect((checkDelegation(await ctx({ policyText: policyText.replace('"version": 1', '"version": 2') }))).errors.join()).toMatch(/activation/);
    expect((checkDelegation(await ctx({ activationMd: act(policyHash(policyText)) + "\n## Standing delegation\n" }))).errors).toEqual([]);
    const both = act(policyHash(policyText)).replace("| DEL-0001", `| DEL-0002 | ${policyHash(policyText)} | Livio, 22 Nov 2026 | REVOKED |\n| DEL-0001`);
    expect((checkDelegation(await ctx({ activationMd: both }))).errors.join()).toMatch(/activation/);
  });
  it("RED changes never pass, whatever the register says", async () => {
    const { checkDelegation } = await lib();
    for (const f of ["package.json", ".github/workflows/deploy.yml", "docs/delegation/policy.json", "docs/livio-asks.md", "CLAUDE.md", "scripts/release-gate.mjs", "app/api/stripe/x.ts", "new-unknown-file"]) {
      const r = checkDelegation(await ctx({ files: ["app/page.tsx", f], register: { releases: [entry({ class: "RED" })] } }));
      expect(r.errors.join(), f).toMatch(/RED change/);
    }
  });
  it("needs a READY register entry for this exact commit on main", async () => {
    const { checkDelegation } = await lib();
    expect((checkDelegation(await ctx({ register: { releases: [] } }))).errors.join()).toMatch(/no release-register entry/);
    expect((checkDelegation(await ctx({ register: { releases: [entry({ sha: "e".repeat(40) })] } }))).errors.join()).toMatch(/no release-register entry/);
    expect((checkDelegation(await ctx({ register: { releases: [entry({ status: "DRAFT" })] } }))).errors.join()).toMatch(/READY/);
    expect((checkDelegation(await ctx({ register: null }))).errors.join()).toMatch(/no release-register entry/);
    expect((checkDelegation(await ctx({ sha: "abc" }))).errors.join()).toMatch(/40-character/);
    expect((checkDelegation(await ctx({ live: "" }))).errors.join()).toMatch(/live commit is unknown/);
  });
  it("needs independent review PASS by someone other than the author, and CI success on this commit", async () => {
    const { checkDelegation } = await lib();
    const run = async (e: Record<string, unknown>) => checkDelegation(await ctx({ register: { releases: [entry(e)] } })).errors.join();
    expect(await run({ review: { verdict: "FAIL", reviewer: "r", at: "x" } })).toMatch(/not PASS/);
    expect(await run({ review: { verdict: "PASS WITH NOTES", reviewer: "r", at: "x" } })).toMatch(/not PASS/);
    expect(await run({ review: undefined })).toMatch(/not PASS/);
    expect(await run({ review: { verdict: "PASS", reviewer: "CLAUDE-IMPL", at: "x" } })).toMatch(/must differ/);
    expect(await run({ review: { verdict: "PASS", at: "x" } })).toMatch(/name the reviewer/);
    expect(await run({ author: undefined })).toMatch(/author/);
    expect(await run({ ci: { conclusion: "failure", sha: SHA } })).toMatch(/CI success/);
    expect(await run({ ci: { conclusion: "success", sha: LIVE } })).toMatch(/CI success/);
    expect(await run({ ci: undefined })).toMatch(/CI success/);
    expect(await run({ class: "AMBER" })).toMatch(/register says class/);
  });
  it("blocks destructive SQL in added lines, for GREEN and AMBER", async () => {
    const { checkDelegation } = await lib();
    for (const l of ["DROP TABLE users;", "  truncate bonds", "delete from sessions where 1=1", "ALTER TABLE x DROP COLUMN y; -- drop  column"]) {
      expect((checkDelegation(await ctx({ addedLines: [l] }))).errors.join(), l).toMatch(/destructive SQL/);
    }
    expect((checkDelegation(await ctx({ addedLines: ["const dropdown = true; // deleted rows"] }))).errors).toEqual([]);
  });
  it("AMBER needs impact, reversible migration, baseline rollback target and a fresh backup", async () => {
    const { checkDelegation } = await lib();
    const run = async (o: Record<string, unknown>, files = ["db/migrations/002.sql"]) => checkDelegation(await ctx({ files, register: { releases: [amber(o)] } }));
    expect((await run({})).errors).toEqual([]);
    expect((await run({})).klass).toBe("AMBER");
    expect((await run({ impact: "" })).errors.join()).toMatch(/impact/);
    expect((await run({ migrationReversible: false })).errors.join()).toMatch(/reversible/);
    expect((await run({ rollbackTarget: SHA })).errors.join()).toMatch(/rollback target/);
    expect((await run({ backupAt: "2026-11-19T06:00:00Z" })).errors.join()).toMatch(/backup/);
    expect((await run({ backupAt: "" })).errors.join()).toMatch(/backup/);
    expect((await run({ backupAt: "2026-11-22T06:00:00Z" })).errors.join()).toMatch(/backup/);
    expect((await run({ backupAt: undefined })).errors.join()).toMatch(/backup/);
  });
  it("an entry cannot lower the class below what the files say", async () => {
    const { checkDelegation } = await lib();
    const r = checkDelegation(await ctx({ files: ["db/x.sql"], register: { releases: [entry({ class: "GREEN" })] } }));
    expect(r.errors.join()).toMatch(/register says class GREEN, the changed files say AMBER|AMBER needs/);
  });
  it("another repository's policy is refused", async () => {
    const { checkDelegation, policyHash } = await lib();
    const other = policyText.replace("1903978-prog/10bonds", "1903978-prog/lm-op-model");
    expect((checkDelegation(await ctx({ policyText: other, activationMd: act(policyHash(other)) }))).errors.join()).toMatch(/another repository/);
  });
  it("malformed policy fails closed", async () => {
    const { checkDelegation } = await lib();
    expect((checkDelegation(await ctx({ policyText: "{nope" }))).errors.join()).toMatch(/policy/);
  });
});

describe("wiring", () => {
  const read = (p: string) => readFileSync(join(root, p), "utf8");
  it("deploy.yml passes the owner variable to both the gate and the claim, and still needs both", () => {
    const y = read(".github/workflows/deploy.yml");
    expect((y.match(/RELEASE_DELEGATION: \$\{\{ vars\.RELEASE_DELEGATION \}\}/g) ?? []).length).toBe(2);
    expect(y).toMatch(/needs: \[gate, test\]/);
    expect(y).not.toMatch(/RELEASE_DELEGATION: ["']?ACTIVE/); // never hard-wired in a file an agent can edit
  });
  it("the gate and claim run the delegation path only for AUTO ids and only for deploy", () => {
    const g = read("scripts/release-gate.mjs"), c = read("scripts/release-claim.mjs");
    expect(g).toMatch(/startsWith\("AUTO-"\)/); expect(c).toMatch(/startsWith\("AUTO-"\)/);
    expect(g).toMatch(/runDelegation/); expect(c).toMatch(/runDelegation/);
  });
  it("an AUTO id cannot be used for a rollback or without the gate running as a command", () => {
    const r = spawnSync(process.execPath, [join(root, "scripts/release-gate.mjs"), "--workflow", "rollback", "--approval", "AUTO-aaaaaaaaaaaa"], { cwd: root, encoding: "utf8", env: { PATH: process.env.PATH ?? "" } as unknown as NodeJS.ProcessEnv });
    expect(r.status).toBe(1); expect(r.stderr).toMatch(/BLOCKED/);
  });
  it("release audit accepts a live commit only from a READY non-RED standing-delegation entry", async () => {
    const { auditLiveAuto } = await lib();
    const live = { sha: SHA };
    expect(auditLiveAuto({ releases: [entry()] }, live)).toBe(true);
    expect(auditLiveAuto({ releases: [entry({ class: "RED" })] }, live)).toBe(false);
    expect(auditLiveAuto({ releases: [entry({ authority: "owner-go" })] }, live)).toBe(false);
    expect(auditLiveAuto({ releases: [] }, live)).toBe(false);
    expect(auditLiveAuto(null, live)).toBe(false);
  });
  it("the register's history is real data (every deploy run has a 40-hex sha and a run id) and starts with no automatic releases", () => {
    const reg = JSON.parse(read("docs/release-register.json"));
    for (const h of reg.history) { expect(h.sha).toMatch(/^[0-9a-f]{40}$/); expect(Number.isInteger(h.run)).toBe(true); }
    expect(reg.releases).toEqual([]);
  });
  it("the pending activation row holds the hash of the policy file as committed", async () => {
    const { policyHash } = await lib();
    expect(read("docs/livio-asks.md")).toContain(`| DEL-0001 | ${policyHash(policyText)} |`);
  });
  it("this repository has no activation row marked ACTIVE for the current policy until Livio's GO is recorded", async () => {
    const { activeActivation, policyHash } = await lib();
    const md = read("docs/livio-asks.md");
    const act = activeActivation(md, policyText);
    if (act) expect(act[1]).toBe(policyHash(policyText));
  });
});
