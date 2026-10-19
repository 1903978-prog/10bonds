// Profile, plans, legal footer check: stripe-mock.mjs on :3312, standalone server on :3311 (see e2e-billing.mjs).
import { createHmac } from "node:crypto";
import { chromium } from "playwright-core";
const BASE = "http://127.0.0.1:3311", MOCK = "http://127.0.0.1:3312";
const SHOTS = "/tmp/claude-0/-home-claude/4b337658-00ee-5dac-b7d9-34aa865191b3/scratchpad";
const KEY = { Authorization: "Bearer sk_test_local" };
let fails = 0;
const ok = (c, m) => { console.log((c ? "PASS " : "FAIL ") + m); if (!c) fails++; };
const mock = async () => (await fetch(MOCK + "/__state", { headers: KEY })).json();
const hook = async (event, secret) => {
  const body = JSON.stringify(event), t = Math.floor(Date.now() / 1000);
  return fetch(BASE + "/api/stripe/webhook", { method: "POST", body, headers: { "stripe-signature": `t=${t},v1=${createHmac("sha256", secret).update(`${t}.${body}`).digest("hex")}`, "Content-Type": "application/json" } });
};
await fetch(BASE + "/api/health/billing");
let st = await mock();
const amounts = Object.fromEntries(st.prices.map((p) => [p.lookup_key, [p.unit_amount, p.interval]]));
ok(JSON.stringify(amounts) === JSON.stringify({
  tenbonds_plus_monthly_eur: [900, "month"], tenbonds_plus_yearly_eur: [8640, "year"], tenbonds_premium_monthly_eur: [1900, "month"],
  tenbonds_premium_yearly_eur: [18240, "year"], tenbonds_pro_monthly_eur: [8900, "month"], tenbonds_pro_yearly_eur: [85440, "year"],
}), `six Stripe prices ${JSON.stringify(amounts)}`);
ok(st.products.length === 3, `three products (${st.products.length})`);
const secret = st.webhooks.at(-1).secret;
const browser = await chromium.launch({ executablePath: "/opt/pw-browsers/chromium-1194/chrome-linux/chrome" });
for (const w of [1440, 390]) {
  const ctx = await browser.newContext({ viewport: { width: w, height: w === 390 ? 844 : 900 }, acceptDownloads: true });
  const p = await ctx.newPage();
  const errs = []; p.on("pageerror", (e) => errs.push(e.message));
  await p.addInitScript(() => localStorage.setItem("tb_cookie_consent", JSON.stringify({ necessary: true, preferences: false, statistics: false, marketing: false })));
  const noScroll = async (where) => ok(await p.evaluate(() => document.documentElement.scrollWidth <= window.innerWidth + 1), `${w} ${where}: no sideways scroll`);
  // Footer and legal pages
  await p.goto(BASE + "/");
  ok(!(await p.locator("header >> text=Disclaimer").count()), `${w} no Disclaimer in the top menu`);
  for (const t of ["Disclaimer", "Terms", "Privacy & GDPR", "Cookies", "Cookie settings"]) ok(await p.locator(`[data-testid=footer-legal] >> text="${t}"`).count() === 1, `${w} footer menu has ${t}`);
  await p.goto(BASE + "/it");
  ok(await p.locator('[data-testid=footer-legal] >> text="Privacy e GDPR"').count() === 1, `${w} footer menu in Italian`);
  ok(await p.isVisible("text=182,40 € all'anno"), `${w} Italian home shows yearly Premium`);
  await p.goto(BASE + "/privacy");
  ok(await p.isVisible("[data-testid=legal-draft]") && await p.isVisible("[data-testid=processors]"), `${w} privacy page with draft notice and processors`);
  await noScroll("privacy");
  await p.goto(BASE + "/cookies");
  ok(await p.locator("[data-testid=cookie-table] tbody tr").count() === 5, `${w} cookie table lists 5 items`);
  // Pricing
  await p.goto(BASE + "/pricing");
  ok((await p.textContent("[data-testid=price-premium]")).includes("€19") && (await p.textContent("[data-testid=price-pro]")).includes("€89"), `${w} monthly prices 19 and 89`);
  await p.click("[data-testid=billing-year]");
  await p.waitForURL(/billing=year/);
  ok((await p.textContent("[data-testid=price-plus]")).includes("€86.40") && (await p.textContent("[data-testid=price-pro]")).includes("€854.40"), `${w} yearly prices`);
  ok(await p.isVisible("text=For professionals"), `${w} Pro card marked for professionals`);
  await p.screenshot({ path: `${SHOTS}/pricing4-${w}.png`, fullPage: true });
  await noScroll("pricing");
  // Sign up, buy Plus yearly
  const tag = `${w}${Date.now() % 100000}`;
  await p.goto(BASE + "/signup");
  await p.fill("input[type=email]", `prof${tag}@e2e.local`);
  await p.fill("input[autocomplete=username]", `prof${tag}`);
  await p.fill("input[type=password]", "password123");
  await p.check("input[type=checkbox][required]");
  await p.click("button[type=submit]");
  await p.waitForSelector('[data-testid="welcome-modal"]', { timeout: 30000 });
  await p.goto(BASE + "/pricing?billing=year");
  ok(await p.isVisible("[data-testid=pro-request]"), `${w} Pro asks for professional access first`);
  const proBuy = await p.evaluate(async () => (await fetch("/api/billing/checkout", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ plan: "pro", interval: "year", startNow: true }) })).status);
  ok(proBuy === 403, `${w} Pro checkout refused without approval (${proBuy})`);
  await p.check('[data-testid="start-now-plus"]');
  await Promise.all([p.waitForURL(/3312\/pay\//), p.click('[data-testid="buy-plus"]')]);
  st = await mock();
  const sess = st.sessions.at(-1);
  ok(sess.price === st.prices.find((x) => x.lookup_key === "tenbonds_plus_yearly_eur").id, `${w} checkout uses the yearly Plus price`);
  const subId = `sub_p${tag}`;
  const sub = { id: subId, object: "subscription", customer: sess.customer, status: "active", metadata: { user_id: sess.user_id }, cancel_at_period_end: false, current_period_end: Math.floor(Date.now() / 1000) + 365 * 86400, items: { data: [{ id: "si_1", price: { id: sess.price, lookup_key: "tenbonds_plus_yearly_eur" } }] } };
  await fetch(MOCK + "/__sub", { method: "POST", headers: KEY, body: new URLSearchParams({ json: JSON.stringify(sub) }) });
  ok((await hook({ type: "checkout.session.completed", data: { object: { subscription: subId } } }, secret)).status === 200, `${w} webhook accepted`);
  // Profile
  await p.goto(BASE + "/");
  await p.click("[data-testid=nav-profile]");
  await p.waitForURL(/\/account/);
  ok((await p.textContent("[data-testid=current-plan]")).includes("Plus") && (await p.textContent("[data-testid=current-plan]")).includes("yearly"), `${w} profile shows Plus yearly`);
  ok(!(await p.locator("[data-testid=profile-plan-pro]").count()), `${w} Pro not offered without approval`);
  await p.screenshot({ path: `${SHOTS}/profile-${w}.png`, fullPage: true });
  await noScroll("profile");
  await p.click("[data-testid=profile-plan-premium]");
  await p.click("[data-testid=profile-change]");
  await p.waitForSelector("[data-testid=profile-msg]");
  await p.waitForLoadState("load"); await p.waitForTimeout(1500);
  ok((await p.textContent("[data-testid=current-plan]")).includes("Premium"), `${w} upgraded to Premium yearly`);
  p.once("dialog", (d) => d.accept());
  await p.click("[data-testid=profile-cancel]");
  await p.waitForSelector("[data-testid=profile-resume]", { timeout: 15000 });
  ok(await p.isVisible("text=You will not be charged again"), `${w} cancel shows end date`);
  await p.click("[data-testid=profile-resume]");
  await p.waitForSelector("[data-testid=profile-cancel]", { timeout: 15000 });
  ok(true, `${w} cancellation taken back`);
  const [dl] = await Promise.all([p.waitForEvent("download"), p.click("[data-testid=profile-export]")]);
  const json = JSON.parse(await (await import("node:fs")).promises.readFile(await dl.path(), "utf8"));
  ok(json.account?.email === `prof${tag}@e2e.local` && Array.isArray(json.searchCounts), `${w} data download has the account`);
  await p.click("[data-testid=profile-erase]");
  await p.click("[data-testid=profile-erase-confirm]");
  await p.waitForSelector("text=Your activity data has been deleted.");
  ok(true, `${w} activity data erased`);
  await p.click("[data-testid=profile-delete]");
  ok(await p.isDisabled("[data-testid=delete-confirm]"), `${w} delete waits for DELETE`);
  await p.screenshot({ path: `${SHOTS}/profile-delete-${w}.png`, fullPage: true });
  await p.fill("[data-testid=delete-input]", "DELETE");
  await Promise.all([p.waitForURL(/confirmed=deleted/), p.click("[data-testid=delete-confirm]")]);
  ok(await p.isVisible("text=Your account and all its data have been deleted."), `${w} deletion confirmed`);
  ok((await mock()).subs[subId].status === "canceled", `${w} Stripe subscription cancelled`);
  ok((await p.evaluate(async () => (await fetch("/api/auth/me")).json())) === null, `${w} signed out`);
  const relogin = await p.evaluate(async (e) => (await fetch("/api/auth/login", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ login: e, email: e, password: "password123" }) })).status, `prof${tag}@e2e.local`);
  ok(relogin >= 400, `${w} deleted account cannot sign in (${relogin})`);
  ok(errs.length === 0, `${w} no page errors ${errs.join(" | ")}`);
  await ctx.close();
}
await browser.close();
console.log(fails ? `${fails} FAILED` : "ALL PASSED");
process.exit(fails ? 1 : 0);
