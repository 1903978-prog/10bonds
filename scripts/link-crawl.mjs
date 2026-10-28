// Link check: opens the site in a real browser as a visitor, a free user and the read-only test admin, follows every internal
// link (routes, sitemap, admin home and its menu), and records status, console errors and pages that render without data.
//
// Usage: BASE=https://10bonds.com ROLES=visitor,free,admin LINKCHECK_PASSWORD=... node scripts/link-crawl.mjs
//   OUT=<folder>        where link-check.json and link-check.md are written (default ./link-check-out)
//   EXTRA_CHECKS=1     also run the named checks of extraChecks() (needs the real bond data: live site only)
//   MAX_PAGES=<n>       pages per role (default 600)
//   CHROME_PATH / CHROME_CHANNEL  pick the browser (default channel "chrome")
// Read-only: only GET requests, plus the sign-in POST. Exit code 1 when any page that must work answers 4xx/5xx or fails to load.
import { mkdirSync, readdirSync, existsSync, writeFileSync } from "node:fs";
import { join } from "node:path";
import { chromium } from "playwright-core";

const BASE = (process.env.BASE ?? "http://127.0.0.1:3311").replace(/\/$/, "");
const ROLES = (process.env.ROLES ?? "visitor,free,admin").split(",").map((s) => s.trim()).filter(Boolean);
const OUT = process.env.OUT ?? "link-check-out";
const MAX_PAGES = Number(process.env.MAX_PAGES ?? 600);
const PASSWORD = process.env.LINKCHECK_PASSWORD ?? "";
const CONCURRENCY = Number(process.env.CONCURRENCY ?? 3);
const BOND_SAMPLE = Number(process.env.BOND_SAMPLE ?? 25);
const ACCOUNTS = { free: "link-check-free@10bonds.com", admin: "link-check-admin@10bonds.com" };

// Pages our specs and notes promise. Each one must answer (a redirect to the real page counts). Admin ones are checked as admin.
const PROMISED = [
  "/admin/bond-efficiency", "/admin/portfolio-efficiency", "/admin/efficient-database", "/admin/methodology", "/admin/risk-bands",
  "/admin/data-coverage", "/admin/nightly-build", "/admin/topic-radar", "/admin/auto-content", "/admin/seo-roadmap", "/admin/seo-score",
  "/admin/backlinks", "/admin/funnel", "/admin/plan-features", "/admin/legal", "/admin/risk-matrix", "/admin/bund-benchmark", "/admin/us-treasury-benchmark",
];

function appRoutes() {
  const root = join(process.cwd(), "app");
  const out = [];
  const walk = (dir, segs) => {
    for (const e of readdirSync(dir, { withFileTypes: true })) {
      if (e.isDirectory()) walk(join(dir, e.name), [...segs, e.name]);
      else if (e.name === "page.tsx" && !segs.some((s) => s.includes("["))) out.push("/" + segs.join("/"));
    }
  };
  if (existsSync(root)) walk(root, []);
  return out;
}

const sameSite = (u) => {
  try {
    const x = new URL(u, BASE);
    return x.origin === new URL(BASE).origin ? x.pathname + x.search : null;
  } catch {
    return null;
  }
};

async function sitemapPaths(request) {
  const paths = [];
  const get = async (p) => {
    const r = await request.get(BASE + p, { timeout: 60_000 }).catch(() => null);
    return r && r.ok() ? await r.text() : "";
  };
  const locs = (xml) => [...xml.matchAll(/<loc>([^<]+)<\/loc>/g)].map((m) => sameSite(m[1].trim())).filter(Boolean);
  const main = locs(await get("/sitemap.xml"));
  const bonds = locs(await get("/bonds/sitemap.xml"));
  paths.push(...main);
  // The bond sitemaps list thousands of pages: a sample of each file is enough for a link check.
  for (const f of bonds.filter((p) => p.endsWith(".xml") || p.includes("/sitemaps/")).slice(0, 4)) {
    paths.push(...locs(await get(f)).filter((p) => !p.endsWith(".xml")).slice(0, BOND_SAMPLE));
  }
  paths.push(...bonds.filter((p) => !p.endsWith(".xml") && !p.includes("/sitemaps/")).slice(0, BOND_SAMPLE));
  return paths;
}

const EMPTY_PATTERNS = [
  [/Returns as of\s*[—–-](?!\s*\d)/, 'shows "Returns as of —"'],
  [/\bundefined\b/, 'shows "undefined"'],
  [/\bNaN\b/, 'shows "NaN"'],
  [/\[object Object\]/, 'shows "[object Object]"'],
  [/Page not found/, 'shows "Page not found" with a success status'],
];


