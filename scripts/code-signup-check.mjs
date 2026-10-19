// Browser check: code at sign-up, "Have a code?" on pricing, no Redeem nav link, one merged footer in the page's language.
import { chromium } from "playwright-core";
const BASE = process.env.BASE ?? "http://127.0.0.1:3311";
const browser = await chromium.launch({ executablePath: process.env.CHROME ?? "/opt/pw-browsers/chromium-1194/chrome-linux/chrome" });
let fail = 0;
const ok = (c, m) => { console.log(`${c ? "PASS" : "FAIL"} ${m}`); if (!c) fail++; };
const deny = (p) => p.getByRole("button", { name: "Deny" }).click({ timeout: 3000 }).catch(() => {});
let n = 0;
for (const [w, h] of [[1440, 900], [390, 844]]) {
  const ctx = await browser.newContext({ viewport: { width: w, height: h } });
  const page = await ctx.newPage();
  await page.goto(BASE + "/signup"); await deny(page);
  ok(!(await page.getByRole("link", { name: "Redeem code" }).count()), `${w}: no Redeem code link in the menu`);
  // a wrong code is refused before any account is made
  const u = `codecheck${Date.now()}${n++}`;
  await page.locator('input[type=email]').fill(`${u}@example.com`);
  await page.locator('input[autocomplete=username]').fill(u);
  await page.locator('input[type=password]').fill("password123");
  await page.getByTestId("signup-code-toggle").click();
  await page.getByTestId("signup-code").fill("10B-ZZZZ-ZZZZ");
  await page.locator('input[type=checkbox]').check();
  await page.getByRole("button", { name: "Create free account" }).click();
  await page.getByText("This code does not exist").waitFor({ timeout: 30000 }).catch(() => {});
  ok(await page.getByText("This code does not exist").isVisible(), `${w}: unknown code refused`);
  await page.getByTestId("signup-code").fill(w === 1440 ? "10B-TEST-AAAA" : "10b-test-bbbb");
  await page.getByRole("button", { name: "Create free account" }).click();
  await page.waitForURL(/welcome=code/, { timeout: 30000 }).catch(() => {});
  ok(page.url().includes("welcome=code"), `${w}: signed up with the code`);
  const modal = page.getByTestId("welcome-modal");
  await modal.waitFor({ timeout: 8000 }).catch(() => {});
  ok((await modal.textContent().catch(() => ""))?.includes("Your code is active"), `${w}: welcome says the code is active`);
  const me = await page.evaluate(() => fetch("/api/auth/me").then((r) => r.json()));
  const days = me?.user?.premiumUntil || me?.premiumUntil ? (new Date(me.user?.premiumUntil ?? me.premiumUntil) - Date.now()) / 864e5 : 0;
  ok(days > 30, `${w}: Premium runs past 30 days (${days.toFixed(1)}: trial + code)`);
  await page.goto(BASE + "/pricing");
  ok(await page.getByTestId("redeem-toggle").isVisible(), `${w}: "Have a code?" on pricing when signed in`);
  await page.getByTestId("redeem-toggle").click();
  await page.getByTestId("redeem-code").fill("10B-TEST-AAAA");
  await page.getByRole("button", { name: "Use code" }).click();
  await page.getByTestId("redeem-msg").waitFor({ timeout: 8000 }).catch(() => {});
  ok((await page.getByTestId("redeem-msg").textContent().catch(() => ""))?.includes("already been used"), `${w}: used code refused on pricing`);
  ok(await page.getByTestId("footer-note").textContent().then((t) => t.includes("Stripe") && t.includes("not investment advice")), `${w}: one footer with plan terms and disclaimer`);
  ok(!(await page.locator("main").textContent()).includes("Prices include VAT"), `${w}: no separate note above the footer`);
  { const sw = await page.evaluate(() => [document.documentElement.scrollWidth, window.innerWidth, [...document.querySelectorAll("body *")].filter((e) => e.getBoundingClientRect().right > window.innerWidth + 1).slice(0,3).map((e) => e.tagName + "." + String(e.className).slice(0,40))]); ok(sw[0] <= sw[1], `${w}: no sideways scroll ${JSON.stringify(sw)}`); }
  await page.goto(BASE + "/it");
  ok((await page.getByTestId("footer-note").textContent()).includes("Stripe") && (await page.getByTestId("footer-note").textContent()).includes("IVA"), `${w}: Italian footer on /it`);
  if (w === 390) await page.goto(BASE + "/pricing").then(() => page.screenshot({ path: "/tmp/claude-0/pricing-bottom.png", fullPage: true }));
  await ctx.close();
}
await browser.close();
process.exit(fail ? 1 : 0);
