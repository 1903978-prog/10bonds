import { describe, expect, it } from "vitest";
import { buildLlmsTxt } from "./llms";
import { ORGANIZATION } from "./org";
import { COMPANY } from "@/lib/legal";

describe("llms.txt", () => {
  const txt = buildLlmsTxt("https://10bonds.com");
  it("starts with the site name and a summary line", () => {
    expect(txt.startsWith("# 10BONDS\n\n> ")).toBe(true);
  });
  it("lists only public pages on the site's own address", () => {
    const links = [...txt.matchAll(/\]\((.*?)\)/g)].map((m) => m[1]);
    expect(links.length).toBeGreaterThan(20);
    for (const l of links) {
      expect(l.startsWith("https://10bonds.com/")).toBe(true);
      expect(l).not.toMatch(/\/(admin|account|api|redeem|login|signup)/);
    }
    expect(txt).toContain("https://10bonds.com/it");
    expect(txt).toContain("https://10bonds.com/de");
  });
});

describe("organization", () => {
  it("names the legal entity, its address and a logo", () => {
    expect(ORGANIZATION.legalName).toBe(COMPANY.legalName);
    expect(COMPANY.address).toContain(ORGANIZATION.address.postalCode);
    expect(COMPANY.address).toContain(ORGANIZATION.address.streetAddress);
    expect(ORGANIZATION.logo.endsWith("/icon.svg")).toBe(true);
  });
});
