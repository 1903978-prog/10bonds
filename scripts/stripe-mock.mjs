// A tiny stand-in for Stripe's API, for the local billing check only. Records what the app created.
import http from "node:http";
const state = { prices: [], products: [], webhooks: [], customers: [], sessions: [], portalSessions: [], subs: {} };
let n = 0;
const id = (p) => `${p}_${++n}`;
const readBody = (req) => new Promise((r) => { let b = ""; req.on("data", (c) => (b += c)); req.on("end", () => r(new URLSearchParams(b))); });
http.createServer(async (req, res) => {
  const u = new URL(req.url, "http://x");
  const q = req.method === "GET" ? u.searchParams : await readBody(req);
  const send = (o, code = 200) => { res.writeHead(code, { "Content-Type": "application/json" }); res.end(JSON.stringify(o)); };
  if (u.pathname.startsWith("/pay/") || u.pathname.startsWith("/portal/")) { res.writeHead(200, { "Content-Type": "text/html" }); return res.end(`<h1>mock ${u.pathname}</h1>`); }
  if ((req.headers.authorization ?? "") !== "Bearer sk_test_local") return send({ error: { message: "bad key" } }, 401);
  const p = u.pathname;
  if (p === "/__state") return send(state);
  if (p === "/v1/prices" && req.method === "GET") { const keys = q.getAll("lookup_keys[]").concat(q.getAll("lookup_keys[0]"), q.getAll("lookup_keys[1]")); return send({ data: state.prices.filter((x) => keys.includes(x.lookup_key)) }); }
  if (p === "/v1/products") { const o = { id: id("prod"), name: q.get("name") }; state.products.push(o); return send(o); }
  if (p === "/v1/prices") { const o = { id: id("price"), product: q.get("product"), lookup_key: q.get("lookup_key"), unit_amount: Number(q.get("unit_amount")), currency: q.get("currency"), interval: q.get("recurring[interval]") }; state.prices.push(o); return send(o); }
  if (p.startsWith("/v1/prices/")) return send(state.prices.find((x) => x.id === p.split("/")[3]));
  if (p === "/v1/billing_portal/configurations") return send({ id: id("bpc") });
  if (p === "/v1/webhook_endpoints" && req.method === "GET") return send({ data: state.webhooks });
  if (p === "/v1/webhook_endpoints") { const o = { id: id("we"), url: q.get("url"), secret: "whsec_local_" + n, status: "enabled", events: q.getAll("enabled_events[0]") }; state.webhooks.push(o); return send(o); }
  if (p.startsWith("/v1/webhook_endpoints/") && req.method === "DELETE") { state.webhooks = state.webhooks.filter((x) => x.id !== p.split("/")[3]); return send({ deleted: true }); }
  if (p === "/v1/customers") { const o = { id: id("cus"), email: q.get("email"), user_id: q.get("metadata[user_id]") }; state.customers.push(o); return send(o); }
  if (p === "/v1/checkout/sessions") { const o = { id: id("cs"), customer: q.get("customer"), price: q.get("line_items[0][price]"), user_id: q.get("subscription_data[metadata][user_id]"), success: q.get("success_url"), url: `http://127.0.0.1:3312/pay/${n}` }; state.sessions.push(o); return send(o); }
  if (p === "/v1/billing_portal/sessions") { const o = { id: id("bps"), customer: q.get("customer"), configuration: q.get("configuration"), url: `http://127.0.0.1:3312/portal/${n}` }; state.portalSessions.push(o); return send(o); }
  if (p.startsWith("/v1/subscriptions/")) return send(state.subs[p.split("/")[3]] ?? {}, state.subs[p.split("/")[3]] ? 200 : 404);
  if (p === "/__sub" && req.method === "POST") { const o = JSON.parse(q.get("json")); state.subs[o.id] = o; return send(o); }
  send({ error: { message: `no mock for ${req.method} ${p}` } }, 404);
}).listen(3312, () => console.log("stripe mock on 3312"));
