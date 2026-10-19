import { describe, expect, it } from "vitest";
import { inflateRawSync, deflateRawSync } from "node:zlib";
import { analysePortfolio } from "./portfolioAnalysis";
import { cleanPriceFromYield } from "./bondPrice";
import { readXlsxRows } from "./xlsxRead";
import { buildXlsx } from "./xlsx";
import { parsePortfolio } from "./portfolioCsv";
import { SAMPLE_BONDS } from "./sample-bonds";

const today = new Date("2026-10-19T00:00:00Z");

describe("cleanPriceFromYield", () => {
  it("prices at par when the yield equals the coupon", () => {
    expect(cleanPriceFromYield(3, "2031-10-19", 3, today)).toBeCloseTo(100, 1);
    expect(cleanPriceFromYield(3, "2031-04-19", 3, today)).toBeCloseTo(100, 0);
  });
  it("prices below par when the yield is above the coupon", () => {
    const p = cleanPriceFromYield(2, "2031-10-19", 4, today)!;
    expect(p).toBeLessThan(92);
    expect(p).toBeGreaterThan(90);
  });
  it("needs coupon and maturity", () => {
    expect(cleanPriceFromYield(null, "2031-10-19", 3, today)).toBeNull();
    expect(cleanPriceFromYield(3, null, 3, today)).toBeNull();
  });
});

describe("analysePortfolio", () => {
  it("weights by value, flags unknown ISINs and builds the curve", () => {
    const a = analysePortfolio(
      [{ isin: SAMPLE_BONDS[0].isin, amount: 100_000 }, { isin: SAMPLE_BONDS[5].isin, amount: 100_000 }, { isin: "XS0000000001", amount: 5 }],
      SAMPLE_BONDS,
      today,
    );
    expect(a.positions).toHaveLength(2);
    expect(a.notFound).toEqual(["XS0000000001"]);
    expect(a.totals.ytm).toBeGreaterThan(Math.min(SAMPLE_BONDS[0].grossYtm!, SAMPLE_BONDS[5].grossYtm!));
    expect(a.band!.from).toBeCloseTo(a.totals.duration! * 0.8);
    expect(a.curve.length).toBeGreaterThan(0);
    for (const c of a.curve) expect(c.best).toBeGreaterThanOrEqual(c.typical);
    // Only risk scores, never agency grades.
    expect(JSON.stringify(a)).not.toMatch(/"(AAA|BBB\+?|rating)/);
  });
});

describe("readXlsxRows", () => {
  it("reads our own template back (stored zip)", async () => {
    const bytes = buildXlsx([["ISIN", "Bond name", "Quantity (nominal)"], ["XS1234567890", "Alpha 3% 2030", 250000]]);
    const rows = await readXlsxRows(bytes, async (d) => new Uint8Array(inflateRawSync(d)));
    expect(rows).toEqual([["ISIN", "Bond name", "Quantity (nominal)"], ["XS1234567890", "Alpha 3% 2030", "250000"]]);
    expect(parsePortfolio(rows.map((r) => r.join("\t")).join("\n")).holdings).toEqual([{ isin: "XS1234567890", amount: 250000 }]);
  });

  it("reads an Excel-style file with shared strings and deflate", async () => {
    const files: Record<string, string> = {
      "xl/workbook.xml": '<workbook xmlns:r="r"><sheets><sheet name="P" sheetId="1" r:id="rId1"/></sheets></workbook>',
      "xl/_rels/workbook.xml.rels": '<Relationships><Relationship Id="rId1" Type="ws" Target="worksheets/sheet1.xml"/></Relationships>',
      "xl/sharedStrings.xml": "<sst><si><t>ISIN</t></si><si><t>IT0005123456</t></si><si><r><t>Italy </t></r><r><t>BTP</t></r></si></sst>",
      "xl/worksheets/sheet1.xml": '<worksheet><sheetData><row r="1"><c r="A1" t="s"><v>0</v></c></row><row r="2"><c r="A2" t="s"><v>1</v></c><c r="B2" t="s"><v>2</v></c><c r="D2"><v>1.5E5</v></c></row></sheetData></worksheet>',
    };
    const rows = await readXlsxRows(zip(files), async (d) => new Uint8Array(inflateRawSync(d)));
    expect(rows).toEqual([["ISIN"], ["IT0005123456", "Italy BTP", "", "1.5E5"]]);
    expect(parsePortfolio(rows.map((r) => r.join("\t")).join("\n")).holdings).toEqual([{ isin: "IT0005123456", amount: 150000 }]);
  });
});

/** Minimal zip writer with deflate, to mimic files saved by Excel. */
function zip(files: Record<string, string>): Uint8Array {
  const enc = new TextEncoder();
  const parts: Uint8Array[] = [];
  const central: Uint8Array[] = [];
  let offset = 0;
  for (const [n, text] of Object.entries(files)) {
    const name = enc.encode(n);
    const data = new Uint8Array(deflateRawSync(enc.encode(text)));
    const local = new Uint8Array(30 + name.length);
    const v = new DataView(local.buffer);
    v.setUint32(0, 0x04034b50, true);
    v.setUint16(8, 8, true);
    v.setUint32(18, data.length, true);
    v.setUint16(26, name.length, true);
    local.set(name, 30);
    const cen = new Uint8Array(46 + name.length);
    const w = new DataView(cen.buffer);
    w.setUint32(0, 0x02014b50, true);
    w.setUint16(10, 8, true);
    w.setUint32(20, data.length, true);
    w.setUint16(28, name.length, true);
    w.setUint32(42, offset, true);
    cen.set(name, 46);
    parts.push(local, data);
    central.push(cen);
    offset += local.length + data.length;
  }
  const size = central.reduce((s, c) => s + c.length, 0);
  const end = new Uint8Array(22);
  const e = new DataView(end.buffer);
  e.setUint32(0, 0x06054b50, true);
  e.setUint16(10, central.length, true);
  e.setUint32(12, size, true);
  e.setUint32(16, offset, true);
  const all = [...parts, ...central, end];
  const out = new Uint8Array(all.reduce((s, c) => s + c.length, 0));
  let p = 0;
  for (const c of all) { out.set(c, p); p += c.length; }
  return out;
}