// Named checks from the owner's notes: what the page really shows to this role (not just the status). Read-only apart from the
// admin yes/no switch, which can only take admin powers away and is switched back at the end.
async function extraChecks(ctx, role) {
  const out = [];
  const rec = (name, ok, detail) => out.push({ role, name, ok, detail: String(detail).replace(/\s+/g, " ").slice(0, 220) });
  const open = async (path) => {
    const page = await ctx.newPage();
    const res = await page.goto(BASE + path, { waitUntil: "load", timeout: 60_000 });
    await page.waitForLoadState("networkidle", { timeout: 6_000 }).catch(() => {});
    return { page, status: res?.status() ?? 0 };
  };
  try {
    if (role !== "admin") {
      const { page, status } = await open("/bond-card");
      rec("/bond-card is closed (404)", status === 404, `HTTP ${status}`);
      await page.close();
    } else {
      const fullCard = (isin) => [isin, new RegExp(isin), "full card"];
      for (const [isin, want, label] of [
        ["FR0000186413", /does not pay a fixed coupon/i, 'message "does not pay a fixed coupon"'],
        fullCard("DE000HEL4BV8"), fullCard("GR0128016731"), fullCard("US054989AB41"), fullCard("US263901AA85"),
      ]) {
        const { page, status } = await open(`/bond-card?isin=${isin}`);
        let text = "";
        if (status === 200) {
          await page.getByTestId("card-input").fill(isin).catch(() => {});
          await page.getByTestId("card-go").click().catch(() => {});
          await page.waitForTimeout(4000);
          text = await page.getByTestId("card-result").innerText().catch(() => "");
        }
        const ok = status === 200 && want.test(text) && (label !== "full card" || !/does not pay|not shown|not available/i.test(text));
        rec(`/bond-card ${isin}: ${label}`, ok, `HTTP ${status}: ${text}`);
        await page.close();
      }
      const post = (asUser) => ctx.request.post(BASE + "/api/admin/view", { data: { asUser }, timeout: 60_000 });
      const adminStatus = async () => (await ctx.request.get(BASE + "/admin", { timeout: 60_000 })).status();
      const off = await post(true);
      const asUserStatus = await adminStatus();
      const on = await post(false);
      const backStatus = await adminStatus();
      rec("Admin yes/no switch toggles", off.ok() && on.ok() && asUserStatus === 404 && backStatus === 200, `switch to No: HTTP ${off.status()}, /admin then HTTP ${asUserStatus} (want 404); back to Yes: HTTP ${on.status()}, /admin then HTTP ${backStatus} (want 200)`);
    }
    if (role !== "visitor") {
      const page = await ctx.newPage();
      await page.setExtraHTTPHeaders({ Referer: BASE + "/" });
      const res = await page.goto(BASE + "/", { waitUntil: "domcontentloaded", timeout: 60_000 });
      const listed = page.waitForResponse((r) => r.url().includes("/api/bonds?"), { timeout: 120_000 }).catch(() => null);
      await page.getByTestId("find-portfolio").click({ timeout: 30_000 }).catch(() => {});
      const lr = await listed;
      if (lr) await lr.finished().catch(() => null);
      await page.waitForTimeout(3000);
      const tile = page.getByText(/efficiency score/i).first();
      const found = await tile.waitFor({ timeout: 30_000 }).then(() => true).catch(() => false);
      const tileText = found ? await tile.locator("xpath=..").innerText().catch(() => "") : "";
      rec('Finder shows the "efficiency score (avg)" tile', found, `home HTTP ${res?.status()}, list HTTP ${lr?.status() ?? "none"}: ${tileText || "tile not found"}`);
      await page.close();
    }
  } catch (e) {
    rec("extra checks", false, e.message.split("\n")[0]);
  }
  return out;
}

