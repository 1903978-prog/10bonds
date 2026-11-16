import { describe, expect, it } from "vitest";
import { mkdtempSync, writeFileSync, rmSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { spawnSync } from "node:child_process";

// Offline tests only. No real HTTP calls, production writes or Fly operations.
const script = join(__dirname, "../scripts/uptime-probe.sh");
const summarize = (file: string) => spawnSync("bash", [script, "--summary", file], { encoding: "utf8" });

describe.skipIf(process.platform === "win32")("release uptime probe", () => {
  it("reports every non-200 response, including connection failures, without failing deployment", () => {
    const dir = mkdtempSync(join(tmpdir(), "10b-uptime-"));
    try {
      const file = join(dir, "samples.log");
      writeFileSync(file, [
        "1800000000000 200 0.080",
        "1800000000500 503 0.350",
        "1800000001000 000 4.000",
        "1800000001500 200 0.110",
        "",
      ].join("\n"));
      const r = summarize(file);
      expect(r.status).toBe(0);
      expect(r.stdout).toContain("Samples: 4; non-200 responses: 2");
      expect(r.stdout).toContain("HTTP 503");
      expect(r.stdout).toContain("HTTP 000");
      expect(r.stdout).toContain("slowest response: 4.000 seconds");
    } finally {
      rmSync(dir, { recursive: true, force: true });
    }
  });

  it("does not falsely certify availability when samples are missing", () => {
    const r = summarize(join(tmpdir(), "10bonds-uptime-file-does-not-exist.log"));
    expect(r.status).toBe(0);
    expect(r.stdout).toContain("No samples collected; uptime has NOT been verified");
  });

  it("reports a clean interval without claiming guaranteed zero downtime", () => {
    const dir = mkdtempSync(join(tmpdir(), "10b-uptime-"));
    try {
      const file = join(dir, "samples.log");
      writeFileSync(file, "1800000000000 200 0.1\n1800000000500 200 0.2\n");
      const r = summarize(file);
      expect(r.status).toBe(0);
      expect(r.stdout).toContain("non-200 responses: 0");
      expect(r.stdout).toContain("does not prove absolute zero downtime");
    } finally {
      rmSync(dir, { recursive: true, force: true });
    }
  });
});
