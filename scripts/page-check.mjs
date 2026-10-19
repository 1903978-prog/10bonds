// Page check in a real browser, on desktop and phone widths, against a running site (sample data is enough).
// For each public page: it opens, has a title, one main heading, no script errors, no sideways scrolling, and no
// serious accessibility problems (axe-core: missing labels, missing image text, bad structure, low contrast).
// Usage: BASE=http://127.0.0.1:3311 node scripts/page-check.mjs   (CHROME_PATH or CHROME_CHANNEL picks the browser)
// SHOTS=<folder> also saves a screenshot of every page.
import { createRequire } from "node:module";
import { chromium } from "playwright-core";

const BASE = process.env.BASE ?? "http://127.0.0.1:3311";
const SHOTS = process.env.SHOTS;
const axePath = createRequire(import.meta.url).resolve("axe-core/axe.min.js");

const PAGES = [
  ["/", 200], ["/it", 200], ["/fr", 200], ["/de", 200],
  ["/pricing", 200], ["/privacy", 200], ["/terms", 200], ["/cookies", 200], ["/disclaimer", 200],
  ["/login", 200], ["/signup", 200], ["/forgot-password", 200], ["/knowledge", 200],
  ["/it/broker-obbligazioni", 200], ["/fr/courtiers-obligations", 200], ["/de/anleihen-broker", 200],
  ["/no-such-page", 404],
];
const WIDTHS = [[1440, 900], [390, 844], [360, 780]];

const browser = await chromium.launch(
  process.env.CHROME_PATH ? { executablePath: process.env.CHROME_PATH } : { channel: process.env.CHROME_CHANNEL ?? "chrome" },
);
let fails = 0;
const ok = (cond, msg) => {
  console.log(`${cond ? "PASS" : "FAIL"} ${msg}`);
  if (!cond) fails++;
};

for (const [w, h] of WIDTHS) {
  const ctx = await browser.newContext({ viewport: { width: w, height: h } });
  // Decide cookies once, so the banner does not cover the page under test (the banner has its own check below).
  await ctx.addInitScript(() => localStorage.setItem("tb_cookie_consent", JSON.stringify({ necessary: true, statistics: false, marketing: false, at: Date.now() })));
  for (const [path, want] of PAGES) {
    const p = await ctx.newPage();
    const errors = [];
    p.on("pageerror", (e) => errors.push(e.message));
    const res = await p.goto(BASE + path, { waitUntil: "networkidle" });
    const label = `${w}px ${path}`;
    ok(res?.status() === want, `${label}: HTTP ${res?.status()} (want ${want})`);
    ok((await p.title()).trim().length > 0, `${label}: has a title`);
    ok((await p.locator("h1").count()) >= 1, `${label}: has a main heading`);
    ok(errors.length === 0, `${label}: no script errors ${errors.join(" | ")}`);
    ok(await p.evaluate(() => document.documentElement.scrollWidth <= window.innerWidth + 1), `${label}: no sideways scrolling`);
    await p.waitForTimeout(600); // let fades and loading states settle before judging colours
    await p.addScriptTag({ path: axePath });
    const v = await p.evaluate(async () =>
      (await window.axe.run(document, { runOnly: ["wcag2a", "wcag2aa"], resultTypes: ["violations"] })).violations
        .filter((x) => x.impact === "serious" || x.impact === "critical")
        .map((x) => `${x.id} (${x.nodes.length}): ${x.nodes.slice(0, 2).map((n) => n.target.join(" ")).join(", ")}`),
    );
    ok(v.length === 0, `${label}: no serious accessibility problems ${v.join(" | ")}`);
    if (SHOTS) await p.screenshot({ path: `${SHOTS}/${w}${path.replace(/\W+/g, "_")}.png`, fullPage: true });
    await p.close();
  }
  await ctx.close();
}

// Home page behaviour: results appear, the sliders work by keyboard, the cookie banner shows on a first visit.
for (const [w, h] of WIDTHS) {
  const ctx = await browser.newContext({ viewport: { width: w, height: h } });
  const p = await ctx.newPage();
  await p.goto(BASE + "/", { waitUntil: "networkidle" });
  ok(await p.locator('[data-testid="cookie-banner"]').isVisible(), `${w}px home: cookie banner on first visit`);
  await p.locator('[data-testid="cookie-necessary"]').waitFor();
  await p.getByRole("button", { name: /deny|reject|only necessary/i }).first().click().catch(() => {});
  const sliders = p.locator('input[type="range"]');
  ok((await sliders.count()) >= 2, `${w}px home: sliders present`);
  // The date line, or the sample-data note that takes its place once sample data has loaded (CI runs on sample data).
  ok(await p.locator('[data-testid="yields-date"], [data-testid="yields-sample"]').first().isVisible(), `${w}px home: yields date shown`);
  const before = await p.locator("main").innerText();
  await sliders.first().focus();
  await p.keyboard.press("ArrowRight");
  await p.keyboard.press("ArrowRight");
  await p.waitForTimeout(800);
  ok((await p.locator("main").innerText()) !== before, `${w}px home: moving a slider by keyboard updates the page`);
  await ctx.close();
}

await browser.close();
console.log(fails ? `${fails} check(s) failed.` : "All page checks passed.");
process.exit(fails ? 1 : 0);
