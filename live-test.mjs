// Temporary stability test: anonymous timings + 20-user load, no browser needed.
const BASE = "https://10bonds.com";
const t = async (url) => { const s = performance.now(); let r; try { r = await fetch(BASE + url, { signal: AbortSignal.timeout(30000) }); await r.text(); } catch (e) { return { url, status: "ERR " + e.message, ms: Math.round(performance.now() - s) }; } return { url, status: r.status, ms: Math.round(performance.now() - s) }; };
const pct = (a, p) => a.length ? a.slice().sort((x, y) => x - y)[Math.min(a.length - 1, Math.floor(p * a.length))] : 0;
console.log("== single anonymous requests (twice: cold, warm)");
const terms = [["Short", 2], ["Medium", 4], ["Long", 10]];
const urls = ["/", "/api/health", "/api/bonds/frontier?currency=EUR", "/sitemap.xml", "/bonds/sitemap.xml", "/robots.txt",
  ...terms.flatMap(([, d]) => [`/api/bonds/slider?duration=${d}&currency=EUR&size=100k`,
    ...[3, 5, 7].map((y) => `/api/bonds?duration=${d}&ytm=${y}&risk=5&currency=EUR&size=100k&guard=1`)])];
for (const u of urls) { const a = await t(u), b = await t(u); console.log(`${u}\n   cold ${a.status} ${a.ms} ms | warm ${b.status} ${b.ms} ms`); }
console.log("== 20 concurrent users, " + (process.env.MINUTES || 8) + " min");
const end = Date.now() + (process.env.MINUTES || 8) * 60000;
const times = { page: [], api: [] }, errs = [];
const user = async () => { while (Date.now() < end) {
  const [, d] = terms[Math.floor(Math.random() * 3)];
  for (const [kind, u] of [["page", "/"], ["api", "/api/bonds/frontier?currency=EUR"], ["api", `/api/bonds/slider?duration=${d}&currency=EUR&size=100k`], ["api", `/api/bonds?duration=${d}&ytm=${3 + Math.floor(Math.random() * 5)}&risk=5&currency=EUR&size=100k&guard=1`]]) {
    const r = await t(u); (kind === "page" ? times.page : times.api).push(r.ms); if (!(r.status === 200)) errs.push(`${r.status} ${u}`);
    await new Promise((x) => setTimeout(x, 800 + Math.random() * 1500)); } } };
await Promise.all(Array.from({ length: 20 }, user));
console.log(`page n=${times.page.length} p50=${pct(times.page, .5)} p95=${pct(times.page, .95)} max=${Math.max(...times.page)} ms`);
console.log(`api  n=${times.api.length} p50=${pct(times.api, .5)} p95=${pct(times.api, .95)} max=${Math.max(...times.api)} ms`);
console.log(`non-200: ${errs.length}`, [...new Set(errs)].slice(0, 10));
