// iPhone results (the owner, 29/10/2026): from the home page the main button opens the finder with the sliders and toggles ON TOP and the
// 10 bonds BELOW them as a compressed list (issuer, years, return, minus sign; one line of at most 34 px each). No full-screen page, no ISIN, no chips.
// Usage: BASE=http://127.0.0.1:3311 CHROME_PATH=... node scripts/phone-list-check.mjs          (the list answer is stubbed, so it needs no bond data)
//        BASE=https://10bonds.com LIVE=1 ... node scripts/phone-list-check.mjs                   (the real answer)
import { chromium } from "playwright-core";

const BASE = (process.env.BASE ?? "http://127.0.0.1:3311").replace(/\/$/, "");
const LIVE = process.env.LIVE === "1";
const SIZES = [[390, 844], [375, 667], [414, 896], [390, 664], [430, 932]];
const STUB = {
  tier: "free", lockedCount: 0, features: [], excluded: false, source: "live", asOf: "2026-10-29T01:00:00.000Z", durationBand: 4, status: "READY", engine: "stored",
  inputs: { duration: 4, ytm: 5, risk: 10 }, summary: { count: 10, avgYtm: 5.07, avgDuration: 4.2, avgRisk: 4.7, lifeLoss: 0.79 },
  rows: Array.from({ length: 10 }, (_, i) => ({ rank: i + 1, issuer: ["MBH Bank Nyrt.", "Stellantis", "SES", "PLN", "Aareal Bank AG", "Vonovia SE", "LEG Immobilien", "Orano", "Goldman Sachs", "Cofinimmo"][i], ytm: 6.36 - i * 0.2, duration: 4.7 - i * 0.1, risk: 6 - Math.floor(i / 3) })),
};

const browser = await chromium.launch({ executablePath: process.env.CHROME_PATH, channel: process.env.CHROME_CHANNEL || undefined });
let fails = 0;
const say = (ok, name, detail) => { if (!ok) fails++; console.log(`${ok ? "PASS" : "FAIL"} ${name} ${detail}`); };
for (const [w, h] of SIZES) {
  const ctx = await browser.newContext({ viewport: { width: w, height: h }, deviceScaleFactor: 2, isMobile: true, hasTouch: true });
  await ctx.addInitScript(() => localStorage.setItem("tb_cookie_consent", JSON.stringify({ necessary: true, statistics: false, marketing: false, at: Date.now() })));
  const page = await ctx.newPage();
  if (!LIVE) await page.route(/\/api\/bonds\?/, (r) => r.fulfill({ status: 200, contentType: "application/json", body: JSON.stringify(STUB) }));
  await page.goto(BASE + "/", { waitUntil: "load" });
  await page.getByTestId("intro-skip").tap();
  await page.waitForTimeout(1500);
  await page.getByRole("button", { name: /I understand/i }).click({ timeout: 4000 }).catch(() => {});
  await page.getByTestId("phone-list-rows").waitFor({ timeout: 20000 }).catch(() => {});
  const m = await page.evaluate(() => {
    const top = (e) => (e ? Math.round(e.getBoundingClientRect().top) : null);
    const rows = [...document.querySelectorAll('[data-testid="phone-list-rows"] li')];
    const slider = document.querySelector('input[type="range"], [role="slider"]');
    const toggles = [...document.querySelectorAll("button")].filter((b) => /^(Short|Medium|Long)/.test(b.innerText.trim())).length;
    return {
      sheet: !!document.querySelector('[data-testid="phone-results"]'),
      sliderTop: top(slider), toggles, listTop: top(document.querySelector('[data-testid="phone-list"]')),
      rows: rows.length, rowH: rows.length ? Math.max(...rows.map((r) => Math.round(r.getBoundingClientRect().height))) : null,
      isin: rows.some((r) => /\b[A-Z]{2}[A-Z0-9]{9}\d\b/.test(r.innerText)),
      minus: rows.filter((r) => r.querySelector("svg")).length,
      cut: rows.some((r) => r.scrollWidth > r.clientWidth + 1),
      sideways: document.documentElement.scrollWidth > window.innerWidth,
    };
  });
  const tag = `${w}x${h}`;
  say(!m.sheet, `${tag} no full-screen results page`, "");
  say(m.sliderTop !== null && m.toggles >= 3 && m.listTop !== null && m.sliderTop < m.listTop, `${tag} sliders and horizon toggles are above the list`, `slider ${m.sliderTop}, list ${m.listTop}`);
  say(m.rows === 10, `${tag} ten bonds listed`, `${m.rows}`);
  say(m.rowH !== null && m.rowH <= 34, `${tag} compressed lines (<= 34 px)`, `${m.rowH}px`);
  say(!m.isin && m.minus === m.rows && !m.cut && !m.sideways, `${tag} only issuer, years, return, minus sign; nothing cut or sideways`, `isin ${m.isin}, minus ${m.minus}`);
  if (process.env.SHOTS) await page.screenshot({ path: `${process.env.SHOTS}/phone-list-${tag}.png` });
  await ctx.close();
}
await browser.close();
if (fails) { console.log(`${fails} check(s) failed`); process.exit(1); }
