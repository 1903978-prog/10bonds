// Checks that the finder (inputs + results table) fits in the first screen on the home page and each language page.
import { chromium } from "playwright-core";
const b = await chromium.launch({ executablePath: "/opt/pw-browsers/chromium-1194/chrome-linux/chrome" });
const out = process.argv[2];
for (const path of ["/", "/it", "/fr", "/de"]) {
  for (const [w, h] of [[1440, 820], [1434, 754]]) {
    for (const tab of [0, 1]) {
      const ctx = await b.newContext({ viewport: { width: w, height: h } });
      const p = await ctx.newPage();
      await p.goto(`http://127.0.0.1:3311${path}?preview=plus`);
      await p.evaluate(() => localStorage.setItem("tb_consent", "no"));
      await p.reload();
      await p.getByRole("tab").nth(tab).click();
      await p.waitForTimeout(2000);
      const r = await p.evaluate(() => {
        const f = document.querySelector(".finder-wide");
        return f ? Math.round(f.getBoundingClientRect().bottom) : -1;
      });
      console.log(path, w, h, tab ? "tab2" : "tab1", r, r > 0 && r <= h ? "FITS" : "DOES NOT FIT");
      if (w === 1440) await p.screenshot({ path: `${out}/home${path.replace("/", "-") || "-en"}-${tab}.png` });
      await ctx.close();
    }
  }
}
await b.close();
