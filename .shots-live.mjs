import { chromium } from "playwright-core";
const BASE = process.env.BASE || "http://localhost:3311";
const b = await chromium.launch({ executablePath: "/opt/pw-browsers/chromium-1194/chrome-linux/chrome" });
const pages = ["/", "/login", "/signup", "/pricing", "/forgot-password", "/it", "/disclaimer", "/pro"];
const sizes = [[1366, 768], [1440, 900], [1920, 1080], [390, 844]];
const out = process.argv[2];
for (const [w, h] of sizes) {
  const p = await b.newPage({ viewport: { width: w, height: h } });
  for (const path of pages) {
    await p.goto(BASE + path, { waitUntil: "networkidle" }); const deny = p.getByRole("button", { name: "Deny" }); if (await deny.isVisible().catch(() => false)) await deny.click();
    await p.waitForTimeout(400);
    const sh = await p.evaluate(() => document.documentElement.scrollHeight * (parseFloat(getComputedStyle(document.documentElement).zoom) || 1));
    console.log(`${w}x${h} ${path} pageHeight=${Math.round(sh)} ${sh > h + 2 ? "SCROLLS" : "fits"}`);
    if (out) await p.screenshot({ path: `${out}/${w}${path.replace(/\//g, "_") || "_home"}.png` });
  }
  await p.close();
}
await b.close();
