import { describe, expect, it } from "vitest";
import * as XLSX from "xlsx";
import { importedRank, importedSeniorityText, parseBondFile } from "./bondImportParse";

function file(rows: unknown[][]) {
  const ws = XLSX.utils.aoa_to_sheet(rows);
  const wb = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(wb, ws, "Bonds");
  return XLSX.write(wb, { type: "buffer", bookType: "xlsx" }) as Buffer;
}

describe("bond import parser", () => {
  const head = ["Issuer", "ISIN", "Coupon", "Maturity", "YTM", "Seniority", "AT1", "Tier 2", "SNP", "IR", "Weird"];
  const p = parseBondFile(
    file([head, ["A", "XS3176804576", 0.05, 47737, 0.0629, "", "NO", "NO", "NO", "44–57", "x"], ["B", "XS3176804576", 0.01, 47737], ["C", "bad", 1], ["D", "DE000DK013Y7", 0.03, 47613, 0.04, "Senior non-preferred", "NO", "NO", "YES", "", ""]]),
    "t.xlsx",
  );
  it("reads rows, converts fractions and Excel dates, skips bad and duplicate ISINs", () => {
    expect(p.rowsRead).toBe(4);
    expect(p.rows.map((r) => r.isin)).toEqual(["XS3176804576", "DE000DK013Y7"]);
    expect(p.duplicates).toEqual(["XS3176804576"]);
    expect(p.skipped).toHaveLength(1);
    expect(p.rows[0]).toMatchObject({ coupon: 5, ytm: 6.29, maturity: "2030-09-11", ir: "44–57" });
    expect(p.rows[0].raw.Weird).toBe("x");
  });
  it("derives the debt rank from flags and text", () => {
    expect(importedRank(p.rows[0])).toBeNull();
    expect(importedRank(p.rows[1])).toBe("snp");
    expect(importedSeniorityText(p.rows[1])).toBe("Senior non-preferred");
  });
});
