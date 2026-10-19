"use client";

import { useCallback, useEffect, useState } from "react";
import { api, Badge, btn, btnLight, card, day, ErrorNote, input, Steps, Table, when } from "./ui";

type Data = {
  log: { guideId: number | null; url: string; channel: string; ok: boolean; detail: string | null; at: string }[];
  indexnow: boolean;
  google: { serviceAccount: string | null; site: string | null };
  linkedin: { app: boolean; connected: boolean; until: string | null; renews: boolean; org: string | null; redirect: string };
  x: boolean;
};

const SECRETS = "https://github.com/1903978-prog/10bonds/settings/secrets/actions/new";
const DEPLOY = "https://github.com/1903978-prog/10bonds/actions/workflows/deploy.yml";
const NAMES: Record<string, string> = { indexnow: "Bing (IndexNow)", google: "Google", linkedin: "LinkedIn", x: "X" };

const On = ({ on, label }: { on: boolean; label?: string }) => <Badge tone={on ? "green" : "gray"}>{label ?? (on ? "On" : "Not set up")}</Badge>;

/**
 * New guides go out by themselves: search engines on every publish, LinkedIn and X once per new guide.
 * Forums and Reddit are deliberately not here: automatic posts there are treated as spam.
 */
export default function Sharing() {
  const [data, setData] = useState<Data | null>(null);
  const [org, setOrg] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [msg, setMsg] = useState<string | null>(null);

  const load = useCallback(async () => {
    try {
      setData(await api<Data>("/api/admin/seo/sharing"));
    } catch (e) {
      setError((e as Error).message);
    }
  }, []);
  useEffect(() => {
    load();
    const li = new URLSearchParams(window.location.search).get("linkedin");
    if (li === "connected") setMsg("LinkedIn connected.");
    else if (li) setError(`LinkedIn: ${li}`);
  }, [load]);

  async function call(body: Record<string, unknown>, done: string) {
    setBusy(true);
    setError(null);
    setMsg(null);
    try {
      const r = await api<{ pages?: number }>("/api/admin/seo/sharing", body);
      setMsg(r.pages ? `${done} (${r.pages} pages).` : done);
      await load();
    } catch (e) {
      setError((e as Error).message);
    } finally {
      setBusy(false);
    }
  }

  if (!data) return <div className={card}><ErrorNote error={error} />{!error && <p className="text-sm text-mute">Loading…</p>}</div>;
  const li = data.linkedin;
  return (
    <div className="space-y-5">
      <section className={card}>
        <h2 className="text-[20px] font-semibold">Automatic sharing</h2>
        <p className="mt-1 text-sm text-mute">
          When you publish a guide, it is sent to Bing and Google at once, and posted once on the 10BONDS LinkedIn page and X. Forums and Reddit are never posted to automatically.
        </p>
        <div className="mt-4 grid gap-3 sm:grid-cols-2">
          <div className="rounded-2xl bg-canvas p-4 text-sm">
            <div className="flex items-center justify-between"><span className="font-medium">Bing, Yandex (IndexNow)</span><On on={data.indexnow} /></div>
            <p className="mt-1 text-xs text-mute">Nothing to set up.</p>
          </div>
          <div className="rounded-2xl bg-canvas p-4 text-sm">
            <div className="flex items-center justify-between"><span className="font-medium">Google (sitemap)</span><On on={!!data.google.serviceAccount && !!data.google.site} /></div>
            <p className="mt-1 text-xs text-mute">
              {data.google.serviceAccount && data.google.site ? `Uses ${data.google.serviceAccount}; it needs "Full" permission in Search Console.` : "Set up the Google connection in the Search performance tab first."}
            </p>
          </div>
          <div className="rounded-2xl bg-canvas p-4 text-sm">
            <div className="flex items-center justify-between"><span className="font-medium">LinkedIn page</span><On on={li.connected && !!li.org} /></div>
            <p className="mt-1 text-xs text-mute">{li.connected ? `Connected${li.renews ? "" : ` until ${day(li.until)}, then click Connect again`}.` : li.app ? "Click Connect LinkedIn below." : "Needs the steps below."}</p>
          </div>
          <div className="rounded-2xl bg-canvas p-4 text-sm">
            <div className="flex items-center justify-between"><span className="font-medium">X</span><On on={data.x} /></div>
            <p className="mt-1 text-xs text-mute">{data.x ? "Keys set." : "Needs the steps below."}</p>
          </div>
        </div>
        <button className={`${btnLight} mt-4`} disabled={busy || !data.indexnow} onClick={() => call({ op: "send_all" }, "All pages sent to the search engines")}>
          Send all pages to the search engines now
        </button>
        {msg && <p className="mt-3 rounded-xl bg-green-50 px-4 py-3 text-sm text-green-800">{msg}</p>}
        <ErrorNote error={error} />
      </section>

      <section className={card}>
        <div className="flex flex-wrap items-center justify-between gap-2">
          <h2 className="text-[20px] font-semibold">LinkedIn</h2>
          <div className="flex gap-2">
            {li.app && <button className={btn} onClick={() => window.location.assign("/api/admin/social/linkedin")}>{li.connected ? "Connect again" : "Connect LinkedIn"}</button>}
            {li.connected && <button className={btnLight} disabled={busy} onClick={() => call({ op: "linkedin_disconnect" }, "LinkedIn disconnected.")}>Disconnect</button>}
          </div>
        </div>
        {!li.app && (
          <Steps
            steps={[
              { text: "Create a LinkedIn app, linked to the 10BONDS page:", url: "https://www.linkedin.com/developers/apps/new" },
              { text: 'In the app, open "Products" and request "Community Management API" (LinkedIn reviews it).', url: "https://www.linkedin.com/developers/apps" },
              { text: `In the app's "Auth" tab, add this redirect URL: ${li.redirect}` },
              { text: 'Add two secrets, LINKEDIN_CLIENT_ID and LINKEDIN_CLIENT_SECRET (from the "Auth" tab), here:', url: SECRETS },
              { text: 'Redeploy: click "Run workflow" here, then come back and click Connect LinkedIn.', url: DEPLOY },
            ]}
          />
        )}
        <div className="mt-4 flex flex-wrap items-end gap-2">
          <label className="min-w-[16rem] flex-1 text-sm">
            <span className="font-medium">10BONDS page</span> {li.org && <span className="text-xs text-mute">(page {li.org})</span>}
            <input className={input} value={org} onChange={(e) => setOrg(e.target.value)} placeholder="https://www.linkedin.com/company/12345678/admin/" />
            <span className="mt-1 block text-xs text-mute">Open your page as admin and paste its address (the one with the number).</span>
          </label>
          <button className={btn} disabled={busy || !org.trim()} onClick={() => call({ op: "linkedin_org", org }, "LinkedIn page saved.")}>Save</button>
        </div>
      </section>

      {!data.x && (
        <section className={card}>
          <h2 className="text-[20px] font-semibold">X</h2>
          <Steps
            steps={[
              { text: "Sign in with the 10BONDS X account and open the developer portal (the free plan can post):", url: "https://developer.x.com/en/portal/dashboard" },
              { text: 'In your app, "User authentication settings": set app permissions to "Read and write".' },
              { text: 'In "Keys and tokens": copy the API Key and Secret, then generate the Access Token and Secret.' },
              { text: "Add four secrets, X_API_KEY, X_API_SECRET, X_ACCESS_TOKEN and X_ACCESS_TOKEN_SECRET, here:", url: SECRETS },
              { text: 'Redeploy: click "Run workflow" here.', url: DEPLOY },
            ]}
          />
        </section>
      )}

      <section className={card}>
        <h2 className="text-[20px] font-semibold">What was sent</h2>
        {data.log.length === 0 ? <p className="mt-2 text-sm text-mute">Nothing yet: it starts with the next guide you publish.</p> : (
          <Table head={["When", "Where", "Page", "Result"]} min="40rem">
            {data.log.map((r, i) => (
              <tr key={i} className="border-t border-line align-top">
                <td className="py-2 pr-3 whitespace-nowrap text-mute">{when(r.at)}</td>
                <td className="py-2 pr-3">{NAMES[r.channel] ?? r.channel}</td>
                <td className="py-2 pr-3 break-all">{r.url.replace(/^https?:\/\/[^/]+/, "")}</td>
                <td className="py-2 pr-3">
                  <Badge tone={r.ok ? "green" : "red"}>{r.ok ? "Sent" : "Failed"}</Badge>
                  {r.detail && <span className="ml-2 break-all text-xs text-mute">{/^https:\/\//.test(r.detail) ? <a href={r.detail} target="_blank" rel="noopener noreferrer" className="text-accent">view post</a> : r.detail}</span>}
                </td>
              </tr>
            ))}
          </Table>
        )}
      </section>
    </div>
  );
}
