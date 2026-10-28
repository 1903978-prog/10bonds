// Load check: N requests at the same moment against the live site, as a visitor and (when LINKCHECK_PASSWORD is set) as the test accounts.
// Read-only GET requests; signs in once per account (never in a loop). Prints status counts and p50 / p95 / max per page.
// Usage: BASE=https://10bonds.com CONCURRENCY=50 ROUNDS=3 [LINKCHECK_PASSWORD=...] node scripts/load-check.mjs
const BASE = (process.env.BASE ?? "https://10bonds.com").replace(/\/$/, "");
const N = Number(process.env.CONCURRENCY ?? 50);
const ROUNDS = Number(process.env.ROUNDS ?? 3);
const PASSWORD = process.env.LINKCHECK_PASSWORD ?? "";
const ACCOUNTS = { free: "link-check-free@10bonds.com", admin: "link-check-admin@10bonds.com" };
const PAGES = ["/?intro=0", "/pricing", "/api/auth/me", "/api/slider-snapshot?currency=EUR&size=100k", "/account", "/admin", "/admin/efficient-database", "/api/admin/efficient-database"];

const pct = (xs, q) => { const s = [...xs].sort((a, b) => a - b); return s[Math.min(s.length - 1, Math.floor(q * s.length))]; };

async function cookieFor(role) {
  if (role === "visitor") return "";
  const r = await fetch(BASE + "/api/auth/login", { method: "POST", headers: { "content-type": "application/json" }, body: JSON.stringify({ email: ACCOUNTS[role], password: PASSWORD }) });
  if (!r.ok) throw new Error(`sign-in ${role}: HTTP ${r.status}`);
  return r.headers.getSetCookie().map((c) => c.split(";")[0]).join("; ");
}

const rows = [];
let failed = false;
for (const role of ["visitor", "free", "admin"]) {
  if (role !== "visitor" && !PASSWORD) continue;
  let cookie;
  try { cookie = await cookieFor(role); } catch (e) { console.log(`${role}: ${e.message}`); failed = true; continue; }
  // All pages at once: N requests per round, spread over the pages, fired together.
  const t = [], st = new Map(), per = new Map();
  const t0 = Date.now();
  for (let r = 0; r < ROUNDS; r++) {
    await Promise.all(Array.from({ length: N }, async (_, i) => {
      const path = PAGES[i % PAGES.length];
      const s = Date.now();
      let code = 0;
      try { const res = await fetch(BASE + path, { headers: cookie ? { cookie } : {}, redirect: "manual", signal: AbortSignal.timeout(60_000) }); await res.arrayBuffer(); code = res.status; } catch { code = 0; }
      const ms = Date.now() - s;
      t.push(ms); st.set(code, (st.get(code) ?? 0) + 1);
      (per.get(path) ?? per.set(path, []).get(path)).push(ms);
    }));
  }
  const bad = [...st].filter(([c]) => c === 0 || c >= 500).reduce((a, [, n]) => a + n, 0);
  if (bad) failed = true;
  rows.push(`| ${role} | ${N * ROUNDS} | ${[...st].map(([c, n]) => `${c}×${n}`).join(" ")} | ${pct(t, 0.5)} | ${pct(t, 0.95)} | ${Math.max(...t)} | ${((Date.now() - t0) / 1000).toFixed(1)} |`);
  for (const [p, xs] of per) rows.push(`|  ↳ ${p} | ${xs.length} |  | ${pct(xs, 0.5)} | ${pct(xs, 0.95)} | ${Math.max(...xs)} |  |`);
}
console.log(`Load check ${BASE}: ${N} requests at once × ${ROUNDS} rounds\n\n| Role / page | Requests | Status | p50 ms | p95 ms | max ms | Total s |\n|---|---:|---|---:|---:|---:|---:|\n${rows.join("\n")}`);
process.exit(failed ? 1 : 0);
