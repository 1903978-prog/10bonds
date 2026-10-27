import { chromium } from "playwright";
const b = await chromium.launch();
const p = await (await b.newContext({ viewport: { width: 1440, height: 900 } })).newPage();
const tiles = async () => (await p.locator("text=Return (per year)").first().locator("xpath=../..").innerText().catch(() => "NO TILE")).replace(/\s+/g, " ");
const legend = async () => (await p.locator("text=bonds, one grey dot each").first().innerText().catch(() => "NO LEGEND")).replace(/\s+/g, " ");
let t0 = Date.now();
await p.goto("https://10bonds.com/?intro=0", { waitUntil: "domcontentloaded", timeout: 90000 });
console.log("page loaded in", Date.now() - t0, "ms");
const rows = [];
for (const h of ["Short", "Medium", "Long"]) {
  await p.getByRole("button", { name: new RegExp("^" + h) }).first().click().catch(() => console.log("click fail", h));
  t0 = Date.now();
  let l = "NO LEGEND";
  while (Date.now() - t0 < 20000) { l = await legend(); if (/\d,?\d{3}/.test(l)) break; await p.waitForTimeout(250); }
  console.log(h, "dots legend after", Date.now() - t0, "ms:", l);
  const s = p.locator("input[type=range]").first();
  await s.focus(); await s.press("Home");
  for (let i = 0; i < 5; i++) {
    if (i) { for (let k = 0; k < 6; k++) await s.press("ArrowRight"); }
    t0 = Date.now(); let tl = "";
    while (Date.now() - t0 < 10000) { tl = await tiles(); if (/\d\.\d\d%.*\d\.\d\d%/.test(tl)) break; await p.waitForTimeout(250); }
    console.log(h, "slider", await s.inputValue(), "tiles after", Date.now() - t0, "ms:", tl);
  }
  await p.getByRole("button", { name: /Pareto efficient portfolio/ }).first().click().catch(() => console.log("button fail"));
  t0 = Date.now(); let n = 0;
  while (Date.now() - t0 < 60000) { n = await p.locator("tbody tr").count(); if (n >= 10) break; await p.waitForTimeout(500); }
  console.log(h, "list rows", n, "after", Date.now() - t0, "ms");
  await p.goto("https://10bonds.com/?intro=0", { waitUntil: "domcontentloaded" });
}
await b.close();
