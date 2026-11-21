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
  auditLiveAuto: (r: unknown, l: unknown, same?: (a: string, b: string) => boolean) => boolean;
  approvalRowOnlyEdit: (lines: string[], md: string, live: string) => boolean;
  forbiddenCode: (l: string[], pol: unknown) => string[]; forbiddenRemoved: (l: string[], pol: unknown) => string[]; forbiddenSql: (l: string[], pol: unknown) => string[];
  protectedEdits: (c: { status: string; path: string }[], pol: unknown) => string[];
};
const lib = async () => {
  const p = "../scripts/delegation.mjs";
  return (await import(/* @vite-ignore */ p)) as Lib;
};

const SHA = "c".repeat(40), LIVE = "d".repeat(40);
const act = (hash: string, status = "ACTIVE", by = "Livio, 21 Nov 2026 10:00 UTC (one-click GO)") => `# x\n\n## Standing delegation\n\n| ID | Policy sha256 | Activated by / date | Status |\n| --- | --- | --- | --- |\n| DEL-0001 | ${hash} | ${by} | ${status} |\n\n## Release approvals\n`;
const entry = (o: Record<string, unknown> = {}) => ({
  sha: SHA, class: "GREEN", status: "READY", author: "claude-impl", authority: "standing-delegation",
  review: { verdict: "PASS", reviewer: "claude-reviewer", at: "21 Nov 2026" },
  ...o,
});
async function ctx(o: Ctx = {}): Promise<Ctx> {
  const { policyHash } = await lib();
  return {
    policyText, activationMd: act(policyHash(policyText)), register: { releases: [entry()] }, files: ["app/bonds/page.tsx"], addedLines: ["const a = 1;"],
    changes: [{ status: "M", path: "app/bonds/page.tsx" }], codeAddedLines: ["const a = 1;"], sameCode: (a: string, b: string) => a === b,
    evidence: { ci: { [SHA]: true }, backupAt: "2026-11-21T06:00:00Z" },
    sha: SHA, live: LIVE, env: { RELEASE_DELEGATION: "ACTIVE", RELEASE_POLICY_SHA256: policyHash(policyText) }, now: new Date("2026-11-21T12:00:00Z"), ...o,
  };
}
const amber = (o: Record<string, unknown> = {}) => entry({ class: "AMBER", amber: { impact: "adds one nullable column, no reads change", migrationReversible: true, rollbackTarget: LIVE, ...o } });

