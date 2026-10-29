// Phone and tablet check of the home page with the cookie bar still showing: the main button must be on screen and the first thing under
// a tap (nothing from the ETF card or the bar sits on top of it). Usage: BASE=https://10bonds.com CHROME_PATH=... node scripts/landing-tap-check.mjs
import { chromium } from "playwright-core";

const BASE = process.env.BASE ?? "http://127.0.0.1:3311";
const browser = await chromium.launch({ executablePath: process.env.CHROME_PATH, channel: process.env.CHROME_CHANNEL });
let bad = 0;
for (const [w, h] of [[390, 664], [390, 844], [414, 896], [768, 1024]]) {
  const c = await browser.newContext({ viewport: { width: w, height: h }, hasTouch: w < 500, isMobile: w < 500 });
  const p = await c.newPage();
  await p.goto(BASE + "/", { waitUntil: "load", timeout: 60_000 });
  await p.waitForSelector('[data-testid="intro-skip"]');
  await p.waitForTimeout(1500);
  const r = await p.evaluate(() => {
    const el = document.querySelector('[data-testid="intro-skip"]');
    const b = el.getBoundingClientRect();
    const top = document.elementFromPoint(b.x + b.width / 2, b.y + b.height / 2);
    const bar = document.querySelector('[data-testid="cookie-banner"]');
    return { onScreen: b.bottom <= innerHeight && b.top >= 0, first: !!top && el.contains(top), barPct: bar ? Math.round((bar.getBoundingClientRect().height / innerHeight) * 100) : 0, sideways: document.documentElement.scrollWidth > innerWidth };
  });
  const ok = r.onScreen && r.first && !r.sideways && (w >= 640 || r.barPct <= 15);
  console.log(ok ? "PASS" : "FAIL", `${w}x${h}`, JSON.stringify(r));
  if (!ok) bad++;
  await c.close();
}
await browser.close();
process.exit(bad ? 1 : 0);