async function crawlRole(browser, role) {
  const ctx = await browser.newContext({ viewport: { width: 1440, height: 900 } });
  await ctx.addInitScript(() => localStorage.setItem("tb_cookie_consent", JSON.stringify({ necessary: true, statistics: false, marketing: false, at: Date.now() })));
  const roleNote = { role, signedIn: null };
  if (role !== "visitor") {
    const r = await ctx.request.post(BASE + "/api/auth/login", { data: { email: ACCOUNTS[role], password: PASSWORD }, timeout: 60_000 });
    // Over plain http (the CI copy) the session cookie is marked Secure and the request client drops it: set it by hand.
    if (BASE.startsWith("http:")) {
      for (const h of r.headersArray().filter((x) => x.name.toLowerCase() === "set-cookie")) {
        const [pair] = h.value.split(";");
        const i = pair.indexOf("=");
        await ctx.addCookies([{ name: pair.slice(0, i), value: pair.slice(i + 1), url: BASE }]);
      }
    }
    const me = await ctx.request.get(BASE + "/api/auth/me");
    const info = me.ok() ? await me.json().catch(() => null) : null;
    roleNote.signedIn = { login: r.status(), email: info?.email ?? null, isAdmin: info?.isAdmin ?? null, plan: info?.plan ?? null };
    const right = r.ok() && info?.email === ACCOUNTS[role] && (role === "admin" ? info.isAdmin === true : info.isAdmin !== true);
    if (!right) {
      await ctx.close();
      return { checks: [], note: { ...roleNote, error: `could not sign in as ${role} (login HTTP ${r.status()})` }, rows: [] };
    }
  }

  const denied = role !== "admin"; // admin pages are closed to everyone else: a 404 or a sign-in redirect is the right answer
  const seen = new Set();
  const queue = [];
  const rows = [];
  const add = (p) => {
    if (!p) return;
    const clean = p.split("#")[0];
    if (!clean || seen.has(clean) || /^\/(_next|api\/stripe)/.test(clean)) return;
    seen.add(clean);
    queue.push(clean);
  };
  add("/");
  for (const l of ["it", "fr", "de"]) add("/" + l);
  appRoutes().forEach(add);
  (await sitemapPaths(ctx.request)).forEach(add);
  ["/robots.txt", "/llms.txt", "/sitemap.xml", "/bonds/sitemap.xml"].forEach(add);
  PROMISED.forEach(add);

  async function visit(path) {
    const started = Date.now();
    const row = { role, path, status: null, finalPath: null, ms: 0, consoleErrors: [], empty: [], note: "" };
    const isApi = path.startsWith("/api/") || /\.(xml|txt|json|csv|pdf)$/.test(path);
    try {
      if (isApi) {
        const r = await ctx.request.get(BASE + path, { timeout: 60_000, maxRedirects: 5 });
        row.status = r.status();
        row.finalPath = sameSite(r.url());
      } else {
        const page = await ctx.newPage();
        page.on("pageerror", (e) => row.consoleErrors.push(String(e.message).slice(0, 200)));
        page.on("console", (m) => { if (m.type() === "error") row.consoleErrors.push(m.text().slice(0, 200)); });
        page.on("response", (r) => { if (r.status() >= 500 && sameSite(r.url()) && !r.url().includes("/_next/")) row.consoleErrors.push(`HTTP ${r.status()} from ${sameSite(r.url())}`); });
        const res = await page.goto(BASE + path, { waitUntil: "load", timeout: 60_000 });
        await page.waitForLoadState("networkidle", { timeout: 6_000 }).catch(() => {});
        row.status = res?.status() ?? null;
        row.finalPath = sameSite(page.url());
        if (row.status && row.status < 400) {
          const text = (await page.evaluate(() => document.body?.innerText ?? "").catch(() => "")) || "";
          for (const [re, label] of EMPTY_PATTERNS) if (re.test(text)) row.empty.push(label);
          const dashes = text.split("\n").filter((l) => /^\s*[–—-]\s*$/.test(l)).length;
          if (dashes >= 12) row.empty.push(`${dashes} empty cells ("–")`);
          if (text.trim().length < 40) row.empty.push("page is almost empty");
          const hrefs = await page.evaluate(() => [...document.querySelectorAll("a[href]")].map((a) => a.getAttribute("href")));
          for (const h of hrefs) if (h && !/^(mailto:|tel:|javascript:|#)/.test(h)) add(sameSite(h));
        }
        await page.close();
      }
    } catch (e) {
      row.status = 0;
      row.note = String(e.message).split("\n")[0].slice(0, 160);
    }
    row.ms = Date.now() - started;
    rows.push(row);
  }

  let idx = 0;
  let active = 0;
  const worker = async () => {
    // A worker leaves only when the queue is empty and nobody is still opening a page that may add links.
    while (rows.length + active < MAX_PAGES || active > 0) {
      if (idx < queue.length && rows.length + active < MAX_PAGES) {
        const p = queue[idx++];
        active++;
        await visit(p);
        active--;
      } else if (active === 0) break;
      else await new Promise((r) => setTimeout(r, 40));
    }
  };
  await Promise.all(Array.from({ length: CONCURRENCY }, worker));
  const checks = process.env.EXTRA_CHECKS === "1" ? await extraChecks(ctx, role) : [];
  await ctx.close();
  return { checks, note: { ...roleNote, denied, pagesLeftUnvisited: Math.max(0, queue.length - rows.length) }, rows };
}

// What counts as broken, per role.
function verdict(row) {
  const adminPath = row.path.startsWith("/admin");
  if (row.role !== "admin" && adminPath) {
    if (row.status === 404 || (row.status && row.status < 400)) return "ok"; // closed to this role, as designed
    return row.status === 0 || row.status >= 500 ? "broken" : "ok";
  }
  if (row.status === 0 || row.status === null || row.status >= 400) return "broken";
  if (row.consoleErrors.some((e) => e.startsWith("HTTP 5"))) return "broken";
  return "ok";
}

const browser = await chromium.launch(process.env.CHROME_PATH ? { executablePath: process.env.CHROME_PATH } : { channel: process.env.CHROME_CHANNEL ?? "chrome" });
const all = [];
const notes = [];
const allChecks = [];
for (const role of ROLES) {
  console.log(`== crawling as ${role}`);
  const { note, rows, checks } = await crawlRole(browser, role);
  allChecks.push(...checks);
  notes.push(note);
  if (note.error) console.log(`!! ${note.error}`);
  for (const r of rows) all.push({ ...r, verdict: verdict(r) });
  console.log(`   ${rows.length} pages, ${rows.filter((r) => verdict(r) === "broken").length} broken`);
}
await browser.close();

mkdirSync(OUT, { recursive: true });
writeFileSync(join(OUT, "link-check.json"), JSON.stringify({ base: BASE, at: new Date().toISOString(), notes, checks: allChecks, rows: all }, null, 1));
const broken = all.filter((r) => r.verdict === "broken");
const withErrors = all.filter((r) => r.verdict === "ok" && r.consoleErrors.length && !(r.role !== "admin" && r.path.startsWith("/admin")));
const empties = all.filter((r) => r.empty.length && r.verdict === "ok");
const signInFailed = notes.filter((n) => n.error);
const md = [];
md.push(`# Link check · ${BASE} · ${new Date().toISOString().slice(0, 16)} UTC`);
md.push("");
md.push("| Role | Pages | Broken (404/500/failed) | Console errors | Empty data |", "|---|---|---|---|---|");
for (const role of ROLES) {
  const r = all.filter((x) => x.role === role);
  md.push(`| ${role} | ${r.length} | ${r.filter((x) => x.verdict === "broken").length} | ${r.filter((x) => x.consoleErrors.length).length} | ${r.filter((x) => x.empty.length).length} |`);
}
if (signInFailed.length) md.push("", ...signInFailed.map((n) => `**Sign-in problem:** ${n.error}`));
if (broken.length) {
  md.push("", "## Broken pages", "", "| Role | Page | Status | Note |", "|---|---|---|---|");
  for (const r of broken) md.push(`| ${r.role} | ${r.path} | ${r.status} | ${r.note || (r.finalPath !== r.path ? `→ ${r.finalPath}` : "")} |`);
}
if (withErrors.length) {
  md.push("", "## Console errors", "", "| Role | Page | First error |", "|---|---|---|");
  for (const r of withErrors.slice(0, 60)) md.push(`| ${r.role} | ${r.path} | ${r.consoleErrors[0].replace(/\|/g, "/")} |`);
}
if (empties.length) {
  md.push("", "## Pages that open but look empty", "", "| Role | Page | What |", "|---|---|---|");
  for (const r of empties.slice(0, 60)) md.push(`| ${r.role} | ${r.path} | ${r.empty.join("; ")} |`);
}
if (allChecks.length) {
  md.push("", "## Checks by role", "", "| Role | Check | Result | What the page shows |", "|---|---|---|---|");
  for (const c of allChecks) md.push(`| ${c.role} | ${c.name} | ${c.ok ? "PASS" : "FAIL"} | ${c.detail.replace(/\|/g, "/")} |`);
}
md.push("", "## Promised pages", "", "| Page | Status as admin | Ends at |", "|---|---|---|");
for (const p of PROMISED) {
  const r = all.find((x) => x.role === (ROLES.includes("admin") ? "admin" : ROLES[0]) && x.path === p);
  if (r) md.push(`| ${p} | ${r.status} | ${r.finalPath === p ? "same page" : r.finalPath} |`);
}
writeFileSync(join(OUT, "link-check.md"), md.join("\n") + "\n");
console.log(md.join("\n"));
console.log(`\n${broken.length} broken page(s) in ${all.length} checked.`);
const failedChecks = allChecks.filter((c) => !c.ok);
if (failedChecks.length) console.log(`${failedChecks.length} check(s) failed: ${failedChecks.map((c) => c.role + " " + c.name).join("; ")}`);
process.exit(broken.length || signInFailed.length || failedChecks.length ? 1 : 0);
