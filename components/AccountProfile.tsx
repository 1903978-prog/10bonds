"use client";

import Link from "next/link";
import { useState } from "react";
import { ManageButton, PlanButton } from "@/components/PlanButton";
import { NEWSLETTER_TEXT, type NewsletterLang } from "@/lib/newsletterText";
import { euro, PLAN_NAMES, priceCents, type Interval, type PaidPlan } from "@/lib/plans";

type Props = {
  email: string;
  username: string | null;
  storedPlan: "free" | "plus" | "premium" | "pro";
  premiumUntil: string | null;
  subscription: { status: string; renewsAt: string | null; cancelAtEnd: boolean; interval: Interval | null } | null;
  hasBilling: boolean;
  proApproved: boolean;
  payOn: boolean;
  newsletter: boolean;
  lang: NewsletterLang;
};

const fmt = (iso: string) => new Date(iso).toLocaleDateString("en-GB", { day: "numeric", month: "long", year: "numeric" });
const card = "rounded-[28px] bg-white p-6 shadow-[0_2px_20px_rgba(0,0,0,0.04)] sm:p-8";
const RANK: Record<string, number> = { free: 0, plus: 1, premium: 2, pro: 3 };

async function post(url: string, body: unknown): Promise<{ ok: boolean; error?: string; [k: string]: unknown }> {
  try {
    const r = await fetch(url, { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(body) });
    const j = await r.json().catch(() => ({}));
    return r.ok ? { ok: true, ...j } : { ok: false, error: j.error || "Something went wrong. Please try again." };
  } catch {
    return { ok: false, error: "Something went wrong. Please try again." };
  }
}