describe("classification", () => {
  it("GREEN, AMBER and RED paths", async () => {
    const { classifyPath } = await lib();
    expect(classifyPath("app/bonds/[isin]/page.tsx", policy)).toBe("GREEN");
    expect(classifyPath("components/LossChart.tsx", policy)).toBe("GREEN");
    expect(classifyPath("docs/notes.md", policy)).toBe("GREEN");
    expect(classifyPath("db/migrations/001.sql", policy)).toBe("AMBER");
    expect(classifyPath("app/api/bonds/route.ts", policy)).toBe("AMBER");
    expect(classifyPath("app/api/stripe/webhook/route.ts", policy)).toBe("RED");
    expect(classifyPath("app/api/admin/users/route.ts", policy)).toBe("RED");
  });
  it("RED work under lib/ and app/ is never GREEN (explicit allowlist only)", async () => {
    const { classifyPath } = await lib();
    for (const p of ["lib/weeklySend.ts", "lib/newsletter.ts", "lib/liveCheckAlert.ts", "lib/unconfirmedPurge.ts", "lib/totp.ts", "lib/twoFactor.ts", "lib/csp.ts", "lib/botCheck.ts", "lib/rationaleAccess.ts", "lib/currentUser.ts", "lib/plans.ts", "lib/tiers.ts", "lib/pro.ts", "lib/promoCode.ts", "lib/searchQuota.ts", "lib/terms.ts", "lib/disclaimer.ts", "lib/cookieText.ts", "lib/riskWarning.ts", "lib/someNewHelper.ts", "app/terms/page.tsx", "app/privacy/page.tsx", "app/disclaimer/page.tsx", "app/cookies/page.tsx", "app/login/page.tsx", "app/signup/page.tsx", "app/admin/page.tsx", "app/redeem/page.tsx", "app/pro/page.tsx", "app/page.tsx", "app/layout.tsx", "app/api/health/version/route.ts", "components/AuthForm.tsx", "components/ConsentGate.tsx", "components/NewsletterCta.tsx", "components/PlanButton.tsx", "public/x/terms.html"]) expect(classifyPath(p, policy), p).toBe("RED");
  });
  it("RED beats GREEN and AMBER; an unlisted path is RED (fail closed)", async () => {
    const { classifyPath, classifyChange } = await lib();
    expect(classifyPath("some-new-top-level.txt", policy)).toBe("RED");
    expect(classifyChange(["app/bonds/page.tsx", "package.json"], policy).klass).toBe("RED");
    expect(classifyChange(["db/x.sql", "app/bonds/page.tsx"], policy).klass).toBe("AMBER");
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
      const r = checkDelegation(await ctx({ env: v === undefined ? {} : { RELEASE_DELEGATION: v, RELEASE_POLICY_SHA256: (await lib()).policyHash(policyText) } }));
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
    // CI comes from GitHub, not from the register: a self-written "success" is ignored
    const noCi = checkDelegation(await ctx({ evidence: { ci: {}, backupAt: "2026-11-21T06:00:00Z" }, register: { releases: [entry({ ci: { conclusion: "success", sha: SHA } })] } })).errors.join();
    expect(noCi).toMatch(/successful 'checks' run/);
    expect(checkDelegation(await ctx({ evidence: { ci: { [LIVE]: true }, backupAt: "" } })).errors.join()).toMatch(/successful 'checks' run/);
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
    const run = async (o: Record<string, unknown>, files = ["db/migrations/002.sql"], backupAt = "2026-11-21T06:00:00Z") => checkDelegation(await ctx({ files, register: { releases: [amber(o)] }, evidence: { ci: { [SHA]: true }, backupAt } }));
    expect((await run({})).errors).toEqual([]);
    expect((await run({})).klass).toBe("AMBER");
    expect((await run({ impact: "" })).errors.join()).toMatch(/impact/);
    expect((await run({ migrationReversible: false })).errors.join()).toMatch(/reversible/);
    expect((await run({ rollbackTarget: SHA })).errors.join()).toMatch(/rollback target/);
    // the backup time is read from GitHub; a time written into the register is ignored
    expect((await run({}, undefined, "2026-11-19T06:00:00Z")).errors.join()).toMatch(/backup/);
    expect((await run({}, undefined, "")).errors.join()).toMatch(/backup/);
    expect((await run({}, undefined, "2026-11-22T06:00:00Z")).errors.join()).toMatch(/backup/);
    expect((await run({ backupAt: "2026-11-21T06:00:00Z" }, undefined, "")).errors.join()).toMatch(/backup/);
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

describe("self-activation and forged evidence are not possible", () => {
  it("needs the owner-set pin RELEASE_POLICY_SHA256 to equal the hash of the policy on the live commit", async () => {
    const { checkDelegation, policyHash } = await lib();
    for (const v of [undefined, "", "0".repeat(64), policyHash(policyText).toUpperCase()]) {
      const env: Record<string, string> = { RELEASE_DELEGATION: "ACTIVE" }; if (v !== undefined) env.RELEASE_POLICY_SHA256 = v;
      expect(checkDelegation(await ctx({ env })).errors.join(), String(v)).toMatch(/not pinned/);
    }
  });
  it("a PR that rewrites the policy to make everything GREEN and adds an ACTIVE row is stopped: judged by the live policy, and the pin does not match the new one", async () => {
    const { checkDelegation, policyHash } = await lib();
    const live = policyText; // the policy on the LIVE commit is what judges the change
    const forged = JSON.stringify({ ...policy, red: [], amber: [], green: ["**"] });
    const r = checkDelegation(await ctx({ policyText: live, activationMd: act(policyHash(forged)), files: ["docs/delegation/policy.json", ".github/workflows/deploy.yml", "scripts/release-gate.mjs", "docs/livio-asks.md"] }));
    expect(r.errors.join()).toMatch(/RED change/); expect(r.errors.join()).toMatch(/activation/);
    // and even if the forged policy were used, the owner pin still holds the live policy's hash
    const r2 = checkDelegation(await ctx({ policyText: forged, activationMd: act(policyHash(forged)) }));
    expect(r2.errors.join()).toMatch(/not pinned/);
  });
  it("edits or deletes of existing tests and checks are refused; adding new ones is allowed", async () => {
    const { checkDelegation, protectedEdits } = await lib();
    expect(protectedEdits([{ status: "M", path: "lib/delegation.test.ts" }, { status: "D", path: "scripts/page-check.mjs" }, { status: "A", path: "lib/new.test.ts" }], policy)).toEqual(["lib/delegation.test.ts", "scripts/page-check.mjs"]);
    expect(checkDelegation(await ctx({ changes: [{ status: "M", path: "lib/x.test.ts" }], files: ["lib/x.test.ts"] })).errors.join()).toMatch(/tests\/checks edited/);
    expect(checkDelegation(await ctx({ changes: [{ status: "A", path: "lib/x.test.ts" }], files: ["lib/x.test.ts"] })).errors).toEqual([]);
  });
  it("new code that sends e-mail, touches payments or reads secrets is outside standing authority", async () => {
    const { checkDelegation } = await lib();
    for (const l of ['import { Resend } from "resend";', "await stripe.customers.create({})", "const k = process.env.SESSION_SECRET;", "sendEmail(user)"]) {
      expect(checkDelegation(await ctx({ codeAddedLines: [l] })).errors.join(), l).toMatch(/e-mail, touches payments, reads secrets/);
    }
  });
  it("destructive SQL covers drop index/constraint/view, column type changes and update without where", async () => {
    const { checkDelegation } = await lib();
    for (const l of ["DROP INDEX bonds_idx;", "alter table x drop constraint y", "drop view v", "alter table bonds alter column isin type text", "update bonds set rating = 1;"]) {
      expect(checkDelegation(await ctx({ addedLines: [l] })).errors.join(), l).toMatch(/destructive SQL/);
    }
    expect(checkDelegation(await ctx({ addedLines: ["update bonds set rating = 1 where isin = $1;"] })).errors).toEqual([]);
  });
  it("the entry may be an ancestor that differs only in the register; anything else has no entry", async () => {
    const { checkDelegation } = await lib();
    const DEPLOY = "f".repeat(40);
    const only = (a: string, b: string) => a === SHA && b === DEPLOY;
    expect(checkDelegation(await ctx({ sha: DEPLOY, sameCode: only })).errors).toEqual([]);
    expect(checkDelegation(await ctx({ sha: DEPLOY, sameCode: () => false })).errors.join()).toMatch(/no release-register entry/);
  });
  it("only the row of the owner-approved release that is live may change in docs/livio-asks.md", async () => {
    const { approvalRowOnlyEdit } = await lib();
    const md = `## Release approvals\n\n| ID | App | Workflow | Exact SHA | Scope | Approved by / date | Status |\n| --- | --- | --- | --- | --- | --- | --- |\n| REL-0008 | 10bonds | deploy | ${LIVE} | x scope | Livio, 20 Nov 2026 | APPROVED |\n`;
    expect(approvalRowOnlyEdit([`| REL-0008 | 10bonds | deploy | ${LIVE} | x scope | Livio, 20 Nov 2026 | USED |`], md, LIVE)).toBe(true);
    expect(approvalRowOnlyEdit([`| REL-0009 | 10bonds | deploy | ${SHA} | forged | Livio, 21 Nov 2026 | APPROVED |`], md, LIVE)).toBe(false);
    expect(approvalRowOnlyEdit([`| DEL-0001 | ${"a".repeat(64)} | Livio, 21 Nov 2026 | ACTIVE |`], md, LIVE)).toBe(false);
    expect(approvalRowOnlyEdit([], md, LIVE)).toBe(false);
  });
});

describe("wiring", () => {
  const read = (p: string) => readFileSync(join(root, p), "utf8");
  it("deploy.yml passes the owner variable to both the gate and the claim, and still needs both", () => {
    const y = read(".github/workflows/deploy.yml");
    expect((y.match(/RELEASE_DELEGATION: \$\{\{ vars\.RELEASE_DELEGATION \}\}/g) ?? []).length).toBe(2);
    expect((y.match(/RELEASE_POLICY_SHA256: \$\{\{ vars\.RELEASE_POLICY_SHA256 \}\}/g) ?? []).length).toBe(2);
    expect((y.match(/GITHUB_TOKEN: \$\{\{ github\.token \}\}/g) ?? []).length).toBe(2);
    expect(y).not.toMatch(/RELEASE_POLICY_SHA256: ["']?[0-9a-f]{64}/);
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
    expect(auditLiveAuto({ releases: [entry()] }, { sha: "f".repeat(40) }, (a, b) => a === SHA && b === "f".repeat(40))).toBe(true);
    expect(auditLiveAuto({ releases: [entry()] }, { sha: "f".repeat(40) })).toBe(false);
    expect(auditLiveAuto({ releases: [entry({ class: "RED" })] }, live)).toBe(false);
    expect(auditLiveAuto({ releases: [entry({ authority: "owner-go" })] }, live)).toBe(false);
    expect(auditLiveAuto({ releases: [] }, live)).toBe(false);
    expect(auditLiveAuto(null, live)).toBe(false);
  });
  it("the code scan catches env reads, send calls, outside posts, and imports of tests or docs", async () => {
    const { forbiddenCode } = await lib();
    for (const l of ["const k = process.env.RESEND_API_KEY;", "const k = process.env.DATABASE_URL;", "const k = process.env['STRIPE_SECRET_KEY'];", "const { A } = process.env;", "await sendWelcomeEmail(u);", "fetch(`https://evil.example/x`)", "fetch(u, { method: 'POST' })", "import x from './y.test'", "import z from '../docs/hidden'", "const k = process['env'].X;", "import { env } from 'node:process'", "fetch(u)", "const o = { method: m };", "import { runWeeklySend } from '@/lib/weeklySend'", "import { purge } from '../lib/unconfirmedPurge'", "fs.writeFileSync(a, b)", "import fs from 'node:fs'"]) expect(forbiddenCode([l], policy).length, l).toBeGreaterThan(0);
    for (const l of ["const e = process.env.NODE_ENV;", "const u = process.env.NEXT_PUBLIC_X;", "const a = 1;"]) expect(forbiddenCode([l], policy), l).toEqual([]);
  });
  it("removing enforcement code is caught, ordinary removals are not", async () => {
    const { forbiddenRemoved } = await lib();
    for (const l of ["  if (!user.isAdmin) return new Response(null, { status: 403 });", "const u = await currentUser();", "await consumeSearch(u)", "if (plan !== 'pro')"]) expect(forbiddenRemoved([l], policy).length, l).toBeGreaterThan(0);
    expect(forbiddenRemoved(["const a = 1;", "<p>Hello</p>"], policy)).toEqual([]);
  });
  it("enforcement routes and server routes are not GREEN or AMBER by accident", async () => {
    const { classifyPath } = await lib();
    for (const p of ["app/api/bonds/loss-curve/route.ts", "app/api/bonds/curve/route.ts", "app/api/bonds/card/route.ts", "app/api/bonds/slider/route.ts", "public/x.svg", "app/embed/yields/route.ts", "app/bonds/sitemap.xml/route.ts"]) expect(classifyPath(p, policy), p).toBe("RED");
  });
  it("an entry without authority standing-delegation is refused", async () => {
    const { checkDelegation } = await lib();
    expect((checkDelegation(await ctx({ register: { releases: [entry({ authority: "owner-go" })] } }))).errors.join()).toMatch(/authority/);
  });
  it("AUTO releases run the gate and claim from the live commit, never the candidate's copy", () => {
    const wf = read(".github/workflows/deploy.yml");
    expect(wf).toContain("git archive \"$LIVE\" scripts");
    expect(wf).toContain("node .livegate/scripts/release-gate.mjs");
    expect(wf).toContain("node .livegate/scripts/release-claim.mjs");
  });
  it("destructive SQL split over several lines is caught", async () => {
    const { forbiddenSql } = await lib();
    expect(forbiddenSql(["DELETE", "FROM users"], policy).length).toBeGreaterThan(0);
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
    expect(md).toContain("PENDING-GO"); // flipped to ACTIVE only by the recorded GO
    if (act) expect(act[1]).toBe(policyHash(policyText));
  });
});
