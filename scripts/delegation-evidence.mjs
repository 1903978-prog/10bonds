// Evidence the agent cannot write: read from the GitHub API with the workflow's own token (checks: read, actions: read). Any failure throws, so the gate fails closed.
const api = async (path, env) => {
  const token = env.GITHUB_TOKEN, repo = env.GITHUB_REPOSITORY || "1903978-prog/10bonds";
  if (!token) throw new Error("GITHUB_TOKEN missing: GitHub evidence cannot be read");
  const r = await fetch(`https://api.github.com/repos/${repo}${path}`, { headers: { authorization: `Bearer ${token}`, accept: "application/vnd.github+json", "x-github-api-version": "2022-11-28" }, signal: AbortSignal.timeout(20_000) });
  if (!r.ok) throw new Error(`GitHub API ${path.split("?")[0]} answered HTTP ${r.status}`);
  return r.json();
};
/** True when a completed check run named "checks" (ci.yml) succeeded on the exact commit (or, for a merge commit, on the PR head = its last parent) and no run there failed. */
export async function ciSucceeded(sha, env = process.env) {
  const parents = ((await api(`/commits/${sha}`, env)).parents ?? []).map((p) => p.sha);
  const target = parents.length > 1 ? parents[parents.length - 1] : sha;
  const runs = (await api(`/commits/${target}/check-runs?per_page=100`, env)).check_runs ?? [];
  const checks = runs.filter((r) => r.name === "checks" && r.status === "completed");
  return checks.length > 0 && checks.every((r) => r.conclusion === "success") && !runs.some((r) => r.status === "completed" && ["failure", "cancelled", "timed_out"].includes(r.conclusion));
}
/** ISO time of the latest successful SCHEDULED run on main of the nightly backup workflow, or "". */
export async function latestBackup(env = process.env) {
  const r = await api("/actions/workflows/backup.yml/runs?status=success&branch=main&event=schedule&per_page=1", env);
  return r.workflow_runs?.[0]?.updated_at ?? "";
}
