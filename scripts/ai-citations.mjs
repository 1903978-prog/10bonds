// Weekly AI citation test (GitHub Actions): asks AI assistants with web search the fixed question set and records
// which sites each answer cites, and whether 10bonds.com is one of them. Each assistant runs only when its API key
// is set (PERPLEXITY_API_KEY, OPENAI_API_KEY, ANTHROPIC_API_KEY). Stored in app.settings as seo_citation_test.
import postgres from "postgres";
import { accountsUrl } from "../lib/pgUrl.ts";
import { TEST_QUESTIONS } from "../lib/seo/testQuestions.ts";

const OURS = /(^|\.)10bonds\.com$/;
const host = (u) => { try { return new URL(u).hostname.replace(/^www\./, ""); } catch { return null; } };
const uniq = (xs) => [...new Set(xs.filter(Boolean))];

async function post(url, headers, body) {
  const r = await fetch(url, { method: "POST", headers: { "Content-Type": "application/json", ...headers }, body: JSON.stringify(body), signal: AbortSignal.timeout(120_000) });
  const j = await r.json().catch(() => ({}));
  if (!r.ok) throw new Error(j?.error?.message ?? `HTTP ${r.status}`);
  return j;
}

const ASSISTANTS = [
  {
    id: "perplexity", name: "Perplexity", key: process.env.PERPLEXITY_API_KEY,
    ask: async (key, q) => {
      const j = await post("https://api.perplexity.ai/chat/completions", { Authorization: `Bearer ${key}` }, { model: "sonar", messages: [{ role: "user", content: q }] });
      return { text: j.choices?.[0]?.message?.content ?? "", urls: [...(j.citations ?? []), ...(j.search_results ?? []).map((s) => s.url)] };
    },
  },
  {
    id: "chatgpt", name: "ChatGPT", key: process.env.OPENAI_API_KEY,
    ask: async (key, q) => {
      const j = await post("https://api.openai.com/v1/responses", { Authorization: `Bearer ${key}` }, { model: process.env.OPENAI_MODEL ?? "gpt-4.1-mini", tools: [{ type: "web_search" }], input: q });
      const parts = (j.output ?? []).flatMap((o) => o.content ?? []);
      return { text: parts.map((p) => p.text ?? "").join("\n"), urls: parts.flatMap((p) => (p.annotations ?? []).map((a) => a.url)) };
    },
  },
  {
    id: "claude", name: "Claude", key: process.env.ANTHROPIC_API_KEY,
    ask: async (key, q) => {
      const j = await post("https://api.anthropic.com/v1/messages", { "x-api-key": key, "anthropic-version": "2023-06-01" }, {
        model: process.env.ANTHROPIC_MODEL ?? "claude-haiku-5-5", max_tokens: 1024,
        tools: [{ type: "web_search_20250305", name: "web_search", max_uses: 3 }], messages: [{ role: "user", content: q }],
      });
      const blocks = j.content ?? [];
      return {
        text: blocks.map((b) => b.text ?? "").join("\n"),
        urls: [...blocks.flatMap((b) => (b.citations ?? []).map((c) => c.url)), ...blocks.filter((b) => b.type === "web_search_tool_result" && Array.isArray(b.content)).flatMap((b) => b.content.map((c) => c.url))],
      };
    },
  },
];

const url = accountsUrl(process.env.ACCOUNTS_DATABASE_URL, process.env.DATABASE_URL);
const sql = postgres(url, { max: 1, ssl: url.includes("localhost") || url.includes("127.0.0.1") ? false : "require", prepare: false });
// After a deploy it runs only when the last test is a week old (or none ran yet); the weekly schedule always runs.
if (process.env.ONLY_IF_STALE) {
  const [last] = await sql`select value from app.settings where key = 'seo_citation_test'`;
  const at = last ? Date.parse(JSON.parse(last.value).at) : 0;
  if (Date.now() - at < 6 * 86_400_000) { console.log("Tested in the last 6 days: skipped."); await sql.end(); process.exit(0); }
}

const results = [];
for (const a of ASSISTANTS.filter((x) => x.key)) {
  const answers = [];
  for (const { market, q } of TEST_QUESTIONS) {
    try {
      const { text, urls } = await a.ask(a.key, q);
      const domains = uniq(urls.map(host));
      answers.push({ market, q, cited: domains.some((d) => OURS.test(d)) || /10bonds/i.test(text), domains: domains.slice(0, 8) });
    } catch (e) {
      answers.push({ market, q, cited: false, domains: [], error: String(e.message).slice(0, 160) });
    }
  }
  const ok = answers.filter((x) => !x.error);
  results.push({ id: a.id, name: a.name, asked: answers.length, answered: ok.length, cited: ok.filter((x) => x.cited).length, answers });
  console.log(`${a.name}: cited in ${ok.filter((x) => x.cited).length} of ${ok.length} answers (${answers.length - ok.length} errors)`);
}
if (!results.length) { console.log("No AI API key set: nothing tested."); await sql.end(); process.exit(0); }

// Which other sites the assistants cite most: the competitors to beat.
const counts = {};
for (const r of results) for (const x of r.answers) for (const d of x.domains) if (!OURS.test(d)) counts[d] = (counts[d] ?? 0) + 1;
const competitors = Object.entries(counts).sort((a, b) => b[1] - a[1]).slice(0, 15).map(([domain, n]) => ({ domain, n }));

await sql`insert into app.settings (key, value) values ('seo_citation_test', ${JSON.stringify({ at: new Date().toISOString(), assistants: results, competitors })})
  on conflict (key) do update set value = excluded.value, updated_at = now()`;
await sql.end();
