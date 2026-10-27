import { chromium } from "playwright-core";
const BASE = "https://10bonds.com";
const browser = await chromium.launch({ channel: "chrome" });
const fs = await import("node:fs");
const agree = fs.readFileSync("lib/consentText.ts", "utf8").match(/CONSENT_VERSION = "([^"]+)"/)[1];
const ctx = await browser.newContext({ viewport: { width: 1440, height: 900 } });
await ctx.addInitScript((v) => { localStorage.setItem("tb_agree", v); localStorage.setItem("tb_cookie_consent", JSON.stringify({ necessary: true, statistics: false, marketing: false, at: Date.now() })); }, agree);
const p = await ctx.newPage();
const errors = [];
p.on("pageerror", (e) => errors.push(e.message));
const t0 = Date.now();
await p.goto(BASE + "/?intro=0", { waitUntil: "load", timeout: 60000 });
console.log("home loaded", Date.now() - t0, "ms");
const terms = p.locator('[data-testid="term-picker"] [role="radio"]');
const n = await terms.count();
console.log("terms", n, "sliders", await p.locator('input[type="range"]').count());
const rowsSel = "main table tbody tr, [data-testid=result-rows] > *";
for (let i = 0; i < n; i++) {
  await terms.nth(i).click();
  const s = Date.now();
  await p.locator('[data-testid="find-portfolio"]').click();
  let rows = 0;
  while (Date.now() - s < 15000) {
    rows = await p.locator(rowsSel).count();
    const txt = await p.locator("main").innerText();
    if (rows >= 10 && !/Something went wrong/.test(txt)) break;
    await p.waitForTimeout(100);
  }
  const ms = Date.now() - s;
  const boxes = (await p.locator('[data-testid="result-boxes"]').innerText().catch(() => "")).replace(/\s+/g, " ");
  const wrong = /Something went wrong/.test(await p.locator("main").innerText());
  console.log(`term ${i}: rows=${rows} after ${ms} ms, error=${wrong}; tiles: ${boxes.slice(0, 200)}`);
  await p.screenshot({ path: `shot-term${i}.png` });
}
console.log("script errors:", errors.length, errors.slice(0, 3));
await browser.close();