export default function AccountProfile(p: Props) {
  const sub = p.subscription;
  const [plan, setPlan] = useState<PaidPlan>(p.storedPlan === "free" ? "plus" : (p.storedPlan as PaidPlan));
  const [interval, setInterval] = useState<Interval>(sub?.interval ?? "month");
  const [busy, setBusy] = useState("");
  const [msg, setMsg] = useState<{ ok: boolean; text: string } | null>(null);
  const [confirmErase, setConfirmErase] = useState(false);
  const [deleteText, setDeleteText] = useState("");
  const [showDelete, setShowDelete] = useState(false);
  const [news, setNews] = useState(p.newsletter);
  const nt = NEWSLETTER_TEXT[p.lang];
  const trial = p.premiumUntil && new Date(p.premiumUntil).getTime() > Date.now() && p.storedPlan !== "premium" && p.storedPlan !== "pro" ? p.premiumUntil : null;
  const plans: PaidPlan[] = p.proApproved ? ["plus", "premium", "pro"] : ["plus", "premium"];
  const same = sub && p.storedPlan === plan && sub.interval === interval;

  async function run(key: string, fn: () => Promise<{ ok: boolean; error?: string }>, okText: string, reload = true) {
    setBusy(key);
    setMsg(null);
    const r = await fn();
    setBusy("");
    if (!r.ok) return setMsg({ ok: false, text: r.error ?? "Something went wrong." });
    setMsg({ ok: true, text: okText });
    if (reload) setTimeout(() => window.location.reload(), 900);
  }

  return (
    <div className="mx-auto max-w-2xl space-y-5" data-testid="account-page">
      <div className={card}>
        <div className="flex items-center gap-4">
          <span className="flex h-12 w-12 shrink-0 items-center justify-center rounded-full bg-accent/10 text-lg font-semibold text-accent">
            {(p.username || p.email).slice(0, 1).toUpperCase()}
          </span>
          <div className="min-w-0">
            <h1 className="truncate text-[24px] font-semibold tracking-tight">{p.username || "Your profile"}</h1>
            <p className="truncate text-sm text-mute">{p.email}</p>
          </div>
        </div>
        <p className="mt-5 text-[15px]" data-testid="current-plan">
          Plan: <strong>{p.storedPlan === "free" ? "Free" : PLAN_NAMES[p.storedPlan as PaidPlan]}</strong>
          {sub?.interval && <span className="text-mute"> · billed {sub.interval === "year" ? "yearly" : "monthly"}</span>}
        </p>
        {trial && <p className="mt-1 text-sm text-mute">Free Premium until {fmt(trial)}.</p>}
        {sub?.renewsAt && (
          <p className="mt-1 text-sm text-mute">{sub.cancelAtEnd ? `Ends on ${fmt(sub.renewsAt)}. You will not be charged again.` : `Renews on ${fmt(sub.renewsAt)}.`}</p>
        )}
        <div className="mt-4 flex items-center justify-between gap-4 border-t border-line pt-4">
          <div className="min-w-0">
            <p className="text-[15px] font-medium">{nt.label}</p>
            <p className="text-xs text-mute">{nt.hint}</p>
          </div>
          <button
            type="button"
            role="switch"
            aria-checked={news}
            aria-label={`${nt.label}: ${news ? nt.on : nt.off}`}
            data-testid="profile-newsletter"
            disabled={busy !== ""}
            onClick={async () => {
              const next = !news;
              setNews(next);
              setBusy("newsletter");
              const r = await post("/api/account/newsletter", { on: next });
              setBusy("");
              if (!r.ok) setNews(!next);
              setMsg(r.ok ? { ok: true, text: nt.saved } : { ok: false, text: r.error ?? "Something went wrong." });
            }}
            className={`relative h-[31px] w-[51px] shrink-0 rounded-full transition-colors disabled:opacity-60 ${news ? "bg-[#34c759]" : "bg-[#e9e9eb]"}`}
          >
            <span className={`absolute left-[2px] top-[2px] h-[27px] w-[27px] rounded-full bg-white shadow transition-transform ${news ? "translate-x-[20px]" : ""}`} />
          </button>
        </div>
        {sub?.status === "past_due" && <p className="mt-2 rounded-2xl bg-amber-50 px-4 py-3 text-sm text-amber-800">Your last payment failed. Please update your card under “Card and invoices”.</p>}
      </div>

      <div className={card}>
        <h2 className="text-lg font-semibold">{sub ? "Change plan" : "Upgrade"}</h2>
        {!p.payOn ? (
          <p className="mt-2 text-sm text-mute">Paid plans open very soon.</p>
        ) : (
          <>
            <div className="mt-4 inline-flex rounded-full bg-canvas p-1 text-sm">
              {(["month", "year"] as Interval[]).map((i) => (
                <button key={i} onClick={() => setInterval(i)} data-testid={`profile-${i}`} className={`rounded-full px-4 py-1.5 ${interval === i ? "bg-white font-medium shadow-sm" : "text-mute"}`}>
                  {i === "month" ? "Monthly" : <>Yearly <span className="text-accent">−20%</span></>}
                </button>
              ))}
            </div>
            <div className="mt-4 grid gap-2">
              {plans.map((k) => (
                <label key={k} className={`flex cursor-pointer items-center justify-between gap-3 rounded-2xl border px-4 py-3 ${plan === k ? "border-accent bg-accent/5" : "border-line"}`}>
                  <span className="flex items-center gap-3">
                    <input type="radio" name="plan" checked={plan === k} onChange={() => setPlan(k)} data-testid={`profile-plan-${k}`} />
                    <span className="font-medium">{PLAN_NAMES[k]}</span>
                    {k === "pro" && <span className="text-xs text-mute">for professionals</span>}
                    {p.storedPlan === k && <span className="text-xs text-accent">current</span>}
                  </span>
                  <span className="text-sm">{euro(priceCents(k, interval))}<span className="text-mute">/{interval === "year" ? "year" : "month"}</span></span>
                </label>
              ))}
            </div>
            {!p.proApproved && <p className="mt-2 text-xs text-mute">Pro is for approved professionals. <Link href="/pro" className="text-accent">Request access</Link>.</p>}
            {sub ? (
              <>
                <button
                  disabled={Boolean(same) || busy !== ""}
                  data-testid="profile-change"
                  onClick={() => run("change", () => post("/api/billing/change", { plan, interval }), "Plan changed.")}
                  className="mt-4 w-full rounded-full bg-accent px-5 py-3 text-[15px] font-medium text-white disabled:opacity-50"
                >
                  {busy === "change" ? "Changing…" : same ? "This is your plan" : `${RANK[plan] >= RANK[p.storedPlan] ? "Switch" : "Downgrade"} to ${PLAN_NAMES[plan]} (${interval === "year" ? "yearly" : "monthly"})`}
                </button>
                <p className="mt-2 text-xs text-mute">The difference for the rest of the current period is worked out by Stripe and added to, or taken off, your next bill.</p>
              </>
            ) : (
              <PlanButton plan={plan} interval={interval} highlight label={`Get ${PLAN_NAMES[plan]}`} />
            )}
          </>
        )}
      </div>

      {sub && p.payOn && (
        <div className={card}>
          <h2 className="text-lg font-semibold">Subscription</h2>
          {sub.cancelAtEnd ? (
            <button data-testid="profile-resume" disabled={busy !== ""} onClick={() => run("resume", () => post("/api/billing/cancel", { resume: true }), "Your subscription continues.")} className="mt-4 w-full rounded-full bg-ink px-5 py-3 text-[15px] font-medium text-white disabled:opacity-50">
              {busy === "resume" ? "Saving…" : "Keep my subscription"}
            </button>
          ) : (
            <button
              data-testid="profile-cancel"
              disabled={busy !== ""}
              onClick={() => window.confirm("Cancel your subscription? You keep your plan until the end of the period already paid.") && run("cancel", () => post("/api/billing/cancel", {}), "Cancelled. You keep your plan until the end of the paid period.")}
              className="mt-4 w-full rounded-full bg-canvas px-5 py-3 text-[15px] font-medium text-ink disabled:opacity-50"
            >
              {busy === "cancel" ? "Cancelling…" : "Cancel subscription"}
            </button>
          )}
          {p.hasBilling && <div className="[&>div]:mt-3"><ManageButton label="Card and invoices" /></div>}
        </div>
      )}

      <div className={card}>
        <h2 className="text-lg font-semibold">Your data</h2>
        <p className="mt-1 text-sm text-mute">
          Your rights under the GDPR are explained in the <Link href="/privacy" className="text-accent">privacy policy</Link>.
        </p>
        {/* A file download from an API route, not a page: a plain link is right here. */}
        {/* eslint-disable-next-line @next/next/no-html-link-for-pages */}
        <a href="/api/account/export" data-testid="profile-export" className="mt-4 block w-full rounded-full bg-canvas px-5 py-3 text-center text-[15px] font-medium text-ink">
          Download my data
        </a>
        {!confirmErase ? (
          <button data-testid="profile-erase" onClick={() => setConfirmErase(true)} className="mt-3 w-full rounded-full bg-canvas px-5 py-3 text-[15px] font-medium text-ink">
            Delete my activity data
          </button>
        ) : (
          <div className="mt-3 rounded-2xl bg-canvas p-4 text-sm">
            <p>This deletes your usage statistics and search history. Your account and plan stay.</p>
            <div className="mt-3 flex gap-2">
              <button data-testid="profile-erase-confirm" disabled={busy !== ""} onClick={() => run("erase", () => post("/api/account/erase", { confirm: true }), "Your activity data has been deleted.", false).then(() => setConfirmErase(false))} className="rounded-full bg-ink px-4 py-2 font-medium text-white disabled:opacity-50">
                {busy === "erase" ? "Deleting…" : "Delete it"}
              </button>
              <button onClick={() => setConfirmErase(false)} className="rounded-full px-4 py-2 text-mute">Keep it</button>
            </div>
          </div>
        )}
        {!showDelete ? (
          <button data-testid="profile-delete" onClick={() => setShowDelete(true)} className="mt-3 w-full rounded-full px-5 py-3 text-[15px] font-medium text-red-600 ring-1 ring-red-200 hover:bg-red-50">
            Delete my account and all my data
          </button>
        ) : (
          <div className="mt-3 rounded-2xl bg-red-50 p-4 text-sm text-red-900" data-testid="delete-box">
            <p className="font-medium">This cannot be undone.</p>
            <p className="mt-1">
              Your account, plan, search history, usage statistics and any professional access request are deleted at once.
              {sub ? " Your subscription is cancelled now and you will not be charged again; no refund is made for the days left." : ""} We keep no copy. Invoices for past payments stay with our payment provider Stripe, because tax law requires them to be kept.
            </p>
            <p className="mt-3">Type <strong>DELETE</strong> to confirm:</p>
            <input value={deleteText} onChange={(e) => setDeleteText(e.target.value)} data-testid="delete-input" className="mt-2 w-full rounded-xl border border-red-200 bg-white px-3 py-2 text-ink" autoComplete="off" />
            <div className="mt-3 flex gap-2">
              <button
                data-testid="delete-confirm"
                disabled={deleteText !== "DELETE" || busy !== ""}
                onClick={async () => {
                  setBusy("delete");
                  const r = await post("/api/account/delete", { confirm: "DELETE" });
                  setBusy("");
                  if (r.ok) window.location.href = "/?confirmed=deleted";
                  else setMsg({ ok: false, text: r.error ?? "Something went wrong." });
                }}
                className="rounded-full bg-red-600 px-4 py-2 font-medium text-white disabled:opacity-50"
              >
                {busy === "delete" ? "Deleting…" : "Delete everything"}
              </button>
              <button onClick={() => { setShowDelete(false); setDeleteText(""); }} className="rounded-full px-4 py-2">Cancel</button>
            </div>
          </div>
        )}
      </div>

      {msg && <p className={`rounded-2xl px-4 py-3 text-sm ${msg.ok ? "bg-green-50 text-green-800" : "bg-red-50 text-red-700"}`} data-testid="profile-msg">{msg.text}</p>}

      <form method="post" action="/api/auth/logout">
        <button type="submit" data-testid="profile-signout" className="w-full rounded-full px-5 py-3 text-[15px] font-medium text-mute hover:text-ink">
          Sign out
        </button>
      </form>
    </div>
  );
}
