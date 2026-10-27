// Live check of the 30 risk-band positions (owner 27/10/2026) as an ANONYMOUS visitor in a real browser.
// 1. API: for Short/Medium/Long x points 1, 3, 10, 20, 30 the band list comes back with 10 rows (or "No portfolio for this risk level"),
//    the actual average risk inside the band, and fast. Prints the table: point x horizon with average risk, average return, expected loss, time.
// 2. Page: for each horizon the slider is moved to those points; the list of 10 rows and both tiles must be on screen within 1 s of the move.
// Usage: BASE=https://10bonds.com node scripts/bands-live-check.mjs     (CHROME_PATH or CHROME_CHANNEL picks the browser)
import { chromium } from "playwright-core";

const BASE = process.env.BASE ?? "https://10bonds.com";
const TERMS = [["Short", 2, 0], ["Medium", 4, 1], ["Long", 10, 2]];
const POINTS = [1, 3, 10, 20, 30];
const BANDS = Array.from({ length: 30 }, (_, i) => ({ min: Math.round((1 + 0.3 * i) * 10) / 10, max: i === 29 ? 10 : Math.round((1.2 + 0.3 * i) * 10) / 10 }));
let fails = 0;
const ok = (c, m) => { console.log((c ? "PASS " : "FAIL ") + m); if (!c) fails++; };
const rows = [];

// 1. API
for (const [label, d] of TERMS) for (const n of POINTS) {
  const t0 = Date.now();
  const r = await fetch(`${BASE}/api/bonds?band=${n}&duration=${d}&currency=EUR&size=100k&ytm=4&risk=10&guard=1`, { headers: { "x-live-check": "bands" } });
  const ms = Date.now() - t0;
  const b = r.headers.get("content-type")?.includes("ndjson") ? null : await r.json().catch(() => null);
  const line = r.status === 200 ? b : null;
  if (!line) { ok(false, `${label} point ${n}: unexpected answer (HTTP ${r.status})`); rows.push({ label, n, ms, err: true }); continue; }
  const band = BANDS[n - 1];
  if (line.status === "INFEASIBLE") {
    ok(line.band?.none === true, `${label} point ${n}: no list for this band, stated as such (${ms} ms)`);
    rows.push({ label, n, ms, none: true });
    continue;
  }
  const inBand = line.band && line.band.avgRisk >= band.min - 1e-9 && line.band.avgRisk <= band.max + 1e-9;
  ok(line.rows.length === 10, `${label} point ${n}: 10 rows`);
  ok(!!inBand, `${label} point ${n}: average risk ${line.band?.avgRisk} inside ${band.min}-${band.max}`);
  ok(ms < 1000, `${label} point ${n}: answered in ${ms} ms`);
  rows.push({ label, n, ms, risk: line.band?.avgRisk, ytm: line.band?.ytm, el: line.band?.el, optimal: line.band?.optimal, source: line.band?.source });
}

// 2. Page, anonymous
const browser = await chromium.launch(process.env.CHROME_PATH ? { executablePath: process.env.CHROME_PATH } : process.env.CHROME_CHANNEL ? { channel: process.env.CHROME_CHANNEL } : {});
const ctx = await browser.newContext({ viewport: { width: 1440, height: 900 } });
const page = await ctx.newPage();
await page.addInitScript(() => localStorage.setItem("tb_cookie_consent", JSON.stringify({ necessary: true, preferences: false, statistics: false, marketing: false })));
const errors = [];
page.on("pageerror", (e) => errors.push(e.message));
await page.goto(`${BASE}/?intro=0`, { waitUntil: "domcontentloaded" });
await page.waitForSelector('[data-testid="term-picker"]', { timeout: 30000 });
const ready = () => page.waitForFunction(() => document.querySelectorAll("table tbody tr:not([aria-hidden]) td.tabular-nums").length >= 10 && /\d\.\d\d%/.test(document.querySelector('[data-testid="result-boxes"]')?.textContent ?? ""), null, { timeout: 15000 });
const pageTimes = [];
for (const [label, , idx] of TERMS) {
  await page.locator('[data-testid="term-picker"] [role="radio"]').nth(idx).click();
  await page.locator('[data-testid="find-portfolio"]').click();
  await ready().catch(() => {});
  const slider = page.locator('input[type="range"]').first();
  for (const n of POINTS) {
    const t0 = Date.now();
    // The slider is reversed: position n is the input value 31 - n.
    await slider.evaluate((el, v) => { const set = Object.getOwnPropertyDescriptor(HTMLInputElement.prototype, "value").set; set.call(el, String(v)); el.dispatchEvent(new Event("input", { bubbles: true })); }, 31 - n);
    const shown = await ready().then(() => true).catch(() => false);
    const ms = Date.now() - t0;
    const caption = await page.locator('[data-testid="band-caption"]').first().innerText().catch(() => "");
    if (shown) { pageTimes.push({ label, n, ms }); ok(ms < 1000, `page ${label} point ${n}: list of 10 and tiles in ${ms} ms (${caption})`); }
    else { const none = await page.locator('[data-testid="no-optimised-portfolio"]').count(); ok(none > 0, `page ${label} point ${n}: no list, but the page says so (${caption})`); }
  }
}
ok(errors.length === 0, `no script errors${errors.length ? ": " + errors.join(" | ") : ""}`);
await browser.close();

const f2 = (x) => (x == null ? "–" : Number(x).toFixed(2));
console.log("\n| Point | Horizon | Avg risk | Avg return % | Expected loss % | API ms | Page ms | Optimal |\n|---:|---|---:|---:|---:|---:|---:|---|");
for (const r of rows) {
  const pm = pageTimes.find((p) => p.label === r.label && p.n === r.n)?.ms;
  console.log(`| ${r.n} | ${r.label} | ${r.none ? "no list" : r.err ? "error" : r.risk} | ${f2(r.ytm)} | ${r.el == null ? "–" : Number(r.el).toFixed(3)} | ${r.ms} | ${pm ?? "–"} | ${r.optimal ? "yes" : r.none ? "–" : "no"} |`);
}
process.exit(fails ? 1 : 0);
