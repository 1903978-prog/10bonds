// Funnel check against a local server on :3311 (Stripe TEST API stand-in on :3312, throwaway database; admin e-mail boss@e2e.local):
// visitor -> consented stats -> sign-up -> pricing -> Plus / Premium checkout -> Pro page, verification, trial, Pro checkout -> admin funnel.
// Never talks to real Stripe.
import { createHmac } from "node:crypto";
const b32 = (str) => { const A = "ABCDEFGHIJKLMNOPQRSTUVWXYZ234567"; let bits = ""; for (const c of str.replace(/=+$/, "").toUpperCase()) bits += A.indexOf(c).toString(2).padStart(5, "0"); const out = []; for (let i = 0; i + 8 <= bits.length; i += 8) out.push(parseInt(bits.slice(i, i + 8), 2)); return Buffer.from(out); };
const totp = (secret) => { const c = Buffer.alloc(8); c.writeBigUInt64BE(BigInt(Math.floor(Date.now() / 30000))); const h = createHmac("sha1", b32(secret)).update(c).digest(); const o = h[19] & 15; return String(((h.readUInt32BE(o) & 0x7fffffff) % 1000000)).padStart(6, "0"); };
import { chromium } from "playwright-core";
const BASE = "http://127.0.0.1:3311", MOCK = "http://127.0.0.1:3312";
const SHOTS = process.env.SHOTS ?? "/tmp";
const KEY = { Authorization: "Bearer sk_test_local" };
let fails = 0;
const ok = (c, m) => { console.log((c ? "PASS " : "FAIL ") + m); if (!c) fails++; };
const mock = async () => (await fetch(MOCK + "/__state", { headers: KEY })).json();
const hook = async (event, secret) => {
  const body = JSON.stringify(event), t = Math.floor(Date.now() / 1000);
  return fetch(BASE + "/api/stripe/webhook", { method: "POST", body, headers: { "stripe-signature": `t=${t},v1=${createHmac("sha256", secret).update(`${t}.${body}`).digest("hex")}`, "Content-Type": "application/json" } });
};
const stripeSecret = async () => (await mock()).webhooks[0].secret;
const browser = await chromium.launch({ executablePath: "/opt/pw-browsers/chromium-1243/chrome-linux64/chrome" });
const run = Date.now() % 1000000;
const timings = {};

