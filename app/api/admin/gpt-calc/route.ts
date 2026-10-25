import { NextResponse } from "next/server";
import { currentUser } from "@/lib/currentUser";
import { API_PROMPT_VERSION, apiPrompt, parseGptRatings } from "@/lib/gptRatings";
import { llmCallsToday, loadGptRatings, loadLlmSettings, logLlmCall, saveApiRating, saveLlmSettings } from "@/lib/gptRatingsDb";
import { PROVIDERS, askModel, keyPresent, type Provider } from "@/lib/llmProvider";

export const dynamic = "force-dynamic";
export const maxDuration = 45;

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
  const used = await llmCallsToday();
  return { settings, used, keyPresent: keyPresent(settings.provider), keyName: PROVIDERS[settings.provider].keyName, secretsUrl: SECRETS_URL, keyUrl: KEY_URLS[settings.provider] };
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
    await saveLlmSettings({ provider: p === "anthropic" || p === "openai" || p === "gemini" ? (p as Provider) : undefined, model: b.settings.model, dailyCap: typeof b.settings.dailyCap === "number" ? b.settings.dailyCap : undefined });
    return NextResponse.json(await status());
  }
  const isin = typeof b?.isin === "string" ? b.isin.trim().toUpperCase() : "";
  if (!ISIN.test(isin)) return NextResponse.json({ error: "Not a valid ISIN" }, { status: 400 });
  const st = await status();
  if (!st.keyPresent) return NextResponse.json({ error: `No API key yet: save ${st.keyName} as a secret (${SECRETS_URL}), then it works after the next deploy.`, missingKey: true, ...st }, { status: 503 });
  if (st.used >= st.settings.dailyCap) return NextResponse.json({ error: `Daily limit of ${st.settings.dailyCap} calls reached, try tomorrow (or raise the limit in the calculator settings).`, ...st }, { status: 429 });
  if (inFlight.has(isin)) return NextResponse.json({ error: "Already calculating this bond" }, { status: 409 });
  inFlight.add(isin);
  try {
    let text: string;
    try {
      text = await askModel(st.settings.provider, st.settings.model, apiPrompt(isin));
    } catch (e) {
      await logLlmCall(isin, st.settings.provider, st.settings.model, false).catch(() => {});
      const name = e instanceof Error && e.name === "TimeoutError" ? "The model took too long (30 s). Try again." : e instanceof Error ? e.message : "Call failed";
      return NextResponse.json({ error: name }, { status: 502 });
    }
    await logLlmCall(isin, st.settings.provider, st.settings.model, true).catch(() => {});
    const parsed = parseGptRatings(text)[isin];
    if (!parsed || !(parsed.rating || parsed.issuerRating) || ((parsed.rating === "NR") && (parsed.issuerRating === "NR" || !parsed.issuerRating))) {
      return NextResponse.json({ error: "The model gave no rating for this bond" }, { status: 422 });
    }
    await saveApiRating(isin, parsed, `${st.settings.provider}:${st.settings.model}`, API_PROMPT_VERSION);
    return NextResponse.json({ ok: true, ratings: await loadGptRatings(), used: st.used + 1, dailyCap: st.settings.dailyCap });
  } finally {
    inFlight.delete(isin);
  }
}
