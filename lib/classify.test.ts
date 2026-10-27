import { describe, expect, it } from "vitest";
import { classifyRow, countryName, coverage } from "./classify";

describe("country and industry classification", () => {
  it("reads an ISO code or a name, never a placeholder", () => {
    expect(countryName("fr")).toBe("France");
    expect(countryName("Latvia")).toBe("Latvia");
    expect(countryName("XS")).toBeNull();
    expect(countryName("N/A")).toBeNull();
    expect(countryName(null)).toBeNull();
  });
  it("prefers the data model's issuer country over the old column", () => {
    const c = classifyRow({ isin: "XS1", issuer_country: "DE", country: "France" }, "Some Corp");
    expect(c.country).toBe("Germany");
    expect(c.countrySource).toBe("feed");
  });
  it("uses the ISIN prefix only for government bonds", () => {
    expect(classifyRow({ isin: "IT0005545095" }, "Italy").country).toBe("Italy");
    expect(classifyRow({ isin: "IT0005545095" }, "Italy").countrySource).toBe("isin-prefix");
    expect(classifyRow({ isin: "FR0012345678" }, "Some Unknown Company SA").country).toBeNull();
    expect(classifyRow({ isin: "XS0012345678", issuer_type: "government" }, "Some Fund").country).toBeNull();
  });
  it("takes the industry from the feed only when it is one of the twelve sectors", () => {
    expect(classifyRow({ isin: "FR1", issuer_sector: "Utilities" }, "Zz Unlisted Co").sector).toBe("Utilities");
    expect(classifyRow({ isin: "FR1", issuer_sector: "Banks" }, "Zz Unlisted Co").sector).toBeNull();
  });
  it("counts coverage by source", () => {
    const c = coverage([classifyRow({ isin: "IT1", issuer_country: "IT", issuer_sector: "Utilities" }, "Zz Co"), classifyRow({ isin: "FR1" }, "Zz Co")]);
    expect(c).toMatchObject({ total: 2, country: 1, sector: 1, both: 1, countryBySource: { feed: 1 } });
  });
});
