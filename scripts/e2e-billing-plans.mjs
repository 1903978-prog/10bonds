// Billing check for every plan (Plus, Premium, Pro), against stripe-mock (test mode only): signs up a new user per plan, runs checkout, activates it through the signed webhook, checks the plan unlocks, then cancels.
// Local billing check: stripe-mock.mjs on :3312, the standalone server on :3311 with STRIPE_SECRET_KEY=sk_test_local
// and STRIPE_API_BASE=http://127.0.0.1:3312, then `node scripts/e2e-billing.mjs`.
import { createHmac } from "node:crypto";
import { chromium } from "playwright-core";
const BASE = "http://127.0.0.1:3311", MOCK = "http://127.0.0.1:3312";
const SHOTS = process.env.SHOTS ?? "/tmp";
const KEY = { Authorization: "Bearer sk_test_local" };
let fails = 0;
const ok = (c, m) => { console.log((c ? "PASS " : "FAIL ") + m); if (!c) fails++; };
const mock = async () => (await fetch(MOCK + "/__state", { headers: KEY })).json();
const hook = async (event, secret, sigOverride) => {
  const body = JSON.stringify(event), t = Math.floor(Date.now() / 1000);
  const sig = sigOverride ?? `t=${t},v1=${createHmac("sha256", secret).update(`${t}.${body}`).digest("hex")}`;
  return fetch(BASE + "/api/stripe/webhook", { method: "POST", body, headers: { "stripe-signature": sig, "Content-Type": "application/json" } });
};
const health = await (await fetch(BASE + "/api/health/billing")).json();
ok(health.configured && health.prices === 6 && health.portal && health.webhook, `billing health ${JSON.stringify(health)}`);
let st = await mock();
ok(st.prices.length === 6 && st.prices.every((p) => p.currency === "eur"), "six EUR prices created");
ok(st.prices.map((p) => p.unit_amount).sort((a, b) => a - b).join() === "900,1900,8640,8900,18240,85440", "amounts: 9, 19, 89 a month and 86.40, 182.40, 854.40 a year");
ok(st.webhooks.length === 1 && st.webhooks[0].url.endsWith("/api/stripe/webhook"), "one webhook endpoint created");
const secret = st.webhooks[0].secret;
const browser = await chromium.launch({ executablePath: "/opt/pw-browsers/chromium-1243/chrome-linux64/chrome" });
for (const plan of ["plus", "premium", "pro"]) {
  const ctx = await browser.newContext({ viewport: { width: 1440, height: 900 } });
  const p = await ctx.newPage();
  const errs = []; p.on("pageerror", (e) => errs.push(e.message));
  await p.addInitScript(() => localStorage.setItem("tb_cookie_consent", JSON.stringify({ necessary: true, preferences: false, statistics: false, marketing: false })));
  const email = `pay-${plan}-${Date.now() % 100000}@e2e.local`;
  await p.goto(BASE + "/signup");
  await p.fill("input[type=email]", email);
  await p.fill("input[type=password]", "password123");
  await p.check("input[type=checkbox][required]");
  await p.click("button[type=submit]");
  await p.waitForSelector('[data-testid="welcome-modal"]', { timeout: 30000 });
  await p.goto(BASE + "/pricing");
  await p.check(`[data-testid="start-now-${plan}"]`);
  await Promise.all([p.waitForURL(/3312\/pay\//), p.click(`[data-testid="buy-${plan}"]`)]);
  ok(true, `${plan}: redirected to checkout`);
  const st = await mock();
  const sess = st.sessions.at(-1), price = st.prices.find((x) => x.id === sess.price);
  ok(price.lookup_key.includes(plan) && sess.customer && sess.user_id && sess.currency === "eur", `${plan}: checkout is for the ${plan} price in EUR (${price.lookup_key})`);
  const subId = `sub_${plan}`;
  const subObj = (status) => ({ id: subId, object: "subscription", customer: sess.customer, status, metadata: { user_id: sess.user_id }, cancel_at_period_end: false, current_period_end: Math.floor(Date.now() / 1000) + 30 * 86400, items: { data: [{ price: { id: price.id, lookup_key: price.lookup_key } }] } });
  await fetch(MOCK + "/__sub", { method: "POST", headers: KEY, body: new URLSearchParams({ json: JSON.stringify(subObj("active")) }) });
  const r = await hook({ type: "checkout.session.completed", data: { object: { subscription: subId } } }, secret);
  ok(r.status === 200, `${plan}: signed webhook accepted`);
  await p.goto(BASE + "/pricing");
  const me = () => p.evaluate(async () => (await fetch("/api/auth/me")).json());
  let u = await me();
  ok(u.storedPlan === plan && u.subscription?.status === "active", `${plan}: unlocked, stored plan ${u.storedPlan}, effective ${u.plan ?? "?"}`);
  await hook({ type: "customer.subscription.deleted", data: { object: subObj("canceled") } }, secret);
  u = await me();
  ok(u.storedPlan === "free", `${plan}: cancelled, back to ${u.storedPlan}`);
  ok(errs.length === 0, `${plan}: no page errors ${errs.join(" | ")}`);
  await ctx.close();
}
await browser.close();
console.log(fails ? `${fails} FAILED` : "ALL PASSED");
process.exit(fails ? 1 : 0);
