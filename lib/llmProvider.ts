// Admin only (the owner, 25/10/2026): one-shot call to a language-model API, used by the BR / IR calculate button.
// The key is read from a server secret and never leaves the server. Only the ISIN prompt is sent, nothing about customers.

export type Provider = "gemini" | "openai" | "anthropic";
export const PROVIDERS: Record<Provider, { label: string; keyName: string; defaultModel: string }> = {
  // free tier (Google AI Studio key); model id from the Gemini pricing page, 25/10/2026
  gemini: { label: "Google Gemini (free tier)", keyName: "GEMINI_API_KEY", defaultModel: "gemini-3.6-flash" },
  openai: { label: "OpenAI", keyName: "OPENAI_API_KEY", defaultModel: "gpt-4o" },
  anthropic: { label: "Anthropic", keyName: "ANTHROPIC_API_KEY", defaultModel: "claude-sonnet-5-5" },
};

export const keyPresent = (p: Provider) => Boolean(process.env[PROVIDERS[p].keyName]);

// Free tiers allow only a few calls per minute: Gemini calls go one after the other, at least 5 s apart.
let geminiLane: Promise<unknown> = Promise.resolve();
let geminiLast = 0;
const GEMINI_GAP_MS = 5000;
function inGeminiLane<T>(fn: () => Promise<T>): Promise<T> {
  const run = geminiLane.then(async () => {
    const wait = geminiLast + GEMINI_GAP_MS - Date.now();
    if (wait > 0) await new Promise((r) => setTimeout(r, wait));
    try { return await fn(); } finally { geminiLast = Date.now(); }
  });
  geminiLane = run.catch(() => {});
  return run;
}

/** Sends the prompt and returns the model's text; throws a plain-language Error. */
export async function askModel(provider: Provider, model: string, prompt: string, system = ""): Promise<string> {
  const key = process.env[PROVIDERS[provider].keyName];
  if (!key) throw new Error(`${PROVIDERS[provider].keyName} is not set`);
  if (provider === "gemini") return inGeminiLane(() => askGemini(key, model, prompt, system));
  const signal = AbortSignal.timeout(60000);
  const res =
    provider === "openai"
      ? await fetch("https://api.openai.com/v1/chat/completions", {
          method: "POST",
          headers: { "Content-Type": "application/json", Authorization: `Bearer ${key}` },
          body: JSON.stringify({ model, temperature: 0, max_tokens: 2000, messages: [...(system ? [{ role: "system", content: system }] : []), { role: "user", content: prompt }] }),
          signal,
        })
      : await fetch("https://api.anthropic.com/v1/messages", {
          method: "POST",
          headers: { "Content-Type": "application/json", "x-api-key": key, "anthropic-version": "2023-06-01" },
          body: JSON.stringify({ model, max_tokens: 2000, ...(system ? { system } : {}), messages: [{ role: "user", content: prompt }] }),
          signal,
        });
  if (!res.ok) {
    const j = await res.json().catch(() => null);
    const msg = (j?.error?.message as string | undefined) ?? res.statusText;
    throw new Error(`${PROVIDERS[provider].label} said ${res.status}: ${String(msg).slice(0, 160)}`);
  }
  const j = await res.json();
  const text: unknown = provider === "openai" ? j?.choices?.[0]?.message?.content : j?.content?.[0]?.text;
  if (typeof text !== "string" || !text.trim()) throw new Error("Empty answer from the model");
  return text;
}

async function askGemini(key: string, model: string, prompt: string, system: string): Promise<string> {
  const url = `https://generativelanguage.googleapis.com/v1beta/models/${encodeURIComponent(model)}:generateContent`;
  for (let attempt = 0; attempt < 3; attempt++) {
    const res = await fetch(url, {
      method: "POST",
      headers: { "Content-Type": "application/json", "x-goog-api-key": key },
      body: JSON.stringify({ ...(system ? { systemInstruction: { parts: [{ text: system }] } } : {}), contents: [{ parts: [{ text: prompt }] }], generationConfig: { temperature: 0, maxOutputTokens: 2048 } }),
      signal: AbortSignal.timeout(60000),
    });
    if (res.status === 429) {
      if (attempt < 2) { await new Promise((r) => setTimeout(r, 20000)); continue; } // per-minute limit: two retries after a pause
      throw new Error("Free limit of Gemini reached (per minute or per day). Wait a minute, or try tomorrow.");
    }
    if (!res.ok) {
      const j = await res.json().catch(() => null);
      throw new Error(`Gemini said ${res.status}: ${String(j?.error?.message ?? res.statusText).slice(0, 160)}`);
    }
    const j = await res.json();
    const text = (j?.candidates?.[0]?.content?.parts as { text?: string }[] | undefined)?.map((p) => p.text ?? "").join("");
    if (!text?.trim()) throw new Error("Empty answer from the model");
    return text;
  }
  throw new Error("Gemini did not answer");
}
