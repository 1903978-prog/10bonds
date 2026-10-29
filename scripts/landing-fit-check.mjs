// Phone check (the owner, 29/10/2026): the home page must fit one screen with no vertical scroll, in all 4 languages, at the
// sizes below, with the cookie bar showing and after it is dismissed. FAILS if the page scrolls, so the layout can never drift.
// Usage: BASE=https://10bonds.com CHROME_PATH=... node scripts/landing-fit-check.mjs
import { chromium } from "playwright-core";

const BASE = process.env.BASE ?? "http://127.0.0.1:3311";
const browser = await chromium.launch({ executablePath: process.env.CHROME_PATH, channel: process.env.CHROME_CHANNEL });
let bad = 0;
for (const lang of ["en", "it", "fr", "de"]) {
  for (const [w, h] of [[390, 844], [375, 667], [414, 896]]) {
    const c = await browser.newContext({ viewport: { width: w, height: h }, hasTouch: true, isMobile: true });
    await c.addCookies([{ name: "tb_lang", value: lang, url: BASE }]);
    const p = await c.newPage();
    await p.goto(BASE + "/", { waitUntil: "load", timeout: 60_000 });
    await p.waitForSelector('[data-testid="intro-skip"]');
    await p.waitForTimeout(1500);
    const read = () => p.evaluate(() => ({ over: document.documentElement.scrollHeight - innerHeight, sideways: document.documentElement.scrollWidth > innerWidth, button: document.querySelector('[data-testid="intro-skip"]').getBoundingClientRect().bottom <= innerHeight }));
    const before = await read();
    const ok = before.over <= 0 && !before.sideways && before.button;
    console.log(ok ? "PASS" : "FAIL", `${lang} ${w}x${h}`, JSON.stringify(before));
    if (!ok) bad++;
    await c.close();
  }
}
await browser.close();
process.exit(bad ? 1 : 0);
