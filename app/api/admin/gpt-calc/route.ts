import { NextResponse } from "next/server";
import { currentUser } from "@/lib/currentUser";
import { BONDS_SKILL } from "@/lib/bondsSkill";
import { bondsPrompt, parseBondsJson, skillVersion, systemFor, toCells } from "@/lib/bondsRun";
import { llmCallsLastMinute, llmCallsToday, loadGptRatings, loadLlmSettings, logLlmCall, saveBondsRun, saveLlmSettings } from "@/lib/gptRatingsDb";
import { PROVIDERS, askModelFull, keyPresent, type Provider } from "@/lib/llmProvider";

export const dynamic = "force-dynamic";
export const maxDuration = 300;

const KEY_URLS = { gemini: "https://aistudio.google.com/apikey", openai: "https://platform.openai.com/api-keys", anthropic: "https://console.anthropic.com/settings/keys" };
const SECRETS_URL = "https://github.com/1903978-prog/10bonds/settings/secrets/actions/new";
const ISIN = /^[A-Z]{2}[A-Z0-9]{9}[0-9]$/;
const inFlight = new Set<string>();

async function admin() {
  const u = await currentUser();
  return u?.isAdmin && u.adminState === "ok" ? u : null;
}

async function status() {
  const settings = await loadLlmSettings();
  const [used, perMinute] = await Promise.all([llmCallsToday(settings.provider), llmCallsLastMinute(settings.provider)]);
  return { settings, used, perMinute, perMinuteLimit: 15, keyPresent: keyPresent(settings.provider), keyName: PROVIDERS[settings.provider].keyName, secretsUrl: SECRETS_URL, keyUrl: KEY_URLS[settings.provider] };
}

/** Admin only: calculator settings and today's usage. */
export async function GET() {
  if (!(await admin())) return NextResponse.json({ error: "Not found" }, { status: 404 });
  return NextResponse.json(await status(), { headers: { "Cache-Control": "no-store" } });
}

/** Admin only. `{ settings }` changes provider / model / daily cap; `{ isin }` asks the model for that one bond's IR and BR and saves the answer. */
export async function POST(req: Request) {
  if (!(await admin())) return NextResponse.json({ error: "Not found" }, { status: 404 });
  const b = await req.json().catch(() => null);
  if (b?.settings) {
    const p = b.settings.provider;
    await saveLlmSettings({ provider: p === "anthropic" || p === "openai" || p === "gemini" ? (p as Provider) : undefined, model: b.settings.model, dailyCap: typeof b.settings.dailyCap === "number" ? b.settings.dailyCap : undefined, instructions: typeof b.settings.instructions === "string" ? b.settings.instructions : undefined });
    return NextResponse.json(await status());
  }
  const isin = typeof b?.isin === "string" ? b.isin.trim().toUpperCase() : "";
  if (!ISIN.test(isin)) return NextResponse.json({ error: "Not a valid ISIN" }, { status: 400 });
  const st = await status();
  if (!st.keyPresent) return NextResponse.json({ error: `No API key yet: save ${st.keyName} as a secret (${SECRETS_URL}), then it works after the next deploy.`, missingKey: true, ...st }, { status: 503 });
  if (st.used >= st.settings.dailyCap) return NextResponse.json({ error: `Daily limit of ${st.settings.dailyCap} calls reached, try tomorrow (or raise the limit in the calculator settings).`, ...st }, { status: 429 });
  if (inFlight.has(isin)) return NextResponse.json({ error: "Already calculating this bond" }, { status: 409 });
  inFlight.add(isin);
  // The answer is long and can take minutes: the reply is streamed (a space every few seconds keeps the connection open) and ends with one JSON object.
  const enc = new TextEncoder();
  const stream = new ReadableStream({
    async start(ctl) {
      const beat = setInterval(() => { try { ctl.enqueue(enc.encode(" ")); } catch { /* closed */ } }, 8000);
      const finish = (status: number, body: unknown) => { clearInterval(beat); ctl.enqueue(enc.encode(JSON.stringify({ status, ...(body as object) }))); ctl.close(); };
      try {
        const skill = st.settings.instructions.trim() || BONDS_SKILL;
        let out: { text: string; grounded: boolean };
        try {
          out = await askModelFull(st.settings.provider, st.settings.model, bondsPrompt(isin), systemFor(skill), true);
        } catch (e) {
          await logLlmCall(isin, st.settings.provider, st.settings.model, false).catch(() => {});
          const name = e instanceof Error && e.name === "TimeoutError" ? "The model took too long (4 minutes). Try again." : e instanceof Error ? e.message : "Call failed";
          return finish(/limit|quota/i.test(name) ? 429 : 502, { error: name, ...(await status().catch(() => ({}))) });
        }
        await logLlmCall(isin, st.settings.provider, st.settings.model, true).catch(() => {});
        const parsed = parseBondsJson(out.text);
        const cells = toCells(parsed);
        const ok = !!parsed && !!(cells.ir || cells.br || cells.riskPay);
        await saveBondsRun({ isin, provider: st.settings.provider, model: st.settings.model, skillVersion: skillVersion(skill), grounded: out.grounded, raw: out.text, parsed, cells });
        const note = [ok ? "" : "Not parsed: the answer had no usable JSON block, so the table was not changed. The full text is saved.", out.grounded || st.settings.provider !== "gemini" ? "" : "Google Search was not available on this key, so prices and news may be out of date."].filter(Boolean).join(" ");
        return finish(200, { ok: true, isin, answer: out.text, parsedOk: ok, grounded: out.grounded, note, ratings: await loadGptRatings(), used: st.used + 1, dailyCap: st.settings.dailyCap });
      } catch (e) {
        return finish(500, { error: e instanceof Error ? e.message : "Calculation failed" });
      } finally {
        inFlight.delete(isin);
      }
    },
  });
  return new Response(stream, { headers: { "Content-Type": "application/json", "Cache-Control": "no-store" } });
}
