// Standing delegation for routine releases (GREEN / AMBER / RED). Pure rules, used by release-gate.mjs, release-claim.mjs and release-audit.mjs.
// Policy: docs/delegation/policy.json. Activation: ONE row in docs/livio-asks.md ("Standing delegation") that holds the SHA-256 of the policy file,
// recorded by Livio. Pause switch: the GitHub repository variable RELEASE_DELEGATION, owned by Livio; only the exact value ACTIVE allows an automatic release.
// The policy used to judge a change is the one on the commit that is LIVE now, never the one in the change, and it must match the owner-set pin RELEASE_POLICY_SHA256.
// Every rule fails closed: a missing, malformed or unclear input blocks the release. Changing this file, the policy, the gate, the workflows or CLAUDE.md is RED.
import { createHash } from "node:crypto";
import { execFileSync } from "node:child_process";
import { parseReleaseApprovals } from "./release-approvals.mjs";

export const AUTO_ID = /^AUTO-[0-9a-f]{12}$/;
export const SHA = /^[0-9a-f]{40}$/;
export const autoId = (sha) => `AUTO-${String(sha).slice(0, 12)}`;
export const policyHash = (text) => createHash("sha256").update(text).digest("hex");
// The pin: a repository variable only Livio sets (value = sha256 of docs/delegation/policy.json as it is on the LIVE commit). A branch cannot change it.
export const PIN_VAR = "RELEASE_POLICY_SHA256";
const RANK = { GREEN: 0, AMBER: 1, RED: 2 };
export const worst = (a, b) => (RANK[a] >= RANK[b] ? a : b);

export function globToRegExp(glob) {
  let re = "";
  for (let i = 0; i < glob.length; i++) {
    const c = glob[i];
    if (c === "*" && glob[i + 1] === "*") { re += ".*"; i++; if (glob[i + 1] === "/") i++; }
    else if (c === "*") re += "[^/]*";
    else re += c.replace(/[.+?^${}()|[\]\\]/g, "\\$&");
  }
  return new RegExp(`^${re}$`);
}
const matches = (list, path) => (list ?? []).some((g) => globToRegExp(g).test(path));

/** One path: RED beats AMBER beats GREEN; a path no pattern covers is RED (fail closed). Odd paths (absolute, "..", empty) are RED. */
export function classifyPath(path, policy) {
  const p = String(path ?? "");
  if (!p || p.startsWith("/") || p.split("/").includes("..") || p.includes("\\") || p.includes("\0")) return "RED";
  if (matches(policy.red, p)) return "RED";
  if (matches(policy.amber, p)) return "AMBER";
  if (matches(policy.green, p)) return "GREEN";
  return "RED";
}
export function classifyChange(files, policy) {
  if (!Array.isArray(files) || !files.length) return { klass: "RED", reasons: ["no changed files could be read"] };
  let klass = "GREEN"; const reasons = [];
  for (const f of files) { const k = classifyPath(f, policy); if (k !== "GREEN") reasons.push(`${k}: ${f}`); klass = worst(klass, k); }
  return { klass, reasons };
}

