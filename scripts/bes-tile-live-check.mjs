// Opens the live finder as an anonymous visitor, runs one search and prints the page status and the efficiency score tile text. Read-only.
import { chromium } from "playwright-core";

const base = process.env.BASE_URL ?? "https://10bonds.com";
const browser = await chromium.launch();
const page = await browser.newPage({ viewport: { width: 1440, height: 900 }, extraHTTPHeaders: { Referer: base + "/" } });
const errors = [];
page.on("console", (m) => { if (m.type() === "error") errors.push(m.text()); });
let status = 0;
let api = 0;
let bes = "none";
page.on("response", async (r) => {
  if (!r.url().includes("/api/bonds?")) return;
  api = r.status();
  try { const j = await r.json(); bes = JSON.stringify({ bes: j.bes ?? null, rows: j.rows?.length ?? null, status: j.status ?? null }); } catch { bes = "not json"; }
});
const res = await page.goto(base + "/", { waitUntil: "domcontentloaded", timeout: 60000 });
status = res?.status() ?? 0;
console.log(`page status ${status}`);
const listed = page.waitForResponse((r) => r.url().includes("/api/bonds?"), { timeout: 120000 }).catch(() => null);
await page.getByTestId("find-portfolio").click();
const lr = await listed;
if (lr) await lr.finished().catch(() => null);
await page.waitForTimeout(3000);
const tile = page.getByText(/efficiency score/i).first();
try { await tile.waitFor({ timeout: 60000 }); } catch {
  console.log(`TILE NOT FOUND. list api status ${api}; api answer ${bes}`);
  console.log(`body: ${(await page.locator("body").innerText()).replace(/\s+/g, " ").slice(0, 800)}`);
  await page.screenshot({ path: "bes-tile.png" });
  await browser.close();
  process.exit(1);
}
const box = tile.locator("xpath=..");
console.log(`list api status ${api}; api answer ${bes}`);
console.log(`tile text: ${(await box.innerText()).replace(/\s+/g, " ")}`);
await page.screenshot({ path: "bes-tile.png" });
const scroll = async () => page.evaluate(() => ({ scrollH: document.documentElement.scrollHeight, viewH: window.innerHeight }));
console.log(`list view scroll: ${JSON.stringify(await scroll())}`);
await page.getByRole("button", { name: /^Chart$/ }).first().click();
await page.waitForTimeout(2500);
const ct = page.getByText(/^efficiency score$/i).first();
try { await ct.waitFor({ timeout: 30000 }); console.log(`chart view tile: ${(await ct.locator("xpath=..").innerText()).replace(/\s+/g, " ")}`); }
catch { console.log("CHART VIEW TILE NOT FOUND"); process.exitCode = 1; }
console.log(`chart view scroll: ${JSON.stringify(await scroll())}`);
await page.screenshot({ path: "bes-tile-chart.png" });
console.log(`console errors: ${errors.length}`);
await browser.close();
process.exit(status === 200 && api === 200 && !process.exitCode ? 0 : 1);
