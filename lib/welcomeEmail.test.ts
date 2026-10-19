import { describe, expect, it } from "vitest";
import { accessDaysLeft, requestLang, welcomeEmail, WELCOME_LANGS } from "./welcomeEmail";

const req = (headers: Record<string, string>) => new Request("https://x.test/", { headers });

describe("welcome e-mail", () => {
  it("links to the reader's language pages and carries the trial, the plans, the disclaimer and the seller", () => {
    const it_ = welcomeEmail("it", "mario", null, "https://10bonds.com");
    expect(it_.subject).toBe("Benvenuto su 10BONDS");
    expect(it_.html).toContain('href="https://10bonds.com/it/sapere"');
    expect(it_.html).toContain('href="https://10bonds.com/it/calcolatori/rendimento-netto-btp"');
    const en = welcomeEmail("en", "mario", 30, "https://10bonds.com");
    expect(en.text).toContain("https://10bonds.com/knowledge/bond-yield-calculator");
    for (const l of WELCOME_LANGS) {
      const m = welcomeEmail(l, "<b>", null, "https://10bonds.com");
      expect(m.html).not.toContain("<b>");
      expect(m.text).not.toMatch(/\b30\b/);
      expect(welcomeEmail(l, "x", 30).text).toMatch(/\b30\b/);
      expect(m.text).toContain("SQUARE ONE OÜ");
      expect(m.text).toContain("89");
      expect(m.text).toContain("https://10bonds.com/account");
    }
  });

  it("mentions free access only to promo-code users", () => {
    expect(accessDaysLeft(null)).toBeNull();
    expect(accessDaysLeft("2026-01-01T00:00:00Z", Date.parse("2026-02-01T00:00:00Z"))).toBeNull();
    expect(accessDaysLeft("2026-01-31T00:00:00Z", Date.parse("2026-01-01T00:00:00Z"))).toBe(30);
  });

  it("uses the language cookie first, then the browser's languages", () => {
    expect(requestLang(req({ cookie: "a=1; tb_lang=de" }))).toBe("de");
    expect(requestLang(req({ cookie: "tb_lang=en", "accept-language": "it-IT" }))).toBe("en");
    expect(requestLang(req({ "accept-language": "fr-FR,fr;q=0.9" }))).toBe("fr");
    expect(requestLang(req({}))).toBe("en");
  });
});
