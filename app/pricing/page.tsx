import type { Metadata } from "next";

export const metadata: Metadata = { title: "Pricing · 10BONDS" };

const PLANS = [
  {
    name: "Free",
    price: "€0",
    period: "",
    tagline: "See how simple it is.",
    features: ["Two-slider search", "Top 3 bonds", "Issuer and yield"],
    cta: "Current plan",
    highlight: false,
  },
  {
    name: "Plus",
    price: "€9",
    period: "/month",
    tagline: "The full shortlist.",
    features: ["Full top 10 bonds", "ISIN codes", "Rating, duration, maturity, coupon", "Average shortlist figures"],
    cta: "Coming soon",
    highlight: true,
  },
  {
    name: "Premium",
    price: "€19",
    period: "/month",
    tagline: "Stay on top of changes.",
    features: ["Everything in Plus", "Alerts when the top 10 changes", "Saved searches", "Deeper risk figures", "Yield history"],
    cta: "Coming soon",
    highlight: false,
  },
];

export default function Pricing() {
  return (
    <div>
      <div className="mx-auto max-w-2xl text-center">
        <h1 className="text-[36px] font-semibold tracking-tight sm:text-[48px]">Simple plans</h1>
        <p className="mt-3 text-mute">Start free. Upgrade when you want the full list. Cancel anytime.</p>
      </div>
      <div className="mt-10 grid gap-5 md:grid-cols-3">
        {PLANS.map((p) => (
          <div
            key={p.name}
            className={`flex flex-col rounded-[28px] bg-white p-7 shadow-[0_2px_20px_rgba(0,0,0,0.04)] ${p.highlight ? "ring-2 ring-accent" : ""}`}
          >
            <h2 className="text-xl font-semibold">{p.name}</h2>
            <p className="mt-1 text-sm text-mute">{p.tagline}</p>
            <p className="mt-5">
              <span className="text-4xl font-semibold tracking-tight">{p.price}</span>
              <span className="text-mute">{p.period}</span>
            </p>
            <ul className="mt-6 flex-1 space-y-2.5 text-[15px]">
              {p.features.map((f) => (
                <li key={f} className="flex gap-2">
                  <span className="text-accent">✓</span>
                  {f}
                </li>
              ))}
            </ul>
            <button
              disabled
              className={`mt-7 rounded-full px-5 py-3 text-[15px] font-medium ${p.highlight ? "bg-accent text-white" : "bg-canvas text-ink"} disabled:cursor-default disabled:opacity-80`}
            >
              {p.cta}
            </button>
          </div>
        ))}
      </div>
      <p className="mx-auto mt-8 max-w-xl text-center text-xs text-mute">
        Prices include VAT where applicable. 10BONDS is an information service and does not give investment advice.
      </p>
    </div>
  );
}
