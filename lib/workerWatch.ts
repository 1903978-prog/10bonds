import { esc, sendEmail } from "@/lib/email";
import { liveCheckRecipient } from "@/lib/liveCheckAlert";

/** The credit worker on the Lenovo must be heard from at least every few minutes (it calls /claim and /heartbeat constantly). */
export const OFFLINE_AFTER_MS = 10 * 60_000;
const CHECK_EVERY_MS = 5 * 60_000;

type State = { lastSeen: number; alerted: boolean };
const g = globalThis as unknown as { __workerWatch?: State };
const state = (): State => (g.__workerWatch ??= { lastSeen: Date.now(), alerted: false });

/** Called by every worker request. Memory only: no database work, so it adds nothing to the Neon bill. */
export function noteWorkerSeen(now: number = Date.now()) { state().lastSeen = now; }

/** Pure decision: one alert per outage, one notice when it is back. Booting counts as "seen", so a restart of the site alone never alerts. */
export function watchDecision(s: State, now: number): "offline" | "recovered" | null {
  const silent = now - s.lastSeen;
  if (silent > OFFLINE_AFTER_MS && !s.alerted) return "offline";
  if (silent <= OFFLINE_AFTER_MS && s.alerted) return "recovered";
  return null;
}

async function tick() {
  const s = state(), now = Date.now();
  const d = watchDecision(s, now);
  if (!d) return;
  const mins = Math.round((now - s.lastSeen) / 60_000);
  const subject = d === "offline" ? "10BONDS credit worker is OFFLINE" : "10BONDS credit worker is back online";
  const text = d === "offline"
    ? `The Lenovo credit worker has not contacted the site for ${mins} minutes. Check that the Lenovo is on and the worker window is open. Status: https://10bonds.com/api/credit-worker/status`
    : "The Lenovo credit worker is connected again.";
  const r = await sendEmail(liveCheckRecipient(), subject, `<p>${esc(text)}</p>`, text).catch(() => "failed");
  if (r === "sent") s.alerted = d === "offline";
  else console.error("[worker-watch] alert not sent:", String(r));
}

/** One timer, memory only. Production only. */
export function startWorkerWatch() {
  if (process.env.NODE_ENV !== "production") return;
  setInterval(() => { tick().catch((e) => console.error("[worker-watch]", (e as Error).message)); }, CHECK_EVERY_MS).unref();
}
