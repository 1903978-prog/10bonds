// Phone check of the landing (390x844): every carousel slide stays inside its box, nothing overlaps the main button, and the button can be tapped.
// Usage: BASE=http://127.0.0.1:3311 node scripts/landing-mobile-check.mjs   (BASE defaults to https://10bonds.com)
import { chromium } from "playwright-core";
const BASE = process.env.BASE ?? "https://10bonds.com";
const browser = await chromium.launch({ executablePath: process.env.CHROME_PATH ?? "/opt/pw-browsers/chromium" , args: ["--no-sandbox"] });
let fails = 0;
const ok = (c, m) => { console.log((c ? "PASS " : "FAIL ") + m); if (!c) fails++; };
const ctx = await browser.newContext({ viewport: { width: 390, height: Number(process.env.H ?? 844) }, deviceScaleFactor: 2, hasTouch: true, isMobile: true });
const p = await ctx.newPage();
const errs = []; p.on("pageerror", (e) => errs.push(e.message));
await p.addInitScript(() => { try { localStorage.setItem("tb_cookie_consent", JSON.stringify({ necessary: true, statistics: false, marketing: false })); } catch {} });
await p.goto(BASE + "/", { waitUntil: "domcontentloaded", timeout: 90000 });
await p.waitForSelector('[data-testid="landing-carousel"]');
const keys = await p.$$eval('[data-testid="landing-carousel"] [data-testid^="slide-"]', (els) => els.map((e) => e.getAttribute("data-testid").slice(6)));
ok(keys.length >= 3, `carousel has ${keys.length} slides`);
for (const k of keys) {
  await p.click(`[data-testid="dot-${k}"]`);
  await p.waitForTimeout(700);
  const r = await p.evaluate((k) => {
    const car = document.querySelector('[data-testid="landing-carousel"]').getBoundingClientRect();
    const cta = document.querySelector('[data-testid="intro-skip"]');
    cta.scrollIntoView({ block: "center" });
    const c = cta.getBoundingClientRect();
    const slide = document.querySelector(`[data-testid="slide-${k}"]`);
    const card = slide.firstElementChild.getBoundingClientRect();
    // Furthest bottom of any visible text/box inside the slide card.
    let bottom = 0;
    for (const el of slide.querySelectorAll("*")) { const b = el.getBoundingClientRect(); if (b.width && b.height) bottom = Math.max(bottom, b.bottom); }
    const hit = document.elementFromPoint(c.left + c.width / 2, c.top + c.height / 2);
    return { carBottom: car.bottom, ctaTop: c.top, cardBottom: card.bottom, contentBottom: bottom, ctaOk: cta.contains(hit) || hit === cta, width: document.documentElement.scrollWidth <= innerWidth + 1 };
  }, k);
  ok(r.contentBottom <= r.cardBottom + 1, `${k}: content stays inside its card (${r.contentBottom.toFixed(0)} <= ${r.cardBottom.toFixed(0)})`);
  ok(r.cardBottom <= r.ctaTop + 1, `${k}: card ends above the button (${r.cardBottom.toFixed(0)} <= ${r.ctaTop.toFixed(0)})`);
  ok(r.ctaOk, `${k}: button is what a tap at its centre hits`);
  ok(r.width, `${k}: no sideways scroll`);
}
ok(errs.length === 0, `no page errors ${errs.join("|")}`);
await p.click('[data-testid="intro-skip"]', { timeout: 5000 });
ok(true, "button tap works");
await browser.close();
process.exit(fails ? 1 : 0);
