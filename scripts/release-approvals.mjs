// Release approvals in docs/livio-asks.md: parsing and the rules a release must meet (10B-0007). Used by release-gate.mjs and release-audit.mjs.
export const HEADER = ["id", "app", "workflow", "exact sha", "scope", "approved by / date", "status"];

export function parseReleaseApprovals(md) {
  const start = md.indexOf("## Release approvals");
  if (start < 0) return [];
  const rest = md.slice(start + 10);
  const end = rest.search(/\n## /);
  const body = end < 0 ? rest : rest.slice(0, end);
  return body.split("\n").filter((l) => l.startsWith("|") && !/^\|\s*-/.test(l)).map((l) => l.split("|").slice(1, -1).map((c) => c.trim()))
    .filter((c) => c.length === HEADER.length && c[0].toLowerCase() !== "id");
}

/** Errors that block the release (empty = allowed). */
export function checkRelease(md, { workflow, approval, sha, emergencyReason = "" }) {
  if (workflow !== "deploy" && workflow !== "rollback") return [`unknown workflow "${workflow}"`];
  if (workflow === "rollback" && !approval) {
    return emergencyReason.trim().length >= 20 ? [] : ["a rollback needs an approval id, or an emergency reason of at least 20 characters"];
  }
  if (!/^REL-\d{4}$/.test(approval ?? "")) return ["approval id must look like REL-0001"];
  const row = parseReleaseApprovals(md).find((c) => c[0] === approval);
  if (!row) return [`approval ${approval} is not recorded under "Release approvals" in docs/livio-asks.md on main`];
  const [, app, wf, rowSha, scope, by, status] = row;
  const errors = [];
  if (app !== "10bonds") errors.push(`approval is for app "${app}", not 10bonds`);
  if (wf !== workflow) errors.push(`approval is for "${wf}", not "${workflow}"`);
  if (status !== "APPROVED") errors.push(`status is "${status}", must be APPROVED (single use)`);
  if (!/livio/i.test(by) || !/\d{2} [A-Z][a-z]{2} \d{4}|\d{4}-\d{2}-\d{2}/.test(by)) errors.push('"approved by / date" must name Livio and a date');
  if (scope.length < 5) errors.push("scope missing");
  if (workflow === "deploy") {
    if (!/^[0-9a-f]{40}$/.test(rowSha)) errors.push("the approval must name the full 40-character commit SHA");
    else if (rowSha !== sha) errors.push(`approved SHA ${rowSha.slice(0, 12)} is not the commit being deployed ${String(sha).slice(0, 12)}`);
  }
  return errors;
}

