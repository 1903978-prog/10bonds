#!/usr/bin/env node
// Last night's backup (with restore test) and link check must have run and passed (10B-0008). Run by the nightly live check,
// so any failure reaches the owner in its ONE summary e-mail; backup.yml and link-crawl.yml no longer e-mail by themselves.
// Needs GH_TOKEN (actions: read), GITHUB_REPOSITORY. Exit 1 = a nightly job failed, did not run, or could not be read.
export const NIGHTLY = [
  { file: "backup.yml", label: "Nightly backup and restore test" },
  { file: "link-crawl.yml", label: "Nightly link check" },
];
export const MAX_AGE_HOURS = 26;

/** Problem text for one workflow's recent scheduled runs (newest first), or null when the last one passed recently. */
export function judgeRuns(label, runs, now = Date.now()) {
  const done = (runs ?? []).filter((r) => r.status === "completed");
  if (!done.length) return `${label}: no completed scheduled run found`;
  const last = done[0];
  const ageH = (now - Date.parse(last.created_at)) / 3_600_000;
  if (!(ageH <= MAX_AGE_HOURS)) return `${label}: last run is ${Math.round(ageH)} h old (more than ${MAX_AGE_HOURS} h)`;
  if (last.conclusion !== "success") return `${label}: last run ${last.conclusion} (${last.html_url})`;
  return null;
}

if (process.argv[1]?.endsWith("nightly-runs-check.mjs")) {
  const api = process.env.GITHUB_API_URL ?? "https://api.github.com", repo = process.env.GITHUB_REPOSITORY, token = process.env.GH_TOKEN;
  const problems = [];
  for (const w of NIGHTLY) {
    try {
      const r = await fetch(`${api}/repos/${repo}/actions/workflows/${w.file}/runs?event=schedule&per_page=5`, {
        headers: { authorization: `Bearer ${token}`, accept: "application/vnd.github+json" }, signal: AbortSignal.timeout(20_000),
      });
      if (!r.ok) throw new Error(`HTTP ${r.status}`);
      const p = judgeRuns(w.label, (await r.json()).workflow_runs);
      if (p) problems.push(p); else console.log(`${w.label}: OK`);
    } catch (e) { problems.push(`${w.label}: could not be read (${e.message})`); }
  }
  if (problems.length) { console.error("NIGHTLY JOBS FAILED: " + problems.join("; ")); process.exit(1); }
}