/** Rows of "## Standing delegation": | id | policy sha256 | activated by / date | status |. */
export function parseActivations(md) {
  const start = md.indexOf("## Standing delegation");
  if (start < 0) return [];
  const rest = md.slice(start + 22);
  const end = rest.search(/\n## /);
  return (end < 0 ? rest : rest.slice(0, end)).split("\n").filter((l) => l.startsWith("|") && !/^\|\s*-/.test(l))
    .map((l) => l.split("|").slice(1, -1).map((c) => c.trim())).filter((c) => c.length === 4 && c[0].toLowerCase() !== "id");
}
/** The activation that is in force for this policy text, or null. REVOKED rows win: any REVOKED row for this hash ends it. */
export function activeActivation(md, policyText) {
  const h = policyHash(policyText);
  const rows = parseActivations(md).filter((c) => c[1] === h);
  if (rows.some((c) => c[3] === "REVOKED")) return null;
  return rows.find((c) => c[3] === "ACTIVE" && /livio/i.test(c[2]) && /\d{2} [A-Z][a-z]{2} \d{4}|\d{4}-\d{2}-\d{2}/.test(c[2])) ?? null;
}

/** Added lines (diff "+" lines) that contain a destructive SQL statement. */
export function forbiddenSql(addedLines, policy) {
  const re = new RegExp(policy.amberRequires.forbiddenSqlInAddedLines, "i");
  const lines = addedLines ?? [], hits = lines.filter((l) => re.test(l));
  return hits.length || !re.test(lines.join(" ")) ? hits : ["(statement split over several lines)"];
}

/** Added lines (outside docs and tests) that send e-mail, touch payments or read secrets: new code like that is outside standing authority. */
export function forbiddenCode(addedLines, policy) {
  const re = new RegExp(policy.forbiddenCodeInAddedLines, "i");
  return (addedLines ?? []).filter((l) => re.test(l));
}
/** Removed lines (any file outside docs) that held enforcement code (login, admin, plan, quota, 401/403): removing a check is outside standing authority. */
export function forbiddenRemoved(removedLines, policy) {
  const re = new RegExp(policy.forbiddenRemovedLines, "i");
  return (removedLines ?? []).filter((l) => re.test(l));
}
/** Existing tests and checks may be added to, never edited, renamed or deleted, by an automatic release (a check cannot be weakened to get green). */
export function protectedEdits(changes, policy) {
  return (changes ?? []).filter((c) => c.status !== "A" && matches(policy.protectedEdits, c.path)).map((c) => c.path);
}
/** True when the only change to docs/livio-asks.md is the row of the owner-approved release whose exact commit is live now (recording its use). */
export function approvalRowOnlyEdit(changedLines, mainMd, live) {
  const rows = parseReleaseApprovals(mainMd).filter((c) => c[3] === live);
  if (!rows.length || !changedLines?.length) return false;
  return changedLines.every((l) => rows.some((c) => l.startsWith(`| ${c[0]} |`)));
}
/** The register entry for the commit being deployed: its own commit, or an ancestor whose only later change is docs/release-register.json. */
export function findEntry(register, sha, sameCode) {
  return Array.isArray(register?.releases) ? register.releases.find((r) => r.sha === sha || (SHA.test(String(r.sha)) && sameCode(r.sha, sha))) ?? null : null;
}

/**
 * Everything the automatic path checks. Returns { errors, klass, id }. `ctx`:
 *   policyText, activationMd (livio-asks.md from main), register (parsed docs/release-register.json from main), files (changed since the live commit),
 *   addedLines, codeAddedLines (outside docs and tests), changes ([{status,path}]), sha, live (the commit now serving), env (process.env-like), now (Date), sameCode(a,b) (b is a, or a descendant differing only in the register),
 *   evidence {ci: {<sha>: true if a successful 'checks' run exists, from the GitHub API}, backupAt (latest successful nightly backup run, from the GitHub API)}.
 */
export function checkDelegation(ctx) {
  const errors = [];
  let policy;
  try { policy = JSON.parse(ctx.policyText); } catch { return { errors: ["policy file is missing or not valid JSON"], klass: "RED", id: "" }; }
  const sha = String(ctx.sha ?? "");
  const id = autoId(sha);
  if (policy.repo !== "1903978-prog/10bonds") errors.push("policy is for another repository");
  if ((ctx.env ?? {})[policy.pauseSwitch.githubRepositoryVariable] !== policy.pauseSwitch.activeValue) errors.push(`paused: repository variable ${policy.pauseSwitch.githubRepositoryVariable} is not exactly ${policy.pauseSwitch.activeValue}`);
  if ((ctx.env ?? {})[PIN_VAR] !== policyHash(ctx.policyText)) errors.push(`policy not pinned: repository variable ${PIN_VAR} (set by Livio) must equal the SHA-256 of docs/delegation/policy.json on the live commit`);
  if (!activeActivation(ctx.activationMd ?? "", ctx.policyText)) errors.push("no ACTIVE activation row of Livio for this exact policy file (hash) in docs/livio-asks.md on main");
  if (!SHA.test(sha)) errors.push("the commit being deployed must be a full 40-character SHA");
  if (!SHA.test(String(ctx.live ?? ""))) errors.push("the live commit is unknown, so the change cannot be classified");
  const { klass, reasons } = classifyChange(ctx.files, policy);
  if (klass === "RED") errors.push("RED change: outside standing authority, needs Livio's own GO (" + reasons.slice(0, 6).join("; ") + ")");
  const prot = protectedEdits(ctx.changes, policy);
  if (prot.length) errors.push("existing tests/checks edited or deleted: outside standing authority (" + prot.slice(0, 4).join(", ") + ")");
  if (forbiddenCode(ctx.codeAddedLines, policy).length) errors.push("added code sends e-mail, touches payments, reads secrets, writes files, calls out, or imports a RED module: outside standing authority");
  if (forbiddenRemoved(ctx.codeRemovedLines, policy).length) errors.push("removed lines held enforcement code (login, admin, plan, quota, 401/403): outside standing authority");
  const reg = ctx.register, entry = findEntry(reg, sha, ctx.sameCode ?? ((a, b) => a === b));
  if (!entry) errors.push("no release-register entry for this commit on main (its own sha, or an ancestor differing only in the register)");
  else {
    if (entry.status !== "READY") errors.push(`register entry status is "${entry.status}", must be READY`);
    if (entry.class !== klass && klass !== "RED") errors.push(`register says class ${entry.class}, the changed files say ${klass}`);
    const rv = entry.review ?? {}; // attestation: recorded, not provable; the binding controls are the owner pin, GitHub CI/backup evidence, path classes and the scans
    if (rv.verdict !== policy.releaseEvidence.reviewVerdictRequired) errors.push("independent review verdict is not PASS");
    if (!rv.reviewer || !rv.at) errors.push("independent review must name the reviewer and the date");
    if (entry.authority !== "standing-delegation") errors.push('register entry authority must be "standing-delegation"');
    if (!entry.author) errors.push("register entry must name the author");
    else if (rv.reviewer && String(rv.reviewer).toLowerCase() === String(entry.author).toLowerCase()) errors.push("reviewer and author must differ");
    if (ctx.evidence?.ci?.[entry.sha] !== true) errors.push("GitHub does not show a successful 'checks' run for the entry's commit (the register's own CI field is not trusted)");
    if (forbiddenSql(ctx.addedLines, policy).length) errors.push("added lines contain a destructive SQL statement (delete/truncate/drop): outside standing authority");
    if (klass === "AMBER") {
      const a = entry.amber ?? {}, need = policy.amberRequires;
      if (!a.impact || String(a.impact).length < 20) errors.push("AMBER needs a written impact assessment (20+ characters)");
      if (need.migrationReversibleRequired && a.migrationReversible !== true) errors.push("AMBER needs a reversible migration (migrationReversible: true)");
      if (need.rollbackTargetMustBeBaseline && a.rollbackTarget !== ctx.live) errors.push("AMBER rollback target must be the commit that is live now");
      const t = Date.parse(ctx.evidence?.backupAt ?? ""); // from the GitHub API (latest successful nightly backup run), never from the register
      if (!Number.isFinite(t) || !(ctx.now instanceof Date) || ctx.now.getTime() - t > need.recoveryBackupMaxAgeHours * 3600_000 || t > ctx.now.getTime() + 60_000) errors.push(`AMBER needs a successful backup run (GitHub) within ${need.recoveryBackupMaxAgeHours} hours`);
    }
  }
  return { errors, klass, id };
}

/** Git helpers for the gate (workflow checks out main with full history). Any git error throws, so the gate fails closed. */
export function gitChange(live, sha, cwd = process.cwd()) {
  const run = (args) => execFileSync("git", args, { cwd, encoding: "utf8", maxBuffer: 64 * 1024 * 1024 });
  const changes = run(["diff", "--name-status", "--no-renames", "--no-ext-diff", live, sha]).split("\n").filter(Boolean).map((l) => { const [status, ...p] = l.split("\t"); return { status: status[0], path: p.join("\t") }; });
  const files = changes.map((c) => c.path);
  const lines = (a) => run(["diff", "--no-renames", "--no-ext-diff", "-U0", live, sha, ...a]).split("\n");
  // destructive SQL is looked for everywhere; the code scan skips docs and tests (they may name these words)
  const addedLines = lines([]).filter((l) => l.startsWith("+") && !l.startsWith("+++")).map((l) => l.slice(1));
  const codeLines = lines(["--", ".", ":(exclude,glob)docs/**"]);
  const codeAddedLines = codeLines.filter((l) => l.startsWith("+") && !l.startsWith("+++")).map((l) => l.slice(1));
  const codeRemovedLines = codeLines.filter((l) => l.startsWith("-") && !l.startsWith("---")).map((l) => l.slice(1));
  const asksLines = files.includes("docs/livio-asks.md") ? lines(["--", "docs/livio-asks.md"]).filter((l) => /^[+-]/.test(l) && !/^(\+\+\+|---)/.test(l)).map((l) => l.slice(1)) : [];
  return { files, changes, addedLines, codeAddedLines, codeRemovedLines, asksLines };
}
/** True when `later` is `earlier` or a descendant whose only changed file is docs/release-register.json. */
export function gitRegisterOnly(earlier, later, cwd = process.cwd()) {
  try {
    if (earlier === later) return true;
    execFileSync("git", ["merge-base", "--is-ancestor", earlier, later], { cwd, stdio: "ignore" });
    const f = execFileSync("git", ["diff", "--name-only", "--no-renames", "--no-ext-diff", earlier, later], { cwd, encoding: "utf8" }).split("\n").filter(Boolean);
    return f.every((x) => x === "docs/release-register.json");
  } catch { return false; }
}

/** Release audit for the automatic path: the live commit must be a READY, non-RED register entry. */
export function auditLiveAuto(register, live, sameCode = (a, b) => a === b) {
  const e = findEntry(register, live?.sha, sameCode);
  return Boolean(e && ["READY", "DEPLOYED"].includes(e.status) && e.class !== "RED" && e.authority === "standing-delegation");
}
