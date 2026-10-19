import { describe, expect, it } from "vitest";
import { execFileSync } from "node:child_process";
import { mkdtempSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { buildXlsx, crc32 } from "./xlsx";

describe("xlsx", () => {
  it("crc32 matches the known value", () => {
    expect(crc32(new TextEncoder().encode("123456789")).toString(16)).toBe("cbf43926");
  });
  it("builds a valid zip with the sheet text and numbers", () => {
    const bytes = buildXlsx([["Issuer", "Yield %"], ["Italy & Co <x>", 3.5], ["Germany", null]], "Top 10");
    const dir = mkdtempSync(join(tmpdir(), "xlsx-"));
    const f = join(dir, "t.xlsx");
    writeFileSync(f, bytes);
    const list = execFileSync("unzip", ["-t", f]).toString();
    expect(list).toMatch(/No errors detected/);
    const sheet = execFileSync("unzip", ["-p", f, "xl/worksheets/sheet1.xml"]).toString();
    expect(sheet).toContain("Italy &amp; Co &lt;x&gt;");
    expect(sheet).toContain("<v>3.5</v>");
    expect(execFileSync("unzip", ["-p", f, "xl/workbook.xml"]).toString()).toContain('name="Top 10"');
  });
});
