import { describe, expect, it } from "vitest";
import { readFileSync, readdirSync } from "node:fs";
import { join } from "node:path";

// 10B-0008: only the nightly live check may e-mail the owner (10bonds CLAUDE.md). Backup and link-check failures reach him
// inside that one summary instead of separate e-mails.
const root = join(__dirname, "..");
const wf = (f: string) => readFileSync(join(root, ".github/workflows", f), "utf8");
async function lib() {
  const p = "../scripts/nightly-runs-check.mjs";
  return (await import(/* @vite-ignore */ p)) as { judgeRuns: (l: string, runs: unknown[], now?: number) => string | null };
}
const now = Date.parse("2026-11-13T03:10:00Z");
const run = (o: Record<string, string>) => ({ status: "completed", conclusion: "success", created_at: "2026-11-13T02:15:00Z", html_url: "u", ...o });

describe("owner e-mails", () => {
  it("only the nightly live check e-mails the owner automatically", () => {
    for (const f of readdirSync(join(root, ".github/workflows"))) {
      const s = wf(f);
      const scheduled = /^\s+schedule:/m.test(s) || /workflow_run:/.test(s);
      if (f === "nightly-live-check.yml" || !scheduled) continue;
      expect(s, f).not.toMatch(/live-check-alert|api\.resend\.com\/emails|1903978@gmail\.com/);
    }
    expect(wf("nightly-live-check.yml")).toMatch(/nightly-runs-check\.mjs/);
    expect(wf("nightly-live-check.yml")).toMatch(/actions: read/);
  });
  it("a failed, missing or stale backup or link check makes the nightly summary fail", async () => {
    const { judgeRuns } = await lib();
    expect(judgeRuns("Backup", [run({})], now)).toBeNull();
    expect(judgeRuns("Backup", [run({ conclusion: "failure" })], now)).toMatch(/failure/);
    expect(judgeRuns("Backup", [run({ created_at: "2026-11-11T02:15:00Z" })], now)).toMatch(/h old/);
    expect(judgeRuns("Backup", [], now)).toMatch(/no completed/);
    expect(judgeRuns("Backup", [{ ...run({ created_at: "2026-11-13T02:50:00Z" }), status: "in_progress" }, run({ conclusion: "failure" })], now)).toMatch(/failure/);
    expect(judgeRuns("Backup", [run({ created_at: "garbage" })], now)).toMatch(/old/);
    // Tonight's run hung: reported, even though last night's passed.
    expect(judgeRuns("Backup", [{ ...run({ created_at: "2026-11-13T02:00:00Z" }), status: "in_progress" }, run({ created_at: "2026-11-12T02:15:00Z" })], now)).toMatch(/still in_progress/);
    expect(judgeRuns("Backup", [{ ...run({ created_at: "2026-11-13T02:45:00Z" }), status: "in_progress" }, run({ created_at: "2026-11-12T02:15:00Z" })], now)).toBeNull();
  });
});
