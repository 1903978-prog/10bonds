/* eslint-disable @typescript-eslint/no-explicit-any */
import { describe, expect, it } from "vitest";
import { createHash } from "node:crypto";
import { readFileSync } from "node:fs";
import { join } from "node:path";
import { workerAlerts } from "./creditResearchDb";

// Unattended 24/7 running of the Lenovo credit worker (12 Nov 2026 audit: the worker was silent 2-12 Nov).
const dir = join(__dirname, "../scripts/credit-worker");
const read = (n: string) => readFileSync(join(dir, n), "utf8");
async function worker() {
  process.env.WORKER_TOKEN = "crw_test";
  const path = "../scripts/credit-worker/worker.mjs";
  return (await import(/* @vite-ignore */ path)) as any;
}

describe("credit worker installer and supervisor", () => {
  it("pins the exact reviewed files (run node scripts/credit-worker/pin.mjs after a change)", () => {
    const ps = read("install-service.ps1");
    for (const n of ["worker.mjs", "package.json", "run-worker.ps1"]) {
      const sha = createHash("sha256").update(readFileSync(join(dir, n))).digest("hex");
      expect(ps).toContain(`'${n}'`);
      expect(ps.match(new RegExp(`'${n.replace(".", "\\.")}'\\s*=\\s*'([0-9a-f]{64})'`))?.[1]).toBe(sha);
    }
  });
  it("starts before sign-in, after resume and as a watchdog; one copy; no time limit; restarts on failure", () => {
    const ps = read("install-service.ps1");
    expect(ps).toMatch(/New-ScheduledTaskTrigger -AtStartup/);
    expect(ps).toMatch(/Power-Troubleshooter'\] and EventID=1/);
    expect(ps).toMatch(/-RepetitionInterval \(New-TimeSpan -Minutes 5\)/);
    expect(ps).toMatch(/-LogonType S4U/);
    expect(ps).toMatch(/-MultipleInstances IgnoreNew/);
    expect(ps).toMatch(/-ExecutionTimeLimit \(\[TimeSpan\]::Zero\)/);
    expect(ps).toMatch(/-RestartCount 999/);
    expect(read("run-worker.ps1")).toMatch(/Mutex\(\$false, 'Global\\10bonds-credit-worker'\)/);
  });
  it("keeps the token encrypted and private, and removes the plain-text config", () => {
    const ps = read("install-service.ps1");
    expect(ps).toMatch(/ProtectedData\]::Protect/);
    expect(ps).toMatch(/icacls \$tokenFile \/inheritance:r/);
    expect(ps).toMatch(/Remove-Item -Force \$oldConfig/);
    for (const n of ["start-worker.bat", "install-autostart.bat", "run-worker.ps1"]) expect(read(n)).not.toMatch(/config\.txt|set \/p/i);
  });
  it("never downloads code at restart, never pulls a model, never opens Ollama to the network", () => {
    for (const n of ["worker.mjs", "run-worker.ps1", "start-worker.bat"]) {
      expect(read(n)).not.toMatch(/raw\.githubusercontent\.com/);
      expect(read(n)).not.toMatch(/ollama pull|\/api\/pull|ollama run/i);
    }
    expect(read("run-worker.ps1")).toContain("OLLAMA_HOST = '127.0.0.1:11434'");
    expect(read("install-service.ps1")).not.toMatch(/ollama pull|0\.0\.0\.0/i);
  });
  it("guards against a restart loop and keeps logs bounded", () => {
    const ps = read("run-worker.ps1");
    expect(ps).toMatch(/\$starts\.Count -ge 10/);
    expect(ps).toMatch(/\$MaxLogBytes = 5MB/);
    expect(ps).toMatch(/Test-WorkerCode/);
  });
});

describe("credit worker loop", () => {
  it("backs off with a cap and jitter", async () => {
    const w = await worker();
    expect(w.backoffMs(0, 1000, 60_000, () => 0.5)).toBe(1000);
    expect(w.backoffMs(3, 1000, 60_000, () => 0.5)).toBe(8000);
    expect(w.backoffMs(50, 1000, 60_000, () => 0.5)).toBe(60_000);
    expect(w.backoffMs(3, 1000, 60_000, () => 0)).toBe(6000);
    expect(w.backoffMs(3, 1000, 60_000, () => 1)).toBe(10_000);
  });
  it("claims only when Ollama answers and qwen3:8b is installed", async () => {
    const w = await worker();
    expect(await w.ollamaReady(async () => ({ models: [{ name: "qwen3:8b" }] }))).toBe("ok");
    expect(await w.ollamaReady(async () => ({ models: [{ name: "qwen3.5:2b" }] }))).toBe("model-missing");
    expect(await w.ollamaReady(async () => { throw new Error("ECONNREFUSED"); })).toBe("ollama-down");
  });
  it("sends a finished result again after a network error or 5xx, but not after a 4xx", async () => {
    const w = await worker();
    const noWait = async () => {};
    let n = 0;
    const res = await w.completeWithRetry(async () => { n++; if (n === 1) throw new Error("reset"); if (n === 2) return { status: 503 }; return { status: 200, ok: true }; }, 4, noWait);
    expect(res.status).toBe(200); expect(n).toBe(3);
    let m = 0;
    expect((await w.completeWithRetry(async () => { m++; return { status: 409 }; }, 4, noWait)).status).toBe(409);
    expect(m).toBe(1);
    await expect(w.completeWithRetry(async () => ({ status: 500 }), 2, noWait)).rejects.toThrow(/HTTP 500/);
  });
});

describe("worker alerts", () => {
  it("connected is not enough: the worker must be able to work and finish jobs", () => {
    expect(workerAlerts({ connected: true, stage: "idle", queued: 10, okLast6h: 3 })).toEqual([]);
    expect(workerAlerts({ connected: false, stage: "idle", queued: 10, okLast6h: 0 })).toHaveLength(2);
    expect(workerAlerts({ connected: true, stage: "model-missing", queued: 0, okLast6h: 0 })[0]).toMatch(/qwen3:8b/);
    expect(workerAlerts({ connected: true, stage: "ollama-down", queued: 0, okLast6h: 0 })[0]).toMatch(/Ollama/);
    expect(workerAlerts({ connected: true, stage: "extracting", queued: 5, okLast6h: 0 })[0]).toMatch(/none finished/);
  });
});
