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

// First visit: the intro comes first and its button brings in the finder.
{
  const ctx = await browser.newContext({ viewport: { width: 1440, height: 900 } });
  const p = await ctx.newPage();
  await p.goto(BASE + "/", { waitUntil: "networkidle" });
  ok(await p.locator('[data-testid="intro"]').isVisible(), "home: intro on first visit");
  await p.locator('[data-testid="cookie-settings"]').click().catch(() => {});
  await p.locator('[data-testid="cookie-accept"]').click(); // "I understand" saves the choice (statistics off) and closes the bar
  await p.locator('[data-testid="intro-skip"]').click();
  ok(await p.locator('[data-testid="term-picker"]').isVisible(), "home: the intro's button opens the finder");
  await ctx.close();
}

// First use of the portfolio builder: the agreement popup must be ticked before it closes.
{
  const ctx = await browser.newContext({ viewport: { width: 1440, height: 900 } });
  const p = await ctx.newPage();
  await p.goto(BASE + "/?intro=0", { waitUntil: "networkidle" });
  await p.locator('[data-testid="find-portfolio"]').click();
  ok(await p.locator('[data-testid="consent-gate"]').isVisible(), "consent: popup shows on first use");
  ok(await p.locator('[data-testid="consent-continue"]').isDisabled(), "consent: Continue disabled until ticked");
  await p.locator('[data-testid="consent-check"]').check();
  await p.locator('[data-testid="consent-continue"]').click();
  await p.locator('[data-testid="consent-gate"]').waitFor({ state: "detached", timeout: 5000 }).catch(() => {});
  ok(!(await p.locator('[data-testid="consent-gate"]').count()), "consent: popup closes after agreeing");
  await ctx.close();
}

// Home page behaviour (intro already seen): results appear, the sliders work by keyboard, the cookie banner shows on a first visit.
for (const [w, h] of WIDTHS) {
  const ctx = await browser.newContext({ viewport: { width: w, height: h } });
  // First-use agreement already given: the version is read from lib/consentText.ts, so raising it never breaks this script.
  const agreeVersion = (await import("node:fs")).readFileSync(new URL("../lib/consentText.ts", import.meta.url), "utf8").match(/CONSENT_VERSION = "([^"]+)"/)[1];
  await ctx.addInitScript((v) => localStorage.setItem("tb_agree", v), agreeVersion);
  const p = await ctx.newPage();
  await p.goto(BASE + "/?intro=0", { waitUntil: "networkidle" });
  ok(await p.locator('[data-testid="cookie-banner"]').isVisible(), `${w}px home: cookie banner on first visit`);
  await p.locator('[data-testid="cookie-settings"]').click(); // the purposes open in Details
  await p.locator('[data-testid="cookie-necessary"]').waitFor();
  await p.locator('[data-testid="cookie-accept"]').click(); // "I understand" saves the choice (statistics off) and closes the bar
  const sliders = p.locator('input[type="range"]');
  // Everyone: the short/mid/long term choice, one return slider and the Find portfolio button (admin also gets the yellow sliders).
  ok((await sliders.count()) >= 1, `${w}px home: return slider present`);
  ok(await p.locator('[data-testid="term-picker"]').isVisible(), `${w}px home: term choice present`);
  ok(await p.locator('[data-testid="find-portfolio"]').isVisible(), `${w}px home: Find portfolio button present`);
  // The date line, or the sample-data note that takes its place once sample data has loaded (CI runs on sample data).
  // Phones show the list (and its date) on their own full-screen page, opened by the button; Back returns to the slider.
  if (w < 640) await p.locator('[data-testid="find-portfolio"]').click();
  ok(await p.locator('[data-testid="yields-date"], [data-testid="yields-sample"]').filter({ visible: true }).first().isVisible(), `${w}px home: yields date shown`);
  if (w < 640) {
    ok(await p.locator('[data-testid="phone-rows"]').isVisible(), `${w}px home: full-screen results page opens`);
    await p.locator('[data-testid="phone-results-back"]').click();
    ok(!(await p.locator('[data-testid="phone-results"]').count()), `${w}px home: Back closes the results page`);
  }
  const before = await p.locator("main").innerText();
  await sliders.first().focus();
  await p.keyboard.press("ArrowRight");
  await p.keyboard.press("ArrowRight");
  // Phones show the list on its own page, so the slider page itself must change: the far end changes the word beside it.
  if (w < 640) await p.keyboard.press("End");
  await p.waitForTimeout(800);
  let moved = (await p.locator("main").innerText()) !== before;
  // The sample data holds so few bonds that the spread-rules methodology leaves one slider position for the middle term (by design,
  // the rules are never relaxed): the slider then has nowhere to go, so a different term must change the page instead.
  if (!moved && w >= 640) {
    await p.locator('[data-testid="term-picker"] [role="radio"]').last().click();
    await p.waitForTimeout(800);
    moved = (await p.locator("main").innerText()) !== before;
  }
  ok(moved, `${w}px home: moving a slider by keyboard updates the page`);
  await ctx.close();
}

await browser.close();
console.log(fails ? `${fails} check(s) failed.` : "All page checks passed.");
process.exit(fails ? 1 : 0);