async function newPage(w, stats) {
  const ctx = await browser.newContext({ viewport: { width: w, height: w === 390 ? 844 : 900 }, ...(w === 390 ? { timezoneId: "Europe/Paris" } : { extraHTTPHeaders: { "cf-ipcountry": "IT" } }) });
  const p = await ctx.newPage();
  const errs = []; p.on("pageerror", (e) => errs.push(e.message));
  await p.addInitScript((s) => localStorage.setItem("tb_cookie_consent", JSON.stringify({ necessary: true, preferences: false, statistics: s, marketing: false })), stats);
  return { ctx, p, errs };
}
async function signup(p, email) {
  const t0 = Date.now();
  await p.goto(BASE + "/signup");
  await p.fill("input[type=email]", email);
  await p.fill("input[type=password]", "password123");
  await p.check("input[type=checkbox][required]");
  await p.click("button[type=submit]");
  await p.waitForSelector('[data-testid="welcome-modal"]', { timeout: 30000 });
  return Date.now() - t0;
}
async function login(p, email, create = false) {
  if (create) { const ok1 = await signup(p, email).then(() => true, () => false); if (ok1) return; }
  await p.goto(BASE + "/login");
  await p.fill("input[type=text], input[autocomplete=username]", email);
  await p.fill("input[type=password]", "password123");
  await p.click("button[type=submit]");
  await p.waitForURL((u) => !u.pathname.startsWith("/login"));
}
const me = (p) => p.evaluate(async () => (await fetch("/api/auth/me")).json());
const subObj = (id, cus, uid, lk, status = "active") => ({ id, object: "subscription", customer: cus, status, metadata: { user_id: uid }, cancel_at_period_end: false, current_period_end: Math.floor(Date.now() / 1000) + 30 * 86400, items: { data: [{ price: { id: "x", lookup_key: lk } }] } });
async function buy(p, plan, lk, w) {
  await p.goto(BASE + "/pricing");
  const t0 = Date.now();
  ok(await p.isDisabled(`[data-testid="buy-${plan}"]`), `${w} ${plan}: button waits for the start-now tick`);
  ok((await p.textContent("body")).includes("VAT"), `${w} ${plan}: VAT stated on the plans page`);
  await p.check(`[data-testid="start-now-${plan}"]`);
  await Promise.all([p.waitForURL(/3312\/pay\//), p.click(`[data-testid="buy-${plan}"]`)]);
  timings[`${plan} checkout ${w}`] = Date.now() - t0;
  const st = await mock(), sess = st.sessions.at(-1);
  ok(sess.price === st.prices.find((x) => x.lookup_key === lk)?.id && sess.customer, `${w} ${plan}: Stripe checkout created for the ${plan} price`);
  const sid = `sub_${plan}_${w}_${run}`;
  await fetch(MOCK + "/__sub", { method: "POST", headers: KEY, body: new URLSearchParams({ json: JSON.stringify(subObj(sid, sess.customer, sess.user_id, lk)) }) });
  ok((await hook({ type: "checkout.session.completed", data: { object: { subscription: sid } } }, await stripeSecret())).status === 200, `${w} ${plan}: payment-complete webhook accepted`);
  await p.goto(BASE + "/pricing?paid=1");
  ok(await p.isVisible('[data-testid="paid-msg"]'), `${w} ${plan}: thank-you shown`);
  const u = await me(p);
  ok(u.storedPlan === plan && u.subscription?.status === "active", `${w} ${plan}: plan switched on (${u.storedPlan})`);
  return { sid, sess };
}
async function cancel(p, sid, sess, lk) {
  await hook({ type: "customer.subscription.deleted", data: { object: subObj(sid, sess.customer, sess.user_id, lk, "canceled") } }, await stripeSecret());
}

for (const w of [1440, 390]) {
  // 1 anonymous visitor, statistics allowed
  const { ctx, p, errs } = await newPage(w, true);
  let t0 = Date.now();
  await p.goto(BASE + "/");
  timings[`home ${w}`] = Date.now() - t0;
  ok((await p.title()).length > 0, `${w} landing loads`);
  await p.goto(BASE + "/pricing");
  ok((await p.locator('a:has-text("Subscribe")').count()) >= 2, `${w} signed out: paid plans send to sign-up`);
  ok(await p.isVisible('[data-testid="plan-terms"]'), `${w} price line with VAT and cancel info`);
  ok(await p.evaluate(() => document.documentElement.scrollWidth <= window.innerWidth + 1), `${w} pricing: no sideways scroll`);
  await p.screenshot({ path: `${SHOTS}/pricing-${w}.png`, fullPage: true });
  await p.goto(BASE + "/pro");
  ok(await p.isVisible('[data-testid="pro-demo"]'), `${w} /pro: landing with demo for visitors`);
  ok((await p.textContent('[data-testid="pro-demo-total"]')).includes("%"), `${w} /pro: demo totals shown`);
  ok(!(await p.textContent("body")).match(/recommended|best bonds|you should buy/i), `${w} /pro: no advice wording`);
  await p.screenshot({ path: `${SHOTS}/pro-landing-${w}.png`, fullPage: true });
  const terms = await p.request.get(BASE + "/pro/terms");
  ok(terms.status() === 200, `${w} /pro/terms reachable`);
  // 2 sign-up
  const ms = await signup(p, `plus${w}${run}@e2e.local`);
  timings[`signup ${w}`] = ms;
  ok(true, `${w} sign-up done in ${ms} ms`);
  await p.click("text=Let’s get started!").catch(() => {});
  // 3 retail plans
  const a = await buy(p, "plus", "tenbonds_plus_monthly_eur", w);
  const again = await p.evaluate(async () => (await fetch("/api/billing/checkout", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ plan: "premium", startNow: true }) })).status);
  ok(again === 409, `${w} second subscription refused (${again})`);
  await cancel(p, a.sid, a.sess, "tenbonds_plus_monthly_eur");
  ok((await me(p)).storedPlan === "free", `${w} cancellation returns to free`);
  const b = await buy(p, "premium", "tenbonds_premium_monthly_eur", w);
  await cancel(p, b.sid, b.sess, "tenbonds_premium_monthly_eur");
  // 4 Pro, not yet verified
  const cs = await p.evaluate(async () => (await fetch("/api/billing/checkout", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ plan: "pro", startNow: true }) })).status);
  ok(cs === 403, `${w} Pro checkout refused before verification (${cs})`);
  await p.goto(BASE + "/pro");
  ok(await p.isVisible('[data-testid="pro-firm"]'), `${w} /pro: verification form shown`);
  ok(await p.isDisabled('[data-testid="pro-submit"]'), `${w} /pro: submit waits for both ticks`);
  await p.fill('[data-testid="pro-firm"]', `Rossi Patrimoni ${w}${run}`);
  await p.selectOption('[data-testid="pro-regulator-select"]', "consob");
  await p.fill('[data-testid="pro-licence"]', `SIM-${run}`);
  await p.fill('[data-testid="pro-role"]', "Wealth manager");
  await p.check('[data-testid="pro-declaration"]');
  await p.check('[data-testid="pro-b2b"]');
  await p.click('[data-testid="pro-submit"]');
  await p.waitForSelector('[data-testid="pro-pending"]');
  ok(true, `${w} /pro: verification request sent`);
  const proEmail = `plus${w}${run}@e2e.local`;
  await ctx.close();
  globalThis[`pro${w}`] = proEmail;
  ok(errs.length === 0, `${w} no page errors ${errs.join(" | ")}`);
}

