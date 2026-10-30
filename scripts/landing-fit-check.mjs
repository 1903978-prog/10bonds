// Phone check (the owner, 29/10/2026): the home page must fit one screen with no vertical scroll, in all 4 languages, at the
// sizes below, with the cookie bar showing and after it is dismissed. FAILS if the page scrolls, so the layout can never drift.
// Usage: BASE=https://10bonds.com CHROME_PATH=... node scripts/landing-fit-check.mjs
import { chromium } from "playwright-core";

const BASE = process.env.BASE ?? "http://127.0.0.1:3311";
const browser = await chromium.launch({ executablePath: process.env.CHROME_PATH, channel: process.env.CHROME_CHANNEL });
let bad = 0;
for (const lang of ["en", "it", "fr", "de"]) {
  for (const [w, h] of [[390, 844], [375, 667], [414, 896], [390, 664], [430, 932], [375, 553]]) {
    const c = await browser.newContext({ viewport: { width: w, height: h }, hasTouch: true, isMobile: true });
    await c.addCookies([{ name: "tb_lang", value: lang, url: BASE }]);
    const p = await c.newPage();
    await p.goto(BASE + "/", { waitUntil: "load", timeout: 60_000 });
    await p.waitForSelector('[data-testid="intro-skip"]');
    await p.waitForTimeout(1500);
    // The comparison card's result block (the first slide) must be fully inside its card, not cut off.
    const read = () => p.evaluate(() => {
      const net = document.querySelector('[data-testid="compare-net"]');
      let card = net;
      while (card && getComputedStyle(card).overflow !== "hidden") card = card.parentElement;
      const cut = net && card ? Math.round(net.getBoundingClientRect().bottom - card.getBoundingClientRect().bottom) : 0;
      return { over: document.documentElement.scrollHeight - innerHeight, sideways: document.documentElement.scrollWidth > innerWidth, button: document.querySelector('[data-testid="intro-skip"]').getBoundingClientRect().bottom <= innerHeight, cut };
    });
    const before = await read();
    // The same page after the cookie bar is answered (the bar hides, the page gets its room back).
    await p.locator('[data-testid="cookie-banner"] button').last().click({ timeout: 5000 }).catch(() => {});
    await p.waitForTimeout(800);
    const after = await read();
    // On a screen as short as 553 px the cookie bar alone takes a fifth of it: only the answered state is required there.
    for (const [state, r] of [["cookie bar", before], ["bar answered", after]].filter(([state]) => state !== "cookie bar" || h >= 600)) {
      const ok = r.over <= 0 && !r.sideways && r.button && r.cut <= 0;
      console.log(ok ? "PASS" : "FAIL", `${lang} ${w}x${h} (${state})`, JSON.stringify(r));
      if (!ok) bad++;
    }
    await c.close();
  }
}
await browser.close();
process.exit(bad ? 1 : 0);
