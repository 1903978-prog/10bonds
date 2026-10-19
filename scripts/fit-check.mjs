import { chromium } from "playwright-core";
const b = await chromium.launch({ executablePath: "/opt/pw-browsers/chromium-1194/chrome-linux/chrome" });
const out = process.argv[2];
for (const [w, h] of [[1434, 754], [1440, 820], [1280, 700], [390, 844]]) {
  for (const mode of ["Portfolio", "1 bond"]) {
    const ctx = await b.newContext({ viewport: { width: w, height: h } });
    const p = await ctx.newPage();
    await p.goto("http://127.0.0.1:3311/?preview=plus");
    await p.evaluate(() => localStorage.setItem("tb_consent", "no"));
    await p.reload();
    await p.getByRole("tab", { name: mode }).click();
    await p.waitForTimeout(1500);
    for (const id of ["toggle-currency", "toggle-size"]) {
      const g = p.locator(`[data-testid="${id}"] button`);
      for (const i of [0, 1]) { if (await g.nth(i).isEnabled()) { await g.nth(i).click(); await p.waitForTimeout(500); } }
      if (id === "toggle-currency") { await g.nth(1).click(); await p.waitForTimeout(500); await g.nth(0).click(); await p.waitForTimeout(500); }
    }
    await p.waitForTimeout(1200);
    if (mode === "1 bond") { const d = p.locator('[data-testid="dot-3"]'); if (await d.count()) { await d.click(); await p.waitForTimeout(800); } }
    const r = await p.evaluate(() => {
      const secs = [...document.querySelectorAll("main section")];
      const bottom = Math.max(...secs.map((s) => s.getBoundingClientRect().bottom));
      return { bottom: Math.round(bottom), sh: document.documentElement.scrollHeight, sw: document.documentElement.scrollWidth };
    });
    console.log(w, h, mode, r, r.bottom <= h ? "FITS" : "SCROLLS");
    await p.screenshot({ path: `${out}/fit-${mode.replace(" ", "")}-${w}.png` });
    await ctx.close();
  }
}
await b.close();