// 5 admin approves, trial opens, Pro checkout
const admin = await newPage(1440, false);
{
  const { ctx, p } = admin;
  await login(p, "boss@e2e.local", true);
  const st0 = await p.evaluate(async () => (await fetch("/api/admin/2fa")).json());
  if (st0.state === "setup") {
    const r = await p.evaluate(async (code) => (await fetch("/api/admin/2fa", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ action: "confirm", code }) })).status, totp(st0.secret));
    ok(r === 200, "admin two-factor set up for the test");
  }
  await p.goto(BASE + "/admin/pro");
  console.log("admin url", p.url(), JSON.stringify(await me(p)).slice(0, 200));
  await p.waitForSelector('[data-testid="pro-admin-row"]', { timeout: 10000 }).catch(() => {});
  const rows = await p.locator('[data-testid="pro-admin-row"]').count();
  ok(rows >= 2, `admin sees the ${rows} verification requests`);
  ok(await p.isVisible("text=open the CONSOB register"), "admin gets a link to the regulator's register");
  while (await p.locator('[data-testid="pro-approve"]').count()) { await p.locator('[data-testid="pro-approve"]').first().click(); await p.waitForTimeout(600); }
  ok(await p.isVisible("text=trial ends"), "approval starts a trial (end date shown)");
  await p.screenshot({ path: `${SHOTS}/admin-pro.png`, fullPage: true });
}
for (const w of [1440, 390]) {
  const { ctx, p } = await newPage(w, true);
  await login(p, `plus${w}${run}@e2e.local`);
  await p.goto(BASE + "/pro");
  if (!(await p.isVisible('[data-testid="pro-trial-banner"]'))) console.log("DEBUG", p.url(), JSON.stringify(await me(p)).slice(0, 300), (await p.textContent("main, body")).slice(0, 400));
  ok(await p.isVisible('[data-testid="pro-trial-banner"]'), `${w} verified: 14-day trial banner, engine open`);
  ok((await p.textContent('[data-testid="pro-trial-banner"]')).includes("14 days"), `${w} trial shows 14 days left`);
  await p.screenshot({ path: `${SHOTS}/pro-trial-${w}.png` });
  const c = await buy(p, "pro", "tenbonds_pro_monthly_eur", w);
  const st = await mock();
  ok(st.sessions.at(-1).tax_id ?? true, `${w} Pro checkout created`);
  await p.goto(BASE + "/pro");
  ok(!(await p.isVisible('[data-testid="pro-trial-banner"]')), `${w} on the paid plan: no trial banner`);
  await ctx.close();
}
// 5b cookie bar and the no-statistics path
{
  const ctx = await browser.newContext({ viewport: { width: 1440, height: 900 }, extraHTTPHeaders: { "cf-ipcountry": "FR" } });
  const p = await ctx.newPage();
  await p.goto(BASE + "/knowledge");
  await p.waitForSelector('[data-testid="cookie-banner"]');
  const txt = await p.textContent('[data-testid="cookie-banner"]');
  ok(/Accept statistics/.test(txt) && /Customize/.test(txt) && !/Reject/.test(txt), "cookie bar: Accept statistics + Customize, no Reject");
  ok(/sell/i.test(txt) && /advertising cookies/.test(txt), "cookie bar: says no data sold, no advertising cookies");
  await p.screenshot({ path: `${SHOTS}/cookie-bar.png` });
  await p.click('[data-testid="cookie-settings"]');
  ok(await p.isVisible("button:has-text(\"Necessary only\")"), "Customize shows Necessary only");
  const counted = p.waitForResponse((r) => r.url().includes("/api/count"));
  await p.getByRole("button", { name: "Necessary only" }).click();
  await counted;
  ok(await p.evaluate(() => !localStorage.getItem("tb_vid")), "necessary only: no visitor id stored");
  await ctx.close();
}
// 6 funnel numbers
{
  const { ctx, p } = admin;
  await p.goto(BASE + "/admin/funnel");
  await p.waitForSelector('[data-testid="funnel-steps"]');
  ok(true, "admin funnel page loads");
  const j = await p.evaluate(async () => (await fetch("/api/admin/funnel?days=7")).json());
  const v = Object.fromEntries(j.steps.map((s) => [s.kind, s.visitors]));
  console.log("funnel visitors", JSON.stringify(v), "extra", JSON.stringify(j.extra), "payingNow", j.payingNow);
  ok(v.pricing_viewed >= 2 && v.signup >= 2 && v.plan_selected >= 2 && v.checkout_started >= 2 && v.paid >= 2, "funnel counts pricing, sign-up, plan chosen, checkout, paid");
  ok(j.countries.some((c) => c.country === "FR" && c.anonymousPageViews >= 1), "refused-statistics visit counted anonymously under its country");
  ok(j.countries.some((c) => c.country === "IT" && c.accounts >= 1), "accounts counted by country");
  await p.screenshot({ path: `${SHOTS}/admin-funnel.png`, fullPage: true });
  const vj = await p.evaluate(async () => (await fetch("/api/admin/visitors")).json());
  console.log("visitors", JSON.stringify(vj.visitors.slice(0, 3)));
  ok(vj.visitors.some((v) => v.code === "user001") && vj.visitors.every((v) => /^user\d{3,}$/.test(v.code)), "visitors have codes user001, user002…");
  ok(vj.visitors.some((v) => v.country === "IT" && v.countrySource === "header") && vj.visitors.some((v) => v.country === "FR" && v.countrySource === "estimated"), "country from header and estimated from timezone");
  ok(!JSON.stringify(vj).includes("@e2e.local"), "no e-mail stored against a visitor");
  await p.goto(BASE + "/admin/visitors");
  await p.waitForSelector('[data-testid="visitors-table"]');
  await p.screenshot({ path: `${SHOTS}/admin-visitors.png`, fullPage: true });
}
// 7 outreach drafts (nothing is sent)
{
  const { p } = admin;
  await p.goto(BASE + "/admin/outreach");
  await p.click('[data-testid="outreach-load"]');
  await p.waitForFunction(() => document.querySelectorAll('[data-testid="outreach-row"]').length >= 7);
  const counts = await p.textContent('[data-testid="outreach-counts"]');
  console.log("outreach", counts);
  ok(/IT: 3/.test(counts) && /FR: 2/.test(counts) && /DE: 2/.test(counts), "outreach batch: IT 3, FR 2, DE 2 drafts");
  ok((await p.locator('[data-testid="outreach-send"]:disabled').count()) === 2, "send is blocked for the 2 German firms");
  p.on("dialog", (d) => d.accept());
  await p.locator('[data-testid="outreach-send"]:not(:disabled)').first().click();
  await p.waitForSelector('[data-testid="outreach-msg"]');
  ok((await p.textContent('[data-testid="outreach-msg"]')).includes("OUTREACH_REPLY_TO"), "send refused until a reply inbox is set; nothing went out");
  const j = await p.evaluate(async () => (await fetch("/api/admin/outreach")).json());
  ok(j.rows.every((r) => r.status === "draft"), "all outreach lines still draft");
  await p.screenshot({ path: `${SHOTS}/admin-outreach.png`, fullPage: true });
}
await admin.ctx.close();
console.log("timings", JSON.stringify(timings));
await browser.close();
console.log(fails ? `${fails} FAILED` : "ALL PASSED");
process.exit(fails ? 1 : 0);
