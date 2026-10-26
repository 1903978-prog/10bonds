import { describe, expect, it } from "vitest";
import { weeklyEmail, type WeeklyPicks } from "./weeklyEmail";

const picks: WeeklyPicks = {
  asOf: "2026-10-23",
  scanned: 3915,
  rows: Array.from({ length: 10 }, (_, i) => ({ issuer: `Issuer ${i + 1} & Co`, maturity: "2031-06-15", ret: 4 + i / 10, risk: 4 + (i % 3) })),
};

describe("weekly top 10 e-mail", () => {
  it("lists the 10 bonds with the unsubscribe link, in every language", () => {
    for (const lang of ["en", "it", "fr", "de"]) {
      const m = weeklyEmail(lang, picks, "https://10bonds.com/api/newsletter/unsubscribe?t=x", "https://10bonds.com");
      expect(m.html.match(/Issuer \d+ &#38; Co/g)).toHaveLength(10);
      expect(m.text).toContain("Issuer 10 & Co");
      expect(m.html).toContain("https://10bonds.com/api/newsletter/unsubscribe?t=x");
      expect(m.text).toContain("https://10bonds.com/api/newsletter/unsubscribe?t=x");
    }
  });
  it("follows the customer wording rules", () => {
    for (const lang of ["en", "it", "fr", "de"]) {
      const { html, text, subject } = weeklyEmail(lang, picks, null, "https://10bonds.com");
      const all = `${subject}\n${html}\n${text}`;
      expect(all).not.toMatch(/\bYTM\b|yield to maturity|Livio|S&P|Moody|Fitch|best bonds/i);
    }
    expect(weeklyEmail("en", picks, null).text).toContain("Return (per year)");
  });
  it("falls back to English and shows averages", () => {
    const m = weeklyEmail("xx", picks, null, "https://10bonds.com", new Date("2026-10-26T07:30:00Z"));
    expect(m.subject).toBe("Your weekly top 10 bonds · 26 Oct 2026");
    expect(m.text).toContain("Average return 4.45% per year · average risk 4.9 of 10");
  });
});
