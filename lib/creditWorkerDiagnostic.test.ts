import { describe, expect, it } from "vitest";
import { readFileSync } from "node:fs";
import { join } from "node:path";

const source = readFileSync(join(__dirname, "../scripts/credit-worker/verify-service.ps1"), "utf8");

describe("Lenovo post-install verification (read-only)", () => {
  it("checks the task identity and restart/watchdog conditions without changing them", () => {
    expect(source).toContain("Get-ScheduledTask -TaskName");
    expect(source).toContain("Get-ScheduledTaskInfo -TaskName");
    expect(source).toContain("taskAtBoot");
    expect(source).toContain("taskWatchdog");
    expect(source).toContain("taskOnResume");
    expect(source).toContain("taskLogonType -eq 'S4U'");
    expect(source).toContain("Microsoft-Windows-Power-Troubleshooter");
    expect(source).toMatch(/EventID\\s\*=\\s\*1/);
    expect(source).not.toContain("if ($class -match 'EventTrigger') { $summary.taskOnResume = $true }");
  });

  it("checks installed worker code integrity, encrypted-token presence and local model readiness", () => {
    expect(source).toContain("Get-FileHash -Algorithm SHA256");
    expect(source).toContain("workerHashMatchesInstalledPin");
    expect(source).toContain("'token.bin'");
    expect(source).toContain("http://127.0.0.1:11434/api/tags");
    expect(source).toContain("'qwen3:8b'");
  });

  it("treats public worker status as non-attributable to this physical Lenovo", () => {
    expect(source).toContain("most recent worker");
    expect(source).toContain("https://10bonds.com/api/credit-worker/status");
    expect(source).toContain("A local configuration check does not prove 24/7 uptime");
    expect(source).toContain("localConfigurationHealthy");
  });

  it("is diagnostic only and avoids credentials or service-state mutations", () => {
    expect(source).not.toMatch(/^\s*(Start|Stop|Register|Unregister)-ScheduledTask\b/m);
    expect(source).not.toMatch(/^\s*(Start|Stop)-Process\b/m);
    expect(source).not.toMatch(/^\s*(Invoke-WebRequest|Set-Content|New-Item|Remove-Item|Move-Item)\b/m);
    expect(source).not.toMatch(/\bProtectedData\b|\bRead-Token\b|\bWORKER_TOKEN\b/i);
    expect(source).toMatch(/ConvertTo-Json -Depth 5/);
    expect(source).toMatch(/exit 2/);
  });
});
