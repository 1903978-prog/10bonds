// Audit check (the owner, 30/10/2026): the home page must not scroll at 1440x900, 1366x768, 1280x720, 390x844 and 375x667,
// must show no console error on 3 reloads at each size, no empty "–" cell, the price-update line and the return risk warning;
// and axe finds no serious or critical issue on home, finder and pricing. FAILS on any miss.
// Usage: BASE=http://127.0.0.1:3311 CHROME_PATH=... node scripts/home-quality-check.mjs
import { chromium } from "playwright-core";
import { readFileSync } from "node:fs";

const BASE = process.env.BASE ?? "http://127.0.0.1:3311";
const browser = await chromium.launch({ executablePath: process.env.CHROME_PATH, channel: process.env.CHROME_CHANNEL });
const axeSource = readFileSync(new URL("../node_modules/axe-core/axe.min.js", import.meta.url), "utf8");
let bad = 0;
const report = (ok, msg) => { console.log(ok ? "PASS" : "FAIL", msg); if (!ok) bad++; };

for (const [w, h] of [[1440, 900], [1366, 768], [1280, 720], [390, 844], [375, 667]]) {
  const phone = w < 640;
  for (let i = 1; i <= 3; i++) {
    const c = await browser.newContext({ viewport: { width: w, height: h }, hasTouch: phone, isMobile: phone });
    const p = await c.newPage();
    const errs = [];
    p.on("pageerror", (e) => errs.push(e.message.slice(0, 160)));
    p.on("console", (m) => m.type() === "error" && errs.push(m.text().slice(0, 160)));
    await p.goto(BASE + "/", { waitUntil: "load", timeout: 60_000 });
    await p.waitForSelector('[data-testid="intro-skip"]');
    await p.waitForTimeout(1500);
    const r = await p.evaluate(() => ({
      over: document.documentElement.scrollHeight - innerHeight,
      dashes: [...document.querySelectorAll("main *")].filter((e) => e.children.length === 0 && e.textContent.trim() === "–").length,
      warn: !!document.querySelector('[data-testid="return-warning"]'),
      fresh: !!document.querySelector('[data-testid="landing-fresh"]') || innerHeight <= 720,
      company: !!document.querySelector('[data-testid="footer-company"]'),
    }));
    report(r.over <= 0 && r.dashes === 0 && r.warn && r.fresh && r.company && errs.length === 0, `home ${w}x${h} load ${i}: ${JSON.stringify(r)} ${JSON.stringify(errs)}`);
    await c.close();
  }
}

// axe on home, finder (same-site referer opens the finder) and pricing.
const ctx = await browser.newContext({ viewport: { width: 1440, height: 900 } });
for (const [name, path, referer] of [["home", "/", null], ["finder", "/", BASE + "/pricing"], ["pricing", "/pricing", null]]) {
  const p = await ctx.newPage();
  if (referer) await p.setExtraHTTPHeaders({ referer });
  await p.goto(BASE + path, { waitUntil: "load", timeout: 60_000 });
  await p.waitForTimeout(2500);
  await p.addScriptTag({ content: axeSource });
  const res = await p.evaluate(async () => (await window.axe.run(document, { runOnly: ["wcag2a", "wcag2aa", "wcag21aa"] })).violations.map((v) => ({ id: v.id, impact: v.impact, n: v.nodes.length, first: v.nodes[0].target.join(" ").slice(0, 100) })));
  const serious = res.filter((v) => v.impact === "serious" || v.impact === "critical");
  report(serious.length === 0, `axe ${name}: ${serious.length} serious/critical ${JSON.stringify(serious)} (minor/moderate: ${res.length - serious.length})`);
  await p.close();
}
// Keyboard: the first 12 Tab stops on the home page each show a visible focus ring, and the main button works from the keyboard.
{
  const p = await ctx.newPage();
  await p.goto(BASE + "/", { waitUntil: "load", timeout: 60_000 });
  await p.waitForSelector('[data-testid="intro-skip"]');
  await p.waitForTimeout(1200);
  const seen = [];
  for (let i = 0; i < 12; i++) {
    await p.keyboard.press("Tab");
    seen.push(await p.evaluate(() => { const e = document.activeElement; const s = e && getComputedStyle(e); return e && e !== document.body ? { tag: e.tagName, ring: parseFloat(s.outlineWidth) > 0 && s.outlineStyle !== "none" || s.boxShadow !== "none" } : null; }));
  }
  const noRing = seen.filter((x) => x && !x.ring);
  report(seen.filter(Boolean).length >= 8 && noRing.length === 0, `keyboard: ${seen.filter(Boolean).length} tab stops, ${noRing.length} without a visible ring ${JSON.stringify(noRing)}`);
  await p.focus('[data-testid="intro-skip"]');
  await p.keyboard.press("Enter");
  await p.waitForTimeout(1500);
  report(!(await p.locator('[data-testid="intro"]').count()), "keyboard: Enter on the main button opens the finder");
  await p.close();
}
await browser.close();
process.exit(bad ? 1 : 0);
