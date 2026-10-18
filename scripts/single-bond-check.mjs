import { chromium } from "playwright-core";
const b = await chromium.launch({ executablePath: "/opt/pw-browsers/chromium-1194/chrome-linux/chrome" });
for (const w of [1440, 390]) {
  const ctx = await b.newContext({ viewport: { width: w, height: 1000 } });
  await ctx.addCookies([{ name: "tb_consent", value: "1", url: "http://127.0.0.1:3311" }]);
  const p = await ctx.newPage();
  await p.goto("http://127.0.0.1:3311/?preview=plus");
  await p.getByRole("button", { name: "Deny" }).click().catch(() => {});
  await p.getByRole("tab", { name: "1 bond" }).click();
  const hasYield = await p.getByLabel("Target annual yield").count();
  await p.locator('[data-testid="dot-3"]').waitFor();
  await p.locator('[data-testid="dot-3"]').click();
  const box = p.locator('[data-testid="bond-box"]');
  await box.waitFor();
  const first = await box.innerText();
  await box.getByRole("button", { name: "Change" }).click();
  const second = await box.innerText();
  const sw = await p.evaluate(() => document.documentElement.scrollWidth);
  console.log(w, { yieldSliderHidden: hasYield === 0, changed: first !== second, isin: /ISIN\s+\w{12}/.test(second), overflow: sw > w });
  console.log(second.split("\n").slice(0, 6).join(" | "));
  await p.screenshot({ path: `/tmp/claude-0/single-${w}.png`, fullPage: true });
}
await b.close();
