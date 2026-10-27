import { fromDomain, markEmailDomainVerified } from "./email";

// Makes sure the sending domain exists in Resend and returns the DNS records it needs. Server only.
export type DnsRecord = { type: string; name: string; value: string; priority: number | null; status: string };
export type DomainState = { configured: false } | { configured: true; domain: string; status: string; records: DnsRecord[]; error?: string };

async function resend<T>(method: string, path: string, body?: unknown): Promise<T> {
  const r = await fetch(`https://api.resend.com${path}`, {
    method,
    headers: { Authorization: `Bearer ${process.env.RESEND_API_KEY}`, "Content-Type": "application/json" },
    body: body ? JSON.stringify(body) : undefined,
    signal: AbortSignal.timeout(10_000),
  });
  if (!r.ok) throw new Error(`Resend answered HTTP ${r.status}`);
  return r.json() as Promise<T>;
}

export async function emailDomainState(): Promise<DomainState> {
  const domain = fromDomain() ?? "10bonds.com";
  if (!process.env.RESEND_API_KEY) return { configured: false };
  try {
    const list = await resend<{ data: { id: string; name: string; status: string }[] }>("GET", "/domains");
    let found = list.data.find((d) => d.name === domain);
    if (!found) found = await resend<{ id: string; name: string; status: string }>("POST", "/domains", { name: domain, region: "eu-west-1" });
    let d = await resend<{ status: string; records: { type: string; name: string; value: string; priority?: number; status: string }[] }>("GET", `/domains/${found.id}`);
    if (d.status !== "verified") {
      await resend("POST", `/domains/${found.id}/verify`).catch(() => {});
      d = await resend("GET", `/domains/${found.id}`);
    }
    markEmailDomainVerified(d.status === "verified");
    return { configured: true, domain, status: d.status, records: d.records.map((x) => ({ type: x.type, name: x.name, value: x.value, priority: x.priority ?? null, status: x.status })) };
  } catch (e) {
    // A send-only key may not read the domain list (401): that is "cannot check", not "off". Sending itself works.
    if (/HTTP 401/.test((e as Error).message)) return { configured: true, domain, status: "send-only", records: [] };
    return { configured: true, domain, status: "unknown", records: [], error: (e as Error).message };
  }
}
