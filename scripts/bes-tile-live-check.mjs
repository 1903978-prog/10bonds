// Opens the live finder as an anonymous visitor, runs one search and prints the page status and the efficiency score tile text. Read-only.
import { chromium } from "playwright-core";

const base = process.env.BASE_URL ?? "https://10bonds.com";
const browser = await chromium.launch();
const page = await browser.newPage({ viewport: { width: 1440, height: 900 } });
const errors = [];
page.on("console", (m) => { if (m.type() === "error") errors.push(m.text()); });
let status = 0;
let api = 0;
page.on("response", (r) => { if (r.url().includes("/api/bonds?")) api = r.status(); });
const res = await page.goto(base + "/", { waitUntil: "domcontentloaded", timeout: 60000 });
status = res?.status() ?? 0;
console.log(`page status ${status}`);
await page.getByRole("button", { name: /Pareto efficient portfolio/i }).first().click();
const tile = page.getByText(/efficiency score/i).first();
await tile.waitFor({ timeout: 120000 });
const box = tile.locator("xpath=..");
console.log(`list api status ${api}`);
console.log(`tile text: ${(await box.innerText()).replace(/\s+/g, " ")}`);
await page.screenshot({ path: "bes-tile.png" });
console.log(`console errors: ${errors.length}`);
await browser.close();
process.exit(status === 200 && api === 200 ? 0 : 1);
