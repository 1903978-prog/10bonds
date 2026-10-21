// Browser check of the weekly search limit screens (server answers mocked): limit reached, searches left, pricing cards.
import { chromium } from "playwright-core";
const BASE = process.env.BASE ?? "http://127.0.0.1:3311";
const browser = await chromium.launch({ executablePath: process.env.CHROME ?? "/opt/pw-browsers/chromium" });
let fail = 0;
const ok = (c, m) => { console.log(`${c ? "PASS" : "FAIL"} ${m}`); if (!c) fail++; };
for (const [w, h] of [[1440, 900], [390, 844]]) {
  const page = await browser.newPage({ viewport: { width: w, height: h } });
  const reset = new Date(Date.now() + 3 * 864e5).toISOString();
  await page.route("**/api/bonds?**", (r) => r.fulfill({ status: 402, contentType: "application/json", body: JSON.stringify({ error: "x", tier: "free", limitReached: { kind: "portfolio", limit: 3, used: 3, resetsAt: reset } }) }));
  await page.goto(BASE + "/");
  await page.getByRole("button", { name: "Reject" }).click().catch(() => {});
  const box = page.getByTestId("limit-reached");
  await box.waitFor({ timeout: 8000 }).catch(() => {});
  ok(await box.isVisible(), `${w}: limit-reached shown`);
  ok((await box.textContent())?.includes("3 portfolio searches a week"), `${w}: says 3 portfolio searches`);
  ok(await box.getByRole("link").getAttribute("href") === "/pricing", `${w}: upgrade link to pricing`);
  await page.unroute("**/api/bonds?**");
  await page.route("**/api/bonds/curve?**", (r) => r.fulfill({ status: 200, contentType: "application/json", body: JSON.stringify({ tier: "free", points: [], quota: { kind: "single", limit: 10, used: 4, resetsAt: reset }, source: "sample", asOf: null }) }));
  await page.getByRole("tab", { name: "1 bond" }).click();
  const q = page.getByTestId("quota-single");
  await q.waitFor({ timeout: 8000 }).catch(() => {});
  ok((await q.textContent().catch(() => ""))?.includes("6 of 10 single-bond searches left"), `${w}: searches left line`);
  await page.goto(BASE + "/pricing");
  const body = await page.textContent("body");
  ok(body.includes("10 single-bond searches a week") && body.includes("3 portfolio searches a week"), `${w}: Free card limits`);
  ok(body.includes("ISIN codes visible") && body.includes("Unlimited single-bond searches"), `${w}: Plus card`);
  ok(await page.evaluate(() => document.documentElement.scrollWidth <= window.innerWidth), `${w}: no sideways scroll`);
  if (w === 390) await page.screenshot({ path: "/tmp/claude-0/pricing390.png", fullPage: true });
  await page.close();
}
await browser.close();
process.exit(fail ? 1 : 0);
