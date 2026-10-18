import { chromium } from "playwright-core";
const b = await chromium.launch({ executablePath: "/opt/pw-browsers/chromium-1194/chrome-linux/chrome" });
for (const w of [1440, 390]) {
  const p = await b.newPage({ viewport: { width: w, height: 900 } });
  await p.goto("http://127.0.0.1:3311/");
  const s = p.getByLabel("Worst rating accepted");
  await s.waitFor();
  const yMaxBefore = await p.getByLabel("Target annual yield").getAttribute("max");
  await s.fill("10"); // AAA is on the right
  await p.waitForTimeout(1500);
  const label = await p.locator("text=AAA").first().isVisible();
  const yMaxAfter = await p.getByLabel("Target annual yield").getAttribute("max");
  const sw = await p.evaluate(() => document.documentElement.scrollWidth);
  console.log(w, { yMaxBefore, yMaxAfter, label, overflow: sw > w });
  await p.screenshot({ path: `/tmp/claude-0/risk-${w}.png` });
}
await b.close();
